import * as functions from 'firebase-functions';
export { grantAdminRole, revokeAdminRole } from './admin';
/**
 * Triggered when a request document is written.
 * Handles:
 *   - Auto-rematch when a mechanic declines (declinedBy array grows)
 *   - Auto-rematch when a mechanic releases (status back to requested, mechanicId cleared)
 *   - Initial dispatch on create (if no pickedMechanicId)
 */
export declare const onRequestWrite: functions.CloudFunction<functions.Change<functions.firestore.DocumentSnapshot>>;
export declare const scheduledOfferExpiry: functions.CloudFunction<unknown>;
/**
 * Scheduled function: runs every 5 minutes to clean up stale requested
 * offers that have no mechanic and no recent activity.
 * Marks them as cancelled after 30 minutes of no match.
 */
export declare const scheduledStaleRequestCleanup: functions.CloudFunction<unknown>;
/**
 * Callable function: manual trigger for admin to force rematch a specific request.
 */
export declare const forceRematch: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=index.d.ts.map