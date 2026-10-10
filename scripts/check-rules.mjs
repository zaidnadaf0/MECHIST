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
 *  R016  notifications/{uid}/items/{id} is server-only create (P0-1B: allow create: if false),
 *        owner read, read-flag-bool update, owner delete
 *  R017  mechanics/{uid}/private/contact exists with owner+admin-only read/write
 *  R018  mechanics/{uid} create forbids phone/email in the public parent doc
 *  R019  requests/{id} customer branch bounds rating to 1-5 and comment to <=500 chars
 *  R020  requests/{id} accept requires isMechanicApproved() (P0-1B, no unapproved claim)
 *  R021  mechanics/{uid} self-update uses an explicit hasOnly allowlist (P0-1B)
 *  R022  mechanic-advance branch excludes rating/comment/ratedAt + freezes terminal states (P0-1B)
 *  R023  amountCents is bounded numeric, non-negative, capped, completed-only (P0-1B)
 *  R024  etaMin is bounded numeric in accept + advance branches (P0-1B)
 *  R025  declinedBy is append-only: list, membership, exact +1 growth, cap 50 (P0-1B)
 *  R026  release requires releasedAt timestamp + bounded reason + future offer window (P0-1B)
 *  R027  vehicles/{id} update freezes ownerId (P0-1B)
 *  R028  requests/{id} create uses hasOnly + vehicle ownership + mechanicId null (P0-1B)
 *  R029  customer branch enforces safe transitions + cancelledBy customer + reason cap (P0-1B)
 *  R030  users/{uid} update freezes role (no self-promotion, Phase 1C)
 *  R031  isClaimAdmin() gates admin paths across collections (Phase 1C)
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

