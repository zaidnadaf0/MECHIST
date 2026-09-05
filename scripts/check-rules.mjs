#!/usr/bin/env node
/**
 * scripts/check-rules.mjs
 *
 * Static linter for `firestore.rules`. Java-free, no firebase-tools required.
 *
 * Why this exists
 * ---------------
 * The Firestore emulator-based linter (`firebase emulators:exec --only firestore`)
 * needs the JVM. This machine doesn't have one. The cached `firebase-tools`
 * builds in `~/.npm/_npx` no longer expose `lib/rules/rulesets` either, so the
 * offline `Ruleset` parser is no longer reachable.
 *
 * This script is the substitute: a small set of targeted checks against the
 * rules text that catch the specific Phase 9 invariants we care about. It is
 * NOT a full grammar parse â€” it only looks for the lines/blocks we want to
 * be present.
 *
 * Exit codes: 0 if all checks pass, 1 if any fail. Failing checks print
 * `FAIL:` lines so CI/log scrapers can grep for them.
 *
 * Usage
 * -----
 *   node scripts/check-rules.mjs                 # lints firestore.rules in repo root
 *   node scripts/check-rules.mjs path/to/rules   # lints an arbitrary file
 *
 * Checks
 * ------
 *  R001  isClaimAdmin() helper checks request.auth.token.admin == true
 *  R002  users/{uid} create rule restricts role to ['customer','mechanic']
 *  R003  users/{uid} update rule forbids mutating 'approved'
 *  R004  requests/{id} read allows customer + mechanic-queue + admin
 *  R005  requests/{id} create requires status == 'requested'
 *  R006  requests/{id} update has the customer-cancel/rate branch AND its
 *        hasOnly([...]) permits cancelledAt / cancelledBy / cancellationReason
 *  R007  mechanic-advance branch freezes mechanicId/mechanicName
 *  R008  requests/{id} update has the FIRST-ASSIGNMENT branch
 *  R009  FIRST-ASSIGNMENT branch enforces request.time < offerExpiresAt
 *  R010  FIRST-ASSIGNMENT branch restricts affected keys to
 *        {status, mechanicId, mechanicName, etaMin, updatedAt}
 *  R011  mechanics/{uid} create forces approved == false
 *  R012  mechanics/{uid} self-update forbids rating/reviewCount mutation
 *  R013  catch-all {document=**} denies everything
 *  R014  requests/{id} create validates problemText >=5 and finite customerLat/Lng
 *  R015  storage.rules owner-only + image MIME + 8MB guard + firebase.json wiring
 *  R016  notifications/{uid}/items/{id} owner-scoped inbox (Batch 2 row 6)
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const argPath = process.argv[2];
const filePath = argPath
  ? resolve(argPath)
  : join(__dirname, '..', 'firestore.rules');

if (!existsSync(filePath)) {
  process.stderr.write(`ERROR: rules file not found: ${filePath}\n`);
  process.exit(2);
}

const src = readFileSync(filePath, 'utf8');

function matchBlock(pathPattern) {
  // The block header in this repo is `match /<pattern> {` â€” note there is
  // NO closing slash between the path and the block-opening brace, even
  // for the top-level `match /databases/{database}/documents {`. We use a
  // regex anchored on the path itself plus the literal trailing ` {`.
  // We escape every regex metachar so callers can pass patterns like
  // `{document=**}` without thinking about it.
  const escaped = pathPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`match\\s+/${escaped}\\s*\\{`);
  const m = re.exec(src);
  if (!m) return null;
  const open = src.indexOf('{', m.index + m[0].length - 1);
  if (open < 0) return null;
  let depth = 1;
  let i = open + 1;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return src.slice(open, i);
}

function hasHelper(name) {
  return new RegExp(`function\\s+${name}\\s*\\(`).test(src);
}

function helperBody(name) {
  const re = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'm');
  const m = src.match(re);
  return m ? m[1] : null;
}

const results = [];
function record(id, label, pass, detail) {
  results.push({ id, label, pass, detail });
}

// R001
{
  const exists = hasHelper('isClaimAdmin');
  const body = helperBody('isClaimAdmin');
  const shaped = body != null && /request\.auth\.token\.admin\s*==\s*true/.test(body);
  record('R001', 'isClaimAdmin() helper checks request.auth.token.admin == true',
    exists && shaped,
    exists ? (shaped ? null : 'isClaimAdmin exists but does not check request.auth.token.admin == true') : 'isClaimAdmin() not defined');
}

// R002
{
  const block = matchBlock('users/{uid}');
  const start = block ? block.indexOf('allow create:') : -1;
  const end = block ? block.indexOf('allow update:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const pass = /request\.resource\.data\.role\s+in\s+\[\s*['"]customer['"]\s*,\s*['"]mechanic['"]\s*\]/.test(body);
  record('R002', "users/{uid} create rule restricts role to ['customer','mechanic']",
    pass,
    pass ? null : 'create rule does not whitelist customer+mechanic only');
}

// R003
{
  const block = matchBlock('users/{uid}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const pass = /!.*['"]approved['"]/.test(body) && /affectedKeys/.test(body);
  record('R003', "users/{uid} update rule forbids mutating 'approved'",
    pass,
    pass ? null : 'no "approved" guard in users/{uid} update rule');
}

// R004
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow read:') : -1;
  const end = block ? block.indexOf('allow create:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const hasCustomer = /customerId\s*==\s*request\.auth\.uid/.test(body);
  const hasMechanicQueue = /status\s*==\s*'requested'\s*&&\s*isMechanicApproved/.test(body);
  const hasAdmin = /isClaimAdmin\(\)/.test(body);
  record('R004', 'requests/{id} read allows customer + mechanic-queue + admin',
    hasCustomer && hasMechanicQueue && hasAdmin,
    `customer=${hasCustomer} mechanicQueue=${hasMechanicQueue} admin=${hasAdmin}`);
}

// R005
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow create:') : -1;
  const end = block ? block.indexOf('allow update:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const pass = /request\.resource\.data\.status\s*==\s*'requested'/.test(body);
  record('R005', "requests/{id} create requires status == 'requested'",
    pass,
    pass ? null : 'create rule does not require status == requested');
}

// R006
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const hasBranch = /resource\.data\.customerId\s*==\s*request\.auth\.uid[\s\S]*?isCustomer\(\)/.test(body)
    && /status\s+in\s+\[\s*'cancelled'\s*,\s*'completed'\s*\]/.test(body);
  // The customer branch's hasOnly([...]) must permit the audit fields that
  // src/lib/customer.ts `cancelRequest` writes; otherwise every customer
  // cancel is permission-denied. We isolate the FIRST hasOnly after the
  // customerId guard -- that is the customer branch (the mechanic and
  // first-assignment branches come after it).
  const CANCEL_FIELDS = ['cancelledAt', 'cancelledBy', 'cancellationReason'];
  const custHasOnly = /resource\.data\.customerId\s*==\s*request\.auth\.uid[\s\S]*?hasOnly\(\[([^\]]*)\]\)/.exec(body);
  const allowed = custHasOnly
    ? custHasOnly[1].split(',').map((k) => k.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
    : [];
  const missing = CANCEL_FIELDS.filter((k) => !allowed.includes(k));
  const pass = hasBranch && missing.length === 0;
  record('R006', 'requests/{id} update has the customer-cancel/rate branch and permits cancelledAt/cancelledBy/cancellationReason',
    pass,
    !hasBranch
      ? 'customer-cancel/rate branch missing or malformed'
      : (missing.length ? `customer hasOnly([...]) is missing: ${missing.join(', ')}` : null));
}

// R007
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const frozenId = /request\.resource\.data\.mechanicId\s*==\s*resource\.data\.mechanicId/.test(body);
  const frozenName = /request\.resource\.data\.mechanicName\s*==\s*resource\.data\.mechanicName/.test(body);
  record('R007', 'mechanic-advance branch freezes mechanicId/mechanicName',
    frozenId && frozenName,
    `frozenId=${frozenId} frozenName=${frozenName}`);
}

// R008
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const pass = /resource\.data\.status\s*==\s*'requested'\s*&&[\s\S]*?request\.resource\.data\.status\s*==\s*'accepted'/.test(body)
    && /resource\.data\.mechanicId\s*==\s*null\s*\|\|\s*resource\.data\.mechanicId\s*==\s*''/.test(body)
    && /request\.resource\.data\.mechanicId\s*==\s*request\.auth\.uid/.test(body);
  record('R008', 'requests/{id} update has the first-assignment branch',
    pass,
    pass ? null : 'first-assignment branch missing or malformed');
}

// R009
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const pass = /request\.time\s*<\s*request\.resource\.data\.offerExpiresAt/.test(body);
  record('R009', 'first-assignment branch enforces request.time < offerExpiresAt',
    pass,
    pass ? null : 'no offerExpiry time check in first-assignment branch');
}

// R010
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const pass = /hasOnly\(\[\s*['"]status['"]\s*,\s*['"]mechanicId['"]\s*,\s*['"]mechanicName['"]\s*,\s*['"]etaMin['"]\s*,\s*['"]updatedAt['"]\s*\]\)/.test(body);
  record('R010', 'first-assignment affected keys = {status, mechanicId, mechanicName, etaMin, updatedAt}',
    pass,
    pass ? null : 'hasOnly([...5 keys...]) shape differs');
}

// R011
{
  const block = matchBlock('mechanics/{uid}');
  const start = block ? block.indexOf('allow create:') : -1;
  const end = block ? block.indexOf('allow update:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const pass = /request\.resource\.data\.approved\s*==\s*false/.test(body);
  record('R011', "mechanics/{uid} create forces approved == false",
    pass,
    pass ? null : 'no approved==false guard in mechanics/{uid} create');
}

// R012
{
  const block = matchBlock('mechanics/{uid}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const pass = /!.*['"]rating['"]/.test(body) && /!.*['"]reviewCount['"]/.test(body) && /affectedKeys/.test(body);
  record('R012', "mechanics/{uid} self-update forbids rating/reviewCount mutation",
    pass,
    pass ? null : 'rating or reviewCount guard missing in mechanics self-update');
}

// R013
{
  const block = matchBlock('{document=**}');
  const pass = !!block && /allow\s+read,\s*write:\s*if\s*false/.test(block);
  record('R013', 'catch-all {document=**} denies everything',
    pass,
    pass ? null : 'catch-all deny missing');
}

// R014
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow create:') : -1;
  const end = block ? block.indexOf('allow update:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const hasText = /request\.resource\.data\.problemText\s+is\s+string/.test(body) && /problemText.*size\(\)\s*>=\s*5/.test(body);
  const hasLatLng = /request\.resource\.data\.customerLat\s+is\s+number/.test(body) && /request\.resource\.data\.customerLng\s+is\s+number/.test(body);
  record('R014', "requests/{id} create validates problemText >=5 and finite customerLat/Lng",
    hasText && hasLatLng,
    `problemText=${hasText} customerLatLng=${hasLatLng}`);
}

// R015
{
  const hasStorageKey = (() => {
    try {
      // firebase.json may have been written with a BOM on Windows — strip it before parse
      const raw = readFileSync(join(__dirname, '..', 'firebase.json'), 'utf8').replace(/^﻿/, '');
      const fj = JSON.parse(raw);
      return Boolean(fj.storage && fj.storage.rules);
    } catch { return false; }
  })();
  let storageOk = false;
  let storageDetail = '';
  try {
    const sr2 = readFileSync(join(__dirname, '..', 'storage.rules'), 'utf8');
    const hasOwner = /isOwner\(uid\)/.test(sr2) && /request\.auth\.uid\s*==\s*uid/.test(sr2);
    const hasImage = /isSafeImage\(\)/.test(sr2) && /image\/\.\*/.test(sr2) && /8\s*\*\s*1024\s*\*\s*1024/.test(sr2);
    const hasCatchAll = /match\s+\/\{allPaths=\*\*\}[\s\S]*?allow\s+read,\s*write:\s*if\s*false/.test(sr2);
    storageOk = hasOwner && hasImage && hasCatchAll;
    storageDetail = `owner=${hasOwner} image=${hasImage} catchAll=${hasCatchAll}`;
  } catch (e) {
    storageDetail = `storage.rules not found: ${e.message ?? String(e)}`;
  }
  record('R015', 'storage.rules exists with owner-only + image MIME + 8MB guard and catch-all deny',
    hasStorageKey && storageOk,
    hasStorageKey ? (storageOk ? null : storageDetail) : 'no storage key in firebase.json');
}

