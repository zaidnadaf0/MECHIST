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
exports.forceRematch = exports.scheduledStaleRequestCleanup = exports.scheduledOfferExpiry = exports.onRequestWrite = exports.revokeAdminRole = exports.grantAdminRole = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const matching_1 = require("./matching");
admin.initializeApp();
const db = admin.firestore();
var admin_1 = require("./admin");
Object.defineProperty(exports, "grantAdminRole", { enumerable: true, get: function () { return admin_1.grantAdminRole; } });
Object.defineProperty(exports, "revokeAdminRole", { enumerable: true, get: function () { return admin_1.revokeAdminRole; } });
/**
 * Triggered when a request document is written.
 * Handles:
 *   - Auto-rematch when a mechanic declines (declinedBy array grows)
 *   - Auto-rematch when a mechanic releases (status back to requested, mechanicId cleared)
 *   - Initial dispatch on create (if no pickedMechanicId)
 */
exports.onRequestWrite = functions.firestore
    .document('requests/{requestId}')
    .onWrite(async (change, context) => {
    const requestId = context.params.requestId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    if (!after) {
        console.log(`[onRequestWrite] ${requestId}: Document deleted`);
        return;
    }
    if (!before) {
        console.log(`[onRequestWrite] ${requestId}: Document created`);
        await handleNewRequest(requestId, after);
        return;
    }
    // Server-side rating aggregation: fold a new/changed customer rating
    // into mechanics/{mechanicId} {rating, reviewCount}. Clients are
    // forbidden by rules from writing those fields themselves.
    await maybeAggregateRating(requestId, before, after);
    // Server-side contact denormalization: copy the assigned mechanic's
    // phone onto the request so the customer can call without reading
    // the mechanics collection (which is public minus contact fields).
    await maybeAttachMechanicPhone(requestId, before, after);
    // Server-side notification producers: customer + mechanic inbox items
    // for assignment, progress, cancellation and reassignment. Writes use
    // deterministic IDs and existence-checks so retries never duplicate.
    await maybeNotifyTransition(requestId, before, after);
    const statusChanged = before.status !== after.status;
    const mechanicCleared = before.mechanicId && !after.mechanicId;
    const declinedByGrew = after.status === 'requested' &&
        !after.mechanicId &&
        (after.declinedBy?.length ?? 0) > (before.declinedBy?.length ?? 0);
    if ((statusChanged && after.status === 'requested' && mechanicCleared) || declinedByGrew) {
        console.log(`[onRequestWrite] ${requestId}: Rematch triggered`, {
            statusChanged,
            mechanicCleared,
            declinedByGrew,
            beforeStatus: before.status,
            afterStatus: after.status,
            beforeDeclinedCount: before.declinedBy?.length ?? 0,
            afterDeclinedCount: after.declinedBy?.length ?? 0,
        });
        await handleRematch(requestId, after);
    }
});
/** Core assignment: picks best available mechanic and writes transactionally. */
async function assignTopCandidate(requestId, request) {
    const excludeUids = request.declinedBy ?? [];
    const candidates = await (0, matching_1.findEligibleMechanics)(db, request, excludeUids);
    if (candidates.length === 0) {
        console.log(`[assignTopCandidate] ${requestId}: No eligible mechanics found`);
        return false;
    }
    const top = candidates[0];
    const etaMin = (0, matching_1.deriveEtaMinutes)(top.mechanic.baseLat && top.mechanic.baseLng
        ? { lat: top.mechanic.baseLat, lng: top.mechanic.baseLng }
        : undefined, request);
    const ref = db.collection('requests').doc(requestId);
    try {
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists)
                throw new Error('Request no longer exists');
            const cur = snap.data();
            if (cur.status !== 'requested' || cur.mechanicId)
                throw new Error('already-assigned');
            tx.update(ref, {
                status: 'accepted',
                mechanicId: top.mechanic.id,
                mechanicName: top.mechanic.name,
                etaMin,
                updatedAt: new Date(),
            });
        });
        console.log(`[assignTopCandidate] ${requestId}: Assigned to ${top.mechanic.id} (${top.mechanic.name})`);
        return true;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'already-assigned') {
            console.log(`[assignTopCandidate] ${requestId}: Skipped — already assigned by concurrent write`);
            return false;
        }
        throw err;
    }
}
/** Handle initial dispatch for a new request. */
async function handleNewRequest(requestId, request) {
    if (request.pickedMechanicId) {
        console.log(`[handleNewRequest] ${requestId}: Has pickedMechanicId, skipping auto-dispatch`);
        return;
    }
    if (request.status !== 'requested' || request.mechanicId)
        return;
    await assignTopCandidate(requestId, request);
}
/** Handle rematch when a job is released or declined. */
async function handleRematch(requestId, request) {
    if (request.status !== 'requested' || request.mechanicId)
        return;
    await assignTopCandidate(requestId, request);
}
/**
 * Fold a new/changed rating into the mechanic's aggregate.
 *
 * Idempotency: only runs when `rating` itself changed on this write
 * (`before.rating !== after.rating`). The flag-write below re-triggers
 * onWrite, but there `before.rating === after.rating` so it is skipped.
 * Retries of a failed run re-read the mechanic doc inside one transaction,
 * and a rating *change* adjusts the sum by delta instead of double-counting.
 */
