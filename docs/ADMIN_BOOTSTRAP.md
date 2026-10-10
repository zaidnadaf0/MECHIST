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
UID, writes the claim, **and synchronizes the `users/{uid}.role` UI hint**
(grant → `'admin'` merge; revoke → `'customer'` only when the hint reads
`'admin'`, otherwise untouched; `--no-sync` skips the Firestore write).

```bash
# 1. Download a service-account key from Firebase Console:
#    Project Settings → Service Accounts → "Generate new private key"
# 2. Save it OUTSIDE the repo (e.g. ~/.mechist/sa.json).
# 3. Run:
export GOOGLE_APPLICATION_CREDENTIALS=~/.mechist/sa.json
node scripts/setAdminClaim.mjs --uid <ADMIN_UID> --revoke=false
```

`--revoke=true` strips the claim for off-boarding (plus the hint demotion
above). `--dry-run` prints the plan without contacting Firebase.

The script writes a `last-claim.json` next to itself (gitignored) recording
the last successful claim flip for audit.

> **Never commit the service-account JSON.** It is the master key to your
> Firebase project. The repo's `.gitignore` already excludes
> `scripts/last-claim.json`; keep the SA key outside the repo entirely.

### Option C — Cloud Function callables (implemented, Phase 1C)

`functions/src/admin.ts` exposes two claim-admin-only callables:

- `grantAdminRole({ uid })` — requires caller `token.admin == true`; sets
  the target's `{ admin: true }` claim **and** merges
  `users/{uid}.role = 'admin'`.
- `revokeAdminRole({ uid })` — same caller gate; clears the target's claims
  entirely and demotes the hint to `'customer'` only when it reads `'admin'`.

No admin UI calls them yet — the `/admin/users` role dropdown still writes
`users.role` directly (which the Phase 1B rules intentionally deny for
`admin`; see the `forbidden-claim-required` toast). Wiring that dropdown to
these callables is a later admin-operations phase; do NOT loosen the rule
to make the dropdown work.

### Token refresh after any grant/revoke

Custom claims ride the Firebase ID token, which caches for ~1 hour:

1. Preferred (no sign-out): the app exposes `refreshAdminClaim()` on the
   auth context — it calls `user.getIdToken(true)` (force refresh) and
   re-resolves role + claim. Call it from an explicit user action or a
   permission-denied recovery path, never on a timer.
2. Fallback: sign the user out and back in (`AdminLogin` does a forced
   `getIdTokenResult(..., true)` read on every submit).
3. The script reminds the operator of this on every successful flip.
4. A revoked admin loses functional access at the next token refresh at
   the latest — Firestore rules re-evaluate `token.admin` per request.

### users/{uid}.role is a hint; token.admin is the authority

- Real admin ⟺ `token.admin == true` **and** (for routing) hint `== 'admin'`.
- The `/admin/*` routes additionally require the claim
  (`RequireAuth requireAdminClaim` in `src/App.tsx`), checked against the
  `isAdmin` value in the auth context (cached token read, refreshed
  explicitly). A doc-role admin without the claim is bounced to `/` and
  shown the "claim missing" guard on `/admin/login` — never the shell.
- Client code must NEVER treat the doc field as sufficient authority.

---

## Revoke

Same flow with `--revoke=true` (script) or `"customAttributes": "{}"` (REST).
Force-refresh the user's token after.

## Verify

After the claim is set and the token refreshed, they should be able to:

- Sign in via `/admin/login` — the page confirms **both**
  `token.admin === true` (authoritative) and `users/{uid}.role === 'admin'`
  (hint). Either missing → signed out with a precise message.
- Reach `/admin/*` — `RequireAuth requireAdminClaim` re-checks the claim
  from context; doc-only admins bounce to `/`.
- See non-empty data in `/admin`, `/admin/mechanics`, `/admin/requests`,
  `/admin/users`. If everything is still empty, the claim did not propagate
  to the ID token — refresh the token (or sign out and back in).

## What is *not* in scope here

- Minting a *new* admin from inside the running app (i.e. another admin
  granting the claim). That requires a backend (Option C) and is a
  Phase-7+ concern.
- Per-request audit logging of admin actions. Recommended for production
  but not a Phase-4 blocker.
- Removing the `users/{uid}.role === 'admin'` field as a UI hint. The
  AdminLogin page intentionally uses it as a fast pre-check; the rules
  are the security boundary. The field is documentation, not authority.
