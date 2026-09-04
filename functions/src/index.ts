import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ServiceRequest, MechanicProfile } from './types';
import {
  findEligibleMechanics,
  resetRequestForRematch,
  needsRematching,
  OFFER_WINDOW_MS,
  deriveEtaMinutes,
} from './matching';

admin.initializeApp();
const db = admin.firestore();

/**
 * Triggered when a request document is written.
 * Handles:
 *   - Auto-rematch when a mechanic declines (declinedBy array grows)
 *   - Auto-rematch when a mechanic releases (status back to requested, mechanicId cleared)
 *   - Initial dispatch on create (if no pickedMechanicId)
 */
export const onRequestWrite = functions.firestore
  .document('requests/{requestId}')
  .onWrite(async (change, context) => {
    const requestId = context.params.requestId;
    const before = change.before.exists ? (change.before.data() as ServiceRequest) : null;
    const after = change.after.exists ? (change.after.data() as ServiceRequest) : null;

    if (!after) {
      console.log(`[onRequestWrite] ${requestId}: Document deleted`);
      return;
    }

    if (!before) {
      console.log(`[onRequestWrite] ${requestId}: Document created`);
      await handleNewRequest(requestId, after);
      return;
    }

    const statusChanged = before.status !== after.status;
    const mechanicCleared = before.mechanicId && !after.mechanicId;
    const declinedByGrew =
      after.status === 'requested' &&
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
async function assignTopCandidate(
  requestId: string,
  request: ServiceRequest,
): Promise<boolean> {
  const excludeUids = request.declinedBy ?? [];
  const candidates = await findEligibleMechanics(db, request, excludeUids);
  if (candidates.length === 0) {
    console.log(`[assignTopCandidate] ${requestId}: No eligible mechanics found`);
    return false;
  }
  const top = candidates[0];
  const etaMin = deriveEtaMinutes(
    top.mechanic.baseLat && top.mechanic.baseLng
      ? { lat: top.mechanic.baseLat, lng: top.mechanic.baseLng }
      : undefined,
    request
  );
  const ref = db.collection('requests').doc(requestId);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Request no longer exists');
      const cur = snap.data() as ServiceRequest;
      if (cur.status !== 'requested' || cur.mechanicId) throw new Error('already-assigned');
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'already-assigned') {
      console.log(`[assignTopCandidate] ${requestId}: Skipped — already assigned by concurrent write`);
      return false;
    }
    throw err;
  }
}

/** Handle initial dispatch for a new request. */
async function handleNewRequest(requestId: string, request: ServiceRequest): Promise<void> {
  if (request.pickedMechanicId) {
    console.log(`[handleNewRequest] ${requestId}: Has pickedMechanicId, skipping auto-dispatch`);
    return;
  }
  if (request.status !== 'requested' || request.mechanicId) return;
  await assignTopCandidate(requestId, request);
}

/** Handle rematch when a job is released or declined. */
async function handleRematch(requestId: string, request: ServiceRequest): Promise<void> {
  if (request.status !== 'requested' || request.mechanicId) return;
  await assignTopCandidate(requestId, request);
}

/**
 * Scheduled function: runs every minute to find expired offers
 * and trigger rematch for them.
 */
export const scheduledOfferExpiry = functions.pubsub
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
      const request = { id: doc.id, ...doc.data() } as ServiceRequest;
      if (!needsRematching(request)) continue;
      try {
        await handleRematch(request.id, request);
      } catch (err) {
        console.error('[scheduledOfferExpiry] ' + request.id + ' rematch failed:', err);
      }
    }
  });

/**
 * Scheduled function: runs every 5 minutes to clean up stale requested
 * offers that have no mechanic and no recent activity.
 * Marks them as cancelled after 30 minutes of no match.
 */
export const scheduledStaleRequestCleanup = functions.pubsub
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
export const forceRematch = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }

  const { requestId } = data as { requestId: string };
  if (!requestId) {
    throw new functions.https.HttpsError('invalid-argument', 'requestId required');
  }

  const doc = await db.collection('requests').doc(requestId).get();
  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Request not found');
  }

  const request = { id: doc.id, ...doc.data() } as ServiceRequest;
  if (request.status !== 'requested' && !(request.status === 'accepted' || request.status === 'on-the-way' || request.status === 'arrived' || request.status === 'service')) {
    throw new functions.https.HttpsError('failed-precondition', 'Request is not in a rematchable state');
  }
  // Re-read inside transaction via assign path: reset then assign atomically where possible.
  // resetRequestForRematch does a single-field update; assignTopCandidate does a transaction with guard.
  await resetRequestForRematch(db, requestId);
  const freshSnap = await db.collection('requests').doc(requestId).get();
  const fresh = { ...(freshSnap.data() as ServiceRequest), id: freshSnap.id };
  await assignTopCandidate(requestId, fresh);

  return { success: true };
});