async function maybeAggregateRating(requestId, before, after) {
    if (after.status !== 'completed')
        return;
    const rating = after.rating;
    if (typeof rating !== 'number' || !(rating >= 1 && rating <= 5))
        return;
    const mechanicId = after.mechanicId;
    if (!mechanicId)
        return;
    if (before.rating === rating)
        return;
    const hadPrior = typeof before.rating === 'number' &&
        before.mechanicId === mechanicId;
    const delta = hadPrior ? rating - before.rating : rating;
    const mechRef = db.collection('mechanics').doc(mechanicId);
    try {
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(mechRef);
            if (!snap.exists)
                throw new Error('mechanic-missing');
            const cur = snap.data();
            const count0 = typeof cur.reviewCount === 'number' ? cur.reviewCount : 0;
            const avg0 = typeof cur.rating === 'number' ? cur.rating : 0;
            const sum0 = avg0 * count0;
            const count1 = hadPrior ? count0 : count0 + 1;
            const sum1 = sum0 + delta;
            const avg1 = count1 > 0 ? Math.round((sum1 / count1) * 10) / 10 : 0;
            tx.update(mechRef, {
                rating: avg1,
                reviewCount: count1,
            });
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'mechanic-missing') {
            console.log(`[maybeAggregateRating] ${requestId}: mechanic ${mechanicId} missing, skipping`);
            return;
        }
        throw err;
    }
    // Mark aggregated (admin SDK bypasses rules). Echo trigger is a no-op
    // via the before.rating === after.rating guard above.
    await db.collection('requests').doc(requestId).set({ ratingAggregated: true, updatedAt: new Date() }, { merge: true });
    console.log(`[maybeAggregateRating] ${requestId}: folded rating ${rating} into ${mechanicId}`);
}
/**
 * Copy the assigned mechanic's phone onto the request.
 *
 * Runs when a request gains a mechanic (or the mechanic changes) and the
 * phone is missing/stale. Reads `private/contact` first, falling back to
 * a legacy parent-doc `phone` for pre-split profiles. The flag-free guard
 * (`mechanicPhone` already matches) makes the echo trigger a no-op.
 */