// R016 — notifications/{uid}/items/{id}: server-only create (P0-1B).
// Client SDKs must NOT write to any inbox; Admin SDK producers bypass
// rules, so `allow create: if false` breaks nothing server-side.
{
  const block = matchBlock('notifications/{uid}/items/{id}');
  if (!block) {
    record('R016', 'notifications/{uid}/items/{id} server-only inbox (create denied, owner read/update/delete)',
      false, 'match /notifications/{uid}/items/{id} block missing');
  } else {
    const createDenied = /allow\s+create:\s*if\s*false\s*;/.test(block);
    const hasRead = /allow\s+read:\s*if[\s\S]*request\.auth\.uid\s*==\s*uid/.test(block);
    const hasUpdate = /allow\s+update:\s*if[\s\S]*hasOnly\(\[.*read/.test(block)
      && /request\.resource\.data\.read\s+is\s+bool/.test(block);
    const pass = createDenied && hasRead && hasUpdate;
    record('R016', 'notifications/{uid}/items/{id} server-only inbox (create denied, owner read, read-bool update)',
      pass,
      `createDenied=${createDenied} read=${hasRead} update(read-bool)=${hasUpdate}`);
  }
}
// R017 — mechanics/{uid}/private/contact is owner + admin only (Issue 2)
// (Nested header in the rules file is `match /private/contact`.)
{
  const block = matchBlock('private/contact');
  if (!block) {
    record('R017', 'mechanics/{uid}/private/contact exists with owner+admin-only read/write',
      false, 'match /mechanics/{uid}/private/contact block missing');
  } else {
    const noPublic = !/allow\s+read:\s*if\s*true/.test(block);
    const ownerRead = /allow\s+read:\s*if[\s\S]*isSelf\(uid\)/.test(block);
    const adminRead = /allow\s+read:\s*if[\s\S]*isClaimAdmin\(\)/.test(block);
    const ownerWrite = /allow\s+create,\s*update:\s*if[\s\S]*isSelf\(uid\)/.test(block);
    const pass = noPublic && ownerRead && adminRead && ownerWrite;
    record('R017', 'mechanics/{uid}/private/contact exists with owner+admin-only read/write',
      pass,
      `noPublic=${noPublic} ownerRead=${ownerRead} adminRead=${adminRead} ownerWrite=${ownerWrite}`);
  }
}

// R018 — mechanics/{uid} parent rejects contact fields on client create (Issue 2)
{
  const block = matchBlock('mechanics/{uid}');
  const start = block ? block.indexOf('allow create:') : -1;
  const end = block ? block.indexOf('allow update:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const noPhone = /!\(\s*['"]phone['"]\s+in\s+request\.resource\.data\s*\)/.test(body);
  const noEmail = /!\(\s*['"]email['"]\s+in\s+request\.resource\.data\s*\)/.test(body);
  record('R018', "mechanics/{uid} create forbids phone/email in the public parent doc",
    noPhone && noEmail,
    `noPhone=${noPhone} noEmail=${noEmail}`);
}

// R019 - customer rating/comment shape guard (Batch 6: rating is 1-5, comment bounded)
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const ratingBounded = /request\.resource\.data\.rating\s*>=\s*1[\s\S]*?request\.resource\.data\.rating\s*<=\s*5/.test(body);
  const commentBounded = /request\.resource\.data\.comment\.size\(\)\s*<=\s*500/.test(body);
  record('R019', "requests/{id} customer branch bounds rating 1-5 and comment <= 500 chars",
    ratingBounded && commentBounded,
    `rating=${ratingBounded} comment=${commentBounded}`);
}

// R020 — accept requires isMechanicApproved() (P0-1B)
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const acceptStart = body.indexOf("request.resource.data.status == 'accepted'");
  const acceptBody = acceptStart >= 0 ? body.slice(acceptStart) : '';
  const pass = /isMechanicApproved\(\)/.test(acceptBody);
  record('R020', 'requests/{id} accept branch requires isMechanicApproved()',
    pass,
    pass ? null : 'accept branch does not require isMechanicApproved()');
}

// R021 — mechanic self-update uses an explicit hasOnly allowlist (P0-1B)
{
  const block = matchBlock('mechanics/{uid}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const pass = /hasOnly\(\[\s*['"]isAvailable['"]\s*,\s*['"]currentLat['"]\s*,\s*['"]currentLng['"]\s*,\s*['"]locationUpdatedAt['"]\s*,\s*['"]updatedAt['"]\s*\]\)/.test(body);
  record('R021', 'mechanics/{uid} self-update hasOnly allowlist {isAvailable,currentLat,currentLng,locationUpdatedAt,updatedAt}',
    pass,
    pass ? null : 'self-update allowlist shape differs');
}

// R022 — mechanic-advance excludes rating/comment/ratedAt + freezes terminal states (P0-1B)
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const advStart = body.indexOf('Mechanic advances an already-assigned job');
  const advBody = advStart >= 0 ? body.slice(advStart, advStart + 5000) : '';
  const allowlists = [...advBody.matchAll(/hasOnly\(\[([^\]]*)\]\)/g)].map((m) => m[1]);
  const noRating = allowlists.length > 0 && allowlists.every((k) => !/['"]rating['"]/.test(k) && !/['"]comment['"]/.test(k) && !/['"]ratedAt['"]/.test(k));
  const terminalFreeze = /!\(resource\.data\.status\s+in\s+\[\s*'completed'\s*,\s*'cancelled'\s*\]\)/.test(advBody);
  record('R022', 'mechanic-advance excludes rating/comment/ratedAt and freezes completed/cancelled',
    noRating && terminalFreeze,
    `noRatingKeys=${noRating} terminalFreeze=${terminalFreeze}`);
}

// R023 — amountCents bounded numeric, non-negative, capped, completed-only (P0-1B)
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const numBounded = /request\.resource\.data\.amountCents\s+is\s+number[\s\S]*?request\.resource\.data\.amountCents\s*>=\s*0[\s\S]*?request\.resource\.data\.amountCents\s*<=\s*1000000/.test(body);
  const completedOnly = /amountCents[\s\S]*?request\.resource\.data\.status\s*==\s*'completed'/.test(body);
  record('R023', 'amountCents is number 0..1000000 and completed-only',
    numBounded && completedOnly,
    `bounded=${numBounded} completedOnly=${completedOnly}`);
}

// R024 — etaMin bounded numeric in accept + advance (P0-1B)
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const bounded = /request\.resource\.data\.etaMin\s+is\s+number[\s\S]*?request\.resource\.data\.etaMin\s*>=\s*1[\s\S]*?request\.resource\.data\.etaMin\s*<=\s*180/.test(body);
  record('R024', 'etaMin is number 1..180 where accepted',
    bounded,
    bounded ? null : 'no etaMin 1..180 numeric guard');
}

// R025 — declinedBy append-only: list, membership, exact +1 growth, cap 50 (P0-1B)
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const isList = /request\.resource\.data\.declinedBy\s+is\s+list/.test(body);
  const member = /request\.auth\.uid\s+in\s+request\.resource\.data\.declinedBy/.test(body);
  const growth = /request\.resource\.data\.declinedBy\.size\(\)\s*==\s*resource\.data\.declinedBy\.size\(\)\s*\+\s*1/.test(body);
  const cap = /request\.resource\.data\.declinedBy\.size\(\)\s*<=\s*50/.test(body);
  const pass = isList && member && growth && cap;
  record('R025', 'declinedBy append-only (list + membership + exact +1 growth + cap 50)',
    pass,
    `list=${isList} member=${member} growth=${growth} cap=${cap}`);
}

