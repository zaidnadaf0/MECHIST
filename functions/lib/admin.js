"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAdminRole = exports.grantAdminRole = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
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
function requireTargetUid(data) {
    const uid = data?.uid;
    if (typeof uid !== 'string' || uid.trim().length === 0 || uid.length > 128) {
        throw new functions.https.HttpsError('invalid-argument', 'uid (1-128 chars) required');
    }
    return uid.trim();
}
function requireCallerAdmin(context) {
    if (!context.auth?.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
}
/**
 * Grant admin: sets `admin: true` claim AND syncs `users/{uid}.role = 'admin'`
 * (merge, so the profile hint matches the claim). Caller must be admin.
 */
exports.grantAdminRole = functions.https.onCall(async (data, context) => {
    requireCallerAdmin(context);
    const uid = requireTargetUid(data);
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    try {
        await admin
            .firestore()
            .collection('users')
            .doc(uid)
            .set({ role: 'admin', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    catch (err) {
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
exports.revokeAdminRole = functions.https.onCall(async (data, context) => {
    requireCallerAdmin(context);
    const uid = requireTargetUid(data);
    await admin.auth().setCustomUserClaims(uid, {});
    let roleHintSynced = false;
    try {
        const ref = admin.firestore().collection('users').doc(uid);
        const snap = await ref.get();
        if (snap.exists && snap.data()?.role === 'admin') {
            await ref.set({ role: 'customer', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            roleHintSynced = true;
        }
        else {
            roleHintSynced = true; // nothing admin-like to demote
        }
    }
    catch (err) {
        console.error(`[revokeAdminRole] ${uid}: claim cleared, role-hint sync failed`, err);
        return { success: true, uid, roleHintSynced: false };
    }
    console.log(`[revokeAdminRole] ${uid}: admin revoked by ${context.auth?.uid}`);
    return { success: true, uid, roleHintSynced };
});
//# sourceMappingURL=admin.js.map