#!/usr/bin/env node
/**
 * scripts/setAdminClaim.mjs
 *
 * Set or revoke the `admin` custom claim on a Firebase Auth user.
 *
 * Why this script exists
 * ----------------------
 * `firestore.rules` gates every admin write on `request.auth.token.admin == true`.
 * The `users/{uid}.role === 'admin'` doc field is only a UI hint — the canonical
 * authority is the custom claim, and the claim cannot be self-minted from the
 * client (no service-account key in the React app). This script is the
 * out-of-band bootstrap that the first admin uses once, after which a Cloud
 * Function can mint further claims.
 *
 * Usage
 * -----
 *   1. Generate a service-account JSON key from
 *      Firebase Console → Project Settings → Service Accounts → "Generate new private key".
 *   2. Save it OUTSIDE the repo (e.g. ~/.mechist/sa.json). NEVER commit it.
 *   3. Run:
 *        export GOOGLE_APPLICATION_CREDENTIALS=~/.mechist/sa.json
 *        node scripts/setAdminClaim.mjs --uid <ADMIN_UID> [--revoke]
 *
 * Flags
 * -----
 *   --uid <uid>     Target user UID (required).
 *   --revoke        Strip the claim instead of setting it.
 *   --dry-run       Print what would happen without contacting Firebase.
 *   --help          Show this help.
 *
 * Exit codes
 * ----------
 *   0  success
 *   2  missing/invalid args or env
 *   3  service-account key not found / not readable
 *   4  Firebase Admin SDK error
 *
 * Audit
 * -----
 * On a successful claim flip the script writes
 * `scripts/last-claim.json` (gitignored) with { uid, action, at, by }.
 * That file is the operator's local audit log; it is never committed.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIT_PATH = join(__dirname, 'last-claim.json');

// ---------- args ----------

function parseArgs(argv) {
  const out = { uid: null, revoke: false, dryRun: false, help: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--uid')    { out.uid   = argv[++i] ?? null; continue; }
    if (a === '--revoke') { out.revoke = true;             continue; }
    if (a === '--dry-run'){ out.dryRun = true;             continue; }
    if (a === '-h' || a === '--help') { out.help = true;   continue; }
    if (a.startsWith('--uid=')) { out.uid = a.slice('--uid='.length); continue; }
    throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

function printHelp() {
  const src = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const m = src.match(/\/\*\*([\s\S]*?)\*\//);
  process.stdout.write((m ? m[1] : '').replace(/^\s*\* ?/gm, '').trim() + '\n');
}

// ---------- env ----------

function loadServiceAccountPath() {
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!p) {
    process.stderr.write(
      'ERROR: GOOGLE_APPLICATION_CREDENTIALS is not set.\n' +
      'Generate a service-account key from the Firebase Console, save it OUTSIDE\n' +
      'the repo, then `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json`.\n'
    );
    process.exit(2);
  }
  const expanded = p.startsWith('~') ? join(os.homedir(), p.slice(1)) : p;
  if (!existsSync(expanded)) {
    process.stderr.write(`ERROR: service-account key not found at: ${expanded}\n`);
    process.exit(3);
  }
  return expanded;
}

// ---------- main ----------

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); return; }
  if (!args.uid) {
    process.stderr.write('ERROR: --uid <ADMIN_UID> is required. Use --help for usage.\n');
    process.exit(2);
  }

  // Lazy-import so the help path doesn't pay the firebase-admin load cost.
  let admin;
  try {
    admin = await import('firebase-admin');
  } catch (e) {
    process.stderr.write(
      'ERROR: `firebase-admin` is not installed. Run `npm install` to install devDependencies.\n' +
      `       Underlying error: ${(e && e.message) || e}\n`
    );
    process.exit(4);
  }

  const saPath = loadServiceAccountPath();

  if (args.dryRun) {
    process.stdout.write(JSON.stringify({
      dryRun: true,
      saPath,
      uid: args.uid,
      action: args.revoke ? 'revoke' : 'grant',
    }, null, 2) + '\n');
    return;
  }

  // Initialise the SDK with explicit credentials so we don't rely on
  // application-default credential discovery (which is fragile outside GCP).
  let app;
  try {
    const sa = JSON.parse(readFileSync(saPath, 'utf8'));
    if (!sa.project_id || !sa.client_email || !sa.private_key) {
      process.stderr.write('ERROR: service-account JSON is missing project_id/client_email/private_key.\n');
      process.exit(3);
    }
    app = admin.default.initializeApp({
      credential: admin.default.credential.cert(sa),
    });
  } catch (e) {
    process.stderr.write(`ERROR: could not initialise firebase-admin: ${(e && e.message) || e}\n`);
    process.exit(4);
  }

  const auth = app.auth();
  const newClaims = args.revoke ? {} : { admin: true };

  try {
    await auth.setCustomUserClaims(args.uid, newClaims);
  } catch (e) {
    process.stderr.write(`ERROR: setCustomUserClaims failed: ${(e && e.message) || e}\n`);
    process.exit(4);
  }

  // Local audit record. Gitignored — see .gitignore.
  const audit = {
    uid: args.uid,
    action: args.revoke ? 'revoke' : 'grant',
    at: new Date().toISOString(),
    by: os.userInfo().username,
  };
  try {
    writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2) + '\n', { mode: 0o600 });
  } catch (e) {
    process.stderr.write(`WARNING: claim was set but audit write failed: ${(e && e.message) || e}\n`);
  }

  process.stdout.write(
    `OK: ${audit.action}ed admin claim for uid=${audit.uid} at ${audit.at}\n` +
    `   (audit: ${AUDIT_PATH})\n` +
    `   Reminder: the user must sign out and back in to refresh their ID token.\n`
  );
}

main().catch((e) => {
  process.stderr.write(`FATAL: ${(e && e.stack) || e}\n`);
  process.exit(1);
});
