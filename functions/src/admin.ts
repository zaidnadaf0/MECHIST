import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Admin claim management (Phase 1C).
 *
 * The Firestore custom claim `admin: true` is the ONLY authoritative admin
 * authority (`firestore.rules: isClaimAdmin()`). `users/{uid}.role` is a
 * synchronized UI hint. Both callables below require the CALLER to already
 * hold `token.admin == true`, so no user can self-promote or promote others.
 * The very first admin is bootstrapped out of band via
 * `scripts/setAdminClaim.mjs` (service-account key, never in the client).
 */

function requireTargetUid(data: unknown): string {
  const uid = (data as { uid?: unknown } | null)?.uid;
  if (typeof uid !== 'string' || uid.trim().length === 0 || uid.length > 128) {
    throw new functions.https.HttpsError('invalid-argument', 'uid (1-128 chars) required');
  }
  return uid.trim();
}

function requireCallerAdmin(context: functions.https.CallableContext): void {
  if (!context.auth?.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
}

/**
 * Grant admin: sets `admin: true` claim AND syncs `users/{uid}.role = 'admin'`
 * (merge, so the profile hint matches the claim). Caller must be admin.
 */
export const grantAdminRole = functions.https.onCall(async (data, context) => {
  requireCallerAdmin(context);
  const uid = requireTargetUid(data);

  await admin.auth().setCustomUserClaims(uid, { admin: true });
  try {
    await admin
      .firestore()
      .collection('users')
      .doc(uid)
      .set({ role: 'admin', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  } catch (err) {
    // The claim is the authority; a missing users doc must not roll it
    // back, but the caller must know the hint is unsynced.
    console.error(`[grantAdminRole] ${uid}: claim set, role-hint sync failed`, err);
    return { success: true, uid, roleHintSynced: false };
  }
  console.log(`[grantAdminRole] ${uid}: admin granted by ${context.auth?.uid}`);
  return { success: true, uid, roleHintSynced: true };
});

/**
 * Revoke admin: clears custom claims entirely AND demotes the UI hint away
 * from 'admin' (to 'customer', but only when it currently reads 'admin' —
 * otherwise the hint is left untouched and reported).
 */
export const revokeAdminRole = functions.https.onCall(async (data, context) => {
  requireCallerAdmin(context);
  const uid = requireTargetUid(data);

  await admin.auth().setCustomUserClaims(uid, {});
  let roleHintSynced = false;
  try {
    const ref = admin.firestore().collection('users').doc(uid);
    const snap = await ref.get();
    if (snap.exists && (snap.data() as { role?: unknown } | undefined)?.role === 'admin') {
      await ref.set(
        { role: 'customer', updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true },
      );
      roleHintSynced = true;
    } else {
      roleHintSynced = true; // nothing admin-like to demote
    }
  } catch (err) {
    console.error(`[revokeAdminRole] ${uid}: claim cleared, role-hint sync failed`, err);
    return { success: true, uid, roleHintSynced: false };
  }
  console.log(`[revokeAdminRole] ${uid}: admin revoked by ${context.auth?.uid}`);
  return { success: true, uid, roleHintSynced };
});
