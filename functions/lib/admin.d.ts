import * as functions from 'firebase-functions';
/**
 * Grant admin: sets `admin: true` claim AND syncs `users/{uid}.role = 'admin'`
 * (merge, so the profile hint matches the claim). Caller must be admin.
 */
export declare const grantAdminRole: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Revoke admin: clears custom claims entirely AND demotes the UI hint away
 * from 'admin' (to 'customer', but only when it currently reads 'admin' —
 * otherwise the hint is left untouched and reported).
 */
export declare const revokeAdminRole: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=admin.d.ts.map