async function maybeAttachMechanicPhone(requestId, before, after) {
    const mechanicId = after.mechanicId;
    if (!mechanicId)
        return;
    if (after.mechanicPhone && after.mechanicId === before.mechanicId)
        return;
    let phone = null;
    try {
        const contact = await db
            .collection('mechanics').doc(mechanicId)
            .collection('private').doc('contact').get();
        if (contact.exists) {
            const raw = contact.data();
            if (typeof raw.phone === 'string' && raw.phone.trim())
                phone = raw.phone.trim();
        }
        if (!phone) {
            const parent = await db.collection('mechanics').doc(mechanicId).get();
            const raw = (parent.exists ? parent.data() : null);
            if (raw && typeof raw.phone === 'string' && raw.phone.trim())
                phone = raw.phone.trim();
        }
    }
    catch (err) {
        console.error(`[maybeAttachMechanicPhone] ${requestId}: contact read failed:`, err);
        return;
    }
    if (!phone) {
        console.log(`[maybeAttachMechanicPhone] ${requestId}: no phone on file for ${mechanicId}`);
        return;
    }
    await db.collection('requests').doc(requestId).set({ mechanicPhone: phone, updatedAt: new Date() }, { merge: true });
    console.log(`[maybeAttachMechanicPhone] ${requestId}: attached phone for ${mechanicId}`);
}
async function putNotification(toUid, event, requestId, type, title, body, path) {
    const id = `notif_${requestId}_${event}`;
    const ref = db.collection('notifications').doc(toUid).collection('items').doc(id);
    try {
        if ((await ref.get()).exists)
            return;
        await ref.set({
            id,
            type,
            title: title.slice(0, 120),
            ...(body ? { body: body.slice(0, 500) } : {}),
            requestId,
            ...(path ? { path } : {}),
            createdAt: Date.now(),
            read: false,
        });
        console.log(`[notify] ${requestId}: ${event} -> ${toUid}`);
    }
    catch (err) {
        console.error(`[notify] ${requestId}: ${event} -> ${toUid} failed:`, err);
    }
}
function shortRef(requestId) {
    return `#${requestId.slice(-6).toUpperCase()}`;
}
async function maybeNotifyTransition(requestId, before, after) {
    const ref = shortRef(requestId);
    const category = after.problemCategory ?? 'service request';
    const statusChanged = before.status !== after.status;
    const mechanicChanged = (before.mechanicId ?? null) !== (after.mechanicId ?? null);
    // Accepted / (re)assigned — fires on first accept and on every
    // mechanic change while accepted (admin reassign, auto-rematch accept).
    if (after.status === 'accepted' &&
        after.mechanicId &&
        (!statusChanged ? mechanicChanged : before.status !== 'accepted' || mechanicChanged)) {
        const reassigned = Boolean(before.mechanicId) && before.mechanicId !== after.mechanicId;
        const mechName = after.mechanicName ?? 'A mechanic';
        await putNotification(after.customerId, `accepted_${after.mechanicId}`, requestId, reassigned ? 'job_reassigned' : 'job_accepted', reassigned ? 'New mechanic assigned' : 'Mechanic accepted', reassigned
            ? `${mechName} is now on your ${category} request ${ref}.`
            : `${mechName} accepted your ${category} request ${ref}.`, `/track/${requestId}`);
        await putNotification(after.mechanicId, `assigned_${after.mechanicId}`, requestId, 'job_assigned', 'New job assigned to you', `${ref} · ${category}. Open the job for details and navigation.`, `/mechanic/job/${requestId}`);
        if (reassigned && before.mechanicId) {
            await putNotification(before.mechanicId, `unassigned_${before.mechanicId}`, requestId, 'job_unassigned', 'Job reassigned away', `${ref} was reassigned to another mechanic.`, `/mechanic/requests`);
        }
        return;
    }
    // Mechanic removed back to the queue by an admin action (forceRematch /
    // admin reset). A mechanic's own releaseJob sets releasedAt and notifies
    // nobody — no self-notification noise.
    if (after.status === 'requested' &&
        before.mechanicId &&
        !after.mechanicId &&
        !after.releasedAt) {
        await putNotification(before.mechanicId, `unassigned_${before.mechanicId}`, requestId, 'job_unassigned', 'Job returned to the queue', `${ref} was released back to dispatch by an admin.`, `/mechanic/requests`);
        return;
    }
    if (!statusChanged)
        return;
    // Customer progress events.
    if (after.status === 'on-the-way' ||
        after.status === 'arrived' ||
        after.status === 'service' ||
        after.status === 'completed') {
        const copy = {
            'on-the-way': {
                title: 'Mechanic is on the way',
                body: `${after.mechanicName ?? 'Your mechanic'} is heading to you${after.etaMin != null ? ` (ETA ~${after.etaMin} min, straight-line estimate)` : ''}.`,
            },
            arrived: {
                title: 'Mechanic has arrived',
                body: `${after.mechanicName ?? 'Your mechanic'} is at your location for ${ref}.`,
            },
            service: {
                title: 'Service started',
                body: `Work has started on your ${category} request ${ref}.`,
            },
            completed: {
                title: 'Service completed',
                body: `Your ${category} request ${ref} is complete. Please rate the service.`,
            },
        };
        const c = copy[after.status];
        await putNotification(after.customerId, after.status, requestId, after.status === 'on-the-way' ? 'job_enroute'
            : after.status === 'arrived' ? 'job_arrived'
                : after.status === 'service' ? 'job_service' : 'job_completed', c.title, c.body, `/track/${requestId}`);
        return;
    }
    // Cancellation — customer is told unless they cancelled it themselves;
    // the assigned mechanic (if any) is always told.
    if (after.status === 'cancelled' && before.status !== 'cancelled') {
        const reason = after.cancellationReason ? ` Reason: ${after.cancellationReason}` : '';
        const cancelledByCustomer = after.cancelledBy === 'customer' || after.cancelledBy === after.customerId;
        if (!cancelledByCustomer) {
            await putNotification(after.customerId, 'cancelled', requestId, 'request_cancelled', 'Request cancelled', `Your ${category} request ${ref} was cancelled.${reason}`, `/history/${requestId}`);
        }
        const assignedAtCancel = after.mechanicId ?? before.mechanicId;
        if (assignedAtCancel) {
            await putNotification(assignedAtCancel, `cancelled_${assignedAtCancel}`, requestId, 'request_cancelled', 'Job cancelled', `${ref} was cancelled.${reason}`, `/mechanic/requests`);
        }
    }
}
exports.scheduledOfferExpiry = functions.pubsub
    .schedule('every 1 minutes')
    .onRun(async () => {
    const now = Date.now();
    const snapshot = await db
        .collection('requests')
        .where('status', '==', 'requested')
        .where('offerExpiresAt', '<', now)
        .where('mechanicId', '==', null)
        .limit(50)
        .get();
    if (snapshot.empty) {
        console.log('[scheduledOfferExpiry] No expired offers to process');
        return;
    }
    console.log(`[scheduledOfferExpiry] Found ${snapshot.size} expired offers`);
    for (const doc of snapshot.docs) {
        const request = { id: doc.id, ...doc.data() };
        if (!(0, matching_1.needsRematching)(request))
            continue;
        try {
            await handleRematch(request.id, request);
        }
        catch (err) {
            console.error('[scheduledOfferExpiry] ' + request.id + ' rematch failed:', err);
        }
    }
});
/**
 * Scheduled function: runs every 5 minutes to clean up stale requested
 * offers that have no mechanic and no recent activity.
 * Marks them as cancelled after 30 minutes of no match.
 */