// R026 — release: releasedAt timestamp + bounded reason + future window (P0-1B)
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const tsType = /request\.resource\.data\.releasedAt\s+is\s+timestamp/.test(body);
  const reasonCap = /request\.resource\.data\.releaseReason\.size\(\)\s*<=\s*500/.test(body);
  const futureWin = /request\.time\s*<\s*request\.resource\.data\.offerExpiresAt/.test(body);
  record('R026', 'release requires releasedAt timestamp + reason <=500 + future offer window',
    tsType && reasonCap && futureWin,
    `timestamp=${tsType} reasonCap=${reasonCap} futureWin=${futureWin}`);
}

// R027 — vehicles update freezes ownerId (P0-1B)
{
  const block = matchBlock('vehicles/{id}');
  const pass = /request\.resource\.data\.ownerId\s*==\s*resource\.data\.ownerId/.test(block || '');
  record('R027', 'vehicles/{id} update freezes ownerId',
    pass,
    pass ? null : 'no ownerId freeze in vehicles update');
}

// R028 — request create allowlist + vehicle ownership + mechanicId null (P0-1B)
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow create:') : -1;
  const end = block ? block.indexOf('allow update:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const allowlist = /request\.resource\.data\.keys\(\)\.hasOnly\(\[/.test(body);
  const ownership = /vehicles\/\$\(request\.resource\.data\.vehicleId\)\)\.data\.ownerId\s*==\s*request\.auth\.uid/.test(body);
  const mechNull = /request\.resource\.data\.mechanicId\s*==\s*null/.test(body);
  const noAmount = !/amountCents/.test(body);
  const pass = allowlist && ownership && mechNull && noAmount;
  record('R028', 'request create hasOnly allowlist + vehicle ownership + mechanicId null + no amountCents',
    pass,
    `allowlist=${allowlist} ownership=${ownership} mechNull=${mechNull} noAmount=${noAmount}`);
}

// R030 — users/{uid} update freezes role (Phase 1C: no self-promotion)
{
  const block = matchBlock('users/{uid}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const pass = /request\.resource\.data\.role\s*==\s*resource\.data\.role/.test(body);
  record('R030', "users/{uid} update requires role unchanged (no self-promotion)",
    pass,
    pass ? null : 'no role-freeze in users/{uid} update');
}

// R031 — isClaimAdmin() gates admin paths across collections (Phase 1C)
{
  const uses = (src.match(/isClaimAdmin\(\)/g) || []).length;
  // users read/update/delete, vehicles read, requests read/update/delete,
  // mechanics update/delete/contact — at minimum 8 allow-sites.
  const pass = uses >= 8;
  record('R031', 'isClaimAdmin() gates admin paths (>=8 allow-sites)',
    pass,
    `isClaimAdmin() used ${uses}x, need >=8`);
}
// R029 — customer safe transitions + cancelledBy customer + reason cap (P0-1B)
{
  const block = matchBlock('requests/{id}');
  const start = block ? block.indexOf('allow update:') : -1;
  const end = block ? block.indexOf('allow delete:', start) : -1;
  const body = (start >= 0 && end > start) ? block.slice(start, end) : '';
  const liveCancel = /resource\.data\.status\s+in\s+\[\s*'requested'\s*,\s*'accepted'\s*,\s*'on-the-way'\s*,\s*'arrived'\s*\]/.test(body);
  const rateOnly = /request\.resource\.data\.status\s*==\s*resource\.data\.status[\s\S]*?resource\.data\.status\s*==\s*'completed'/.test(body);
  const byCustomer = /request\.resource\.data\.cancelledBy\s*==\s*'customer'/.test(body);
  const reasonCap = /request\.resource\.data\.cancellationReason\.size\(\)\s*<=\s*500/.test(body);
  const pass = liveCancel && rateOnly && byCustomer && reasonCap;
  record('R029', 'customer cancel-from-live + rate-only-on-completed + cancelledBy customer + reason cap',
    pass,
    `liveCancel=${liveCancel} rateOnly=${rateOnly} byCustomer=${byCustomer} reasonCap=${reasonCap}`);
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
