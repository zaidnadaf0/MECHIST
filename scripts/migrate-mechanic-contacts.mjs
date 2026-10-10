#!/usr/bin/env node
/**
 * scripts/migrate-mechanic-contacts.mjs — Issue 2 backfill.
 *
 * Moves `phone` / `email` off the publicly-readable `mechanics/{uid}`
 * parent doc into the owner+admin-only `mechanics/{uid}/private/contact`
 * subcollection, then strips the fields from the parent.
 *
 * Contact with the backend:
 *   - Emulator:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrate-mechanic-contacts.mjs
 *   - Prod:      GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/migrate-mechanic-contacts.mjs --project <id> --apply
 *
 * Dry-run by default (lists what WOULD move). Pass --apply to write.
 * Idempotent: docs already migrated (no phone/email on parent) are skipped.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const projectIdx = process.argv.indexOf('--project');
const projectId =
  projectIdx >= 0 && process.argv[projectIdx + 1]
    ? process.argv[projectIdx + 1]
    : process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'demo-mechist';

const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

initializeApp({ projectId });
const db = getFirestore();
const DELETE = FieldValue.delete();

const snap = await db.collection('mechanics').get();
let moved = 0;
let skipped = 0;

for (const doc of snap.docs) {
  const data = doc.data() ?? {};
  const hasPhone = typeof data.phone === 'string' || data.phone === null;
  const hasEmail = typeof data.email === 'string' || data.email === null;
  const hasContactFields = 'phone' in data || 'email' in data;
  if (!hasContactFields) {
    skipped++;
    continue;
  }
  const contact = {
    phone: typeof data.phone === 'string' ? data.phone : null,
    email: typeof data.email === 'string' ? data.email : null,
    updatedAt: FieldValue.serverTimestamp(),
    migratedFromParent: true,
  };
  if (!APPLY) {
    process.stdout.write(`WOULD MOVE  mechanics/${doc.id} phone=${JSON.stringify(data.phone ?? null)} email=${JSON.stringify(data.email ?? null)}\n`);
    moved++;
    continue;
  }
  const batch = db.batch();
  batch.set(doc.ref.collection('private').doc('contact'), contact, { merge: true });
  batch.update(doc.ref, { phone: DELETE, email: DELETE });
  await batch.commit();
  process.stdout.write(`MOVED  mechanics/${doc.id}\n`);
  moved++;
}

process.stdout.write(
  `\n${APPLY ? 'Migrated' : 'Would migrate'} ${moved} doc(s), skipped ${skipped} already-clean doc(s) ` +
  `(${usingEmulator ? 'emulator' : `project ${projectId}`}, ${APPLY ? 'APPLIED' : 'dry-run — pass --apply to write'}).\n`,
);
process.exit(0);