exports.scheduledStaleRequestCleanup = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async () => {
    const staleThreshold = Date.now() - 30 * 60 * 1000;
    const snapshot = await db
        .collection('requests')
        .where('status', '==', 'requested')
        .where('mechanicId', '==', null)
        .where('updatedAt', '<', staleThreshold)
        .limit(20)
        .get();
    if (snapshot.empty) {
        return;
    }
    console.log(`[scheduledStaleRequestCleanup] Cancelling ${snapshot.size} stale requests`);
    const batch = db.batch();
    for (const doc of snapshot.docs) {
        const ref = doc.ref;
        batch.update(ref, {
            status: 'cancelled',
            cancellationReason: 'No mechanic available after 30 minutes',
            cancelledAt: new Date(),
            cancelledBy: 'system',
            updatedAt: new Date(),
        });
    }
    await batch.commit();
});
/**
 * Callable function: manual trigger for admin to force rematch a specific request.
 */
exports.forceRematch = functions.https.onCall(async (data, context) => {
    if (!context.auth?.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const { requestId } = data;
    if (!requestId) {
        throw new functions.https.HttpsError('invalid-argument', 'requestId required');
    }
    const doc = await db.collection('requests').doc(requestId).get();
    if (!doc.exists) {
        throw new functions.https.HttpsError('not-found', 'Request not found');
    }
    const request = { id: doc.id, ...doc.data() };
    if (request.status !== 'requested' && !(request.status === 'accepted' || request.status === 'on-the-way' || request.status === 'arrived' || request.status === 'service')) {
        throw new functions.https.HttpsError('failed-precondition', 'Request is not in a rematchable state');
    }
    // Re-read inside transaction via assign path: reset then assign atomically where possible.
    // resetRequestForRematch does a single-field update; assignTopCandidate does a transaction with guard.
    await (0, matching_1.resetRequestForRematch)(db, requestId);
    const freshSnap = await db.collection('requests').doc(requestId).get();
    const fresh = { ...freshSnap.data(), id: freshSnap.id };
    await assignTopCandidate(requestId, fresh);
    return { success: true };
});
//# sourceMappingURL=index.js.map