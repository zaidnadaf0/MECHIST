# Admin Bootstrap

## Why this exists

`firestore.rules` deliberately gates every admin write path on a **custom claim**,
not on a Firestore doc field. The chain is:

```
client (AdminDashboard)
  → firestore.rules: isClaimAdmin()  (request.auth.token.admin == true)
  → request allowed
```

A user's `users/{uid}.role === 'admin'` in Firestore is **only a hint**. The
canonical "is this person an admin?" check is the custom claim minted on their
Firebase Auth account.

This is intentional. Without it, a user could:

1. Create a regular customer account.
2. Edit their own `users/{uid}.role` via the Firestore SDK in DevTools.
3. Walk straight into `/admin`.

The custom claim cannot be self-minted (it requires a service-account key
that **must not** live in the React client) and the rules enforce
`request.resource.data.role in ['customer','mechanic']` on self-create, so a
user cannot self-promote to admin even if they try.

The trade-off is that the first admin must be seeded **out of band**. This
file is the runbook for that seed step.

---

## One-time setup (production)

### Option A — Firebase Console + REST (manual, no extra tooling)

1. Create the admin's Firebase Auth account the normal way (or ask them to
   sign up via the customer signup flow first).
2. Note the admin's **UID** (Firebase Console → Authentication → Users).
3. Open the [Google Cloud Shell](https://shell.cloud.google.com) with the
   project selected, then:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "Content-Type: application/json" \
     -d '{"localId":"<ADMIN_UID>","customAttributes":"{\"admin\":true}"}' \
     "https://identitytoolkit.googleapis.com/v1/projects/<PROJECT_ID>/accounts:update"
   ```
4. **Force-refresh the admin's ID token** so their next request carries the
   new claim. Have them sign out and back in.

### Option B — scripts/setAdminClaim.mjs (repeatable, CI-friendly)

This repo ships a Node script that takes a service-account JSON key and a
UID and writes the claim.

```bash
# 1. Download a service-account key from Firebase Console:
#    Project Settings → Service Accounts → "Generate new private key"
# 2. Save it OUTSIDE the repo (e.g. ~/.mechist/sa.json).
# 3. Run:
export GOOGLE_APPLICATION_CREDENTIALS=~/.mechist/sa.json
node scripts/setAdminClaim.mjs --uid <ADMIN_UID> --revoke=false
```

`--revoke=true` strips the claim for off-boarding.

The script writes a `last-claim.json` next to itself (gitignored) recording
the last successful claim flip for audit.

> **Never commit the service-account JSON.** It is the master key to your
> Firebase project. The repo's `.gitignore` already excludes
> `scripts/last-claim.json`; keep the SA key outside the repo entirely.

### Option C — Firebase Admin SDK in a Cloud Function (the right long-term answer)

For an environment with more than one admin or frequent role changes, write
a callable Cloud Function `setAdminClaim` that:

1. Verifies the caller is themselves an admin claim holder.
2. Sets the target user's `admin: true` custom claim.
3. Optionally writes `users/{uid}.role = 'admin'` for the UI hint.

Then expose a small admin-only panel in `/admin/users` that calls it. The
details are out of scope for the MVP (this file's goal is to unblock the
first admin so `/admin` is reachable); the script in Option B is the
interim bridge.

---

## Revoke

Same flow with `--revoke=true` (script) or `"customAttributes": "{}"` (REST).
Force-refresh the user's token after.

## Verify

After the claim is set and the user re-signs-in, they should be able to:

- Sign in via `/admin/login` — the page confirms `users/{uid}.role === 'admin'`
  *and* (defensively) the Firestore rules now permit the AdminDashboard reads.
- See non-empty data in `/admin`, `/admin/mechanics`, `/admin/requests`,
  `/admin/users`. If everything is still empty, the claim did not propagate
  to the ID token — have the user sign out and back in.

## What is *not* in scope here

- Minting a *new* admin from inside the running app (i.e. another admin
  granting the claim). That requires a backend (Option C) and is a
  Phase-7+ concern.
- Per-request audit logging of admin actions. Recommended for production
  but not a Phase-4 blocker.
- Removing the `users/{uid}.role === 'admin'` field as a UI hint. The
  AdminLogin page intentionally uses it as a fast pre-check; the rules
  are the security boundary. The field is documentation, not authority.