// R016 — notifications/{uid}/items/{id} owner-only inbox (Batch 2 row 6)
{
  const block = matchBlock('notifications/{uid}/items/{id}');
  if (!block) {
    record('R016', 'notifications/{uid}/items/{id} owner-scoped inbox exists with read/create/update/delete',
      false, 'match /notifications/{uid}/items/{id} block missing');
  } else {
    const hasRead = /allow\s+read:\s*if[\s\S]*request\.auth\.uid\s*==\s*uid/.test(block);
    const hasCreate = /allow\s+create:\s*if[\s\S]*title\s+is\s+string/.test(block) && /title\.size\(\)/.test(block) && /createdAt\s+is\s+number/.test(block);
    const hasUpdate = /allow\s+update:\s*if[\s\S]*hasOnly\(\[.*read/.test(block);
    record('R016', 'notifications/{uid}/items/{id} owner-scoped inbox exists with read/create/update/delete',
      hasRead && hasCreate && hasUpdate,
      `read=${hasRead} create(bounded title+createdAt)=${hasCreate} update(read-only)=${hasUpdate}`);
  }
}
let failed = 0;
for (const r of results) {
  const tag = r.pass ? 'OK  ' : 'FAIL';
  if (!r.pass) failed++;
  process.stdout.write(`${tag}  ${r.id}  ${r.label}`);
  if (!r.pass && r.detail) process.stdout.write(`  -- ${r.detail}`);
  process.stdout.write('\n');
}

process.stdout.write(`\n${results.length - failed}/${results.length} checks passed.\n`);
process.exit(failed === 0 ? 0 : 1);
