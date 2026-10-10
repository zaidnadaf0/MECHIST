"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_CANDIDATES_PER_ROUND = exports.OFFER_WINDOW_MS = void 0;
exports.haversineKm = haversineKm;
exports.deriveEtaMinutes = deriveEtaMinutes;
exports.scoreMechanic = scoreMechanic;
exports.findEligibleMechanics = findEligibleMechanics;
exports.resetRequestForRematch = resetRequestForRematch;
exports.needsRematching = needsRematching;
exports.OFFER_WINDOW_MS = 120_000;
exports.MAX_CANDIDATES_PER_ROUND = 5;
/** Haversine distance in km between two lat/lng points. */
function haversineKm(lat1, lng1, lat2, lng2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
}
/** Derive ETA in minutes from mechanic base to request location. */
function deriveEtaMinutes(mechanicBase, request) {
    if (!mechanicBase)
        return request.etaMin ?? 15;
    const km = haversineKm(mechanicBase.lat, mechanicBase.lng, request.customerLat, request.customerLng);
    if (!Number.isFinite(km) || km <= 0)
        return request.etaMin ?? 15;
    return Math.max(1, Math.round((km / 35) * 60));
}
/** Score a mechanic for a request (higher = better match). */
function scoreMechanic(mechanic, request) {
    if (!mechanic.approved || !mechanic.isAvailable)
        return -Infinity;
    if (!mechanic.baseLat || !mechanic.baseLng)
        return -Infinity;
    const km = haversineKm(mechanic.baseLat, mechanic.baseLng, request.customerLat, request.customerLng);
    if (!Number.isFinite(km))
        return -Infinity;
    // Row 10 — per-mechanic server radius. See src/lib/nearby.ts (DISPATCH_RADIUS_KM = 25) for the client display radius.
    // A mechanic's own serviceRadiusKm overrides both defaults; the server falls back to 50 km as the operational outer bound.
    const radius = mechanic.serviceRadiusKm ?? 50;
    if (km > radius)
        return -Infinity;
    let score = 1000 - km * 10;
    if (request.problemCategory && mechanic.specialties?.includes(request.problemCategory)) {
        score += 200;
    }
    if (mechanic.rating != null) {
        score += mechanic.rating * 20;
    }
    if (mechanic.reviewCount != null) {
        score += Math.min(mechanic.reviewCount, 50) * 2;
    }
    if (mechanic.currentLat != null && mechanic.currentLng != null && mechanic.locationUpdatedAt) {
        const ageMs = Date.now() - mechanic.locationUpdatedAt;
        if (ageMs < 5 * 60 * 1000) {
            const liveKm = haversineKm(mechanic.currentLat, mechanic.currentLng, request.customerLat, request.customerLng);
            if (liveKm < km) {
                score += 100;
            }
        }
    }
    return score;
}
/** Find eligible mechanics for a request, sorted by score descending. */
async function findEligibleMechanics(db, request, excludeUids = []) {
    const mechanicsRef = db.collection('mechanics');
    const snapshot = await mechanicsRef
        .where('approved', '==', true)
        .where('isAvailable', '==', true)
        .get();
    const candidates = [];
    for (const doc of snapshot.docs) {
        const mechanic = { id: doc.id, ...doc.data() };
        if (excludeUids.includes(mechanic.id))
            continue;
        const score = scoreMechanic(mechanic, request);
        if (score > -Infinity) {
            candidates.push({ mechanic, score });
        }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, exports.MAX_CANDIDATES_PER_ROUND);
}
/** Extend offer window for a request and clear assignment. Uses transaction so concurrent accepts don't race a reset. */
async function resetRequestForRematch(db, requestId) {
    try {
        const ref = db.collection('requests').doc(requestId);
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists)
                throw new Error('Request no longer exists');
            tx.update(ref, {
                status: 'requested',
                mechanicId: null,
                mechanicName: null,
                mechanicPhone: null,
                mechanicLat: null,
                mechanicLng: null,
                offerExpiresAt: Date.now() + exports.OFFER_WINDOW_MS,
                updatedAt: new Date(),
            });
        });
        return true;
    }
    catch (err) {
        console.error(`[resetRequestForRematch] ${requestId}:`, err);
        return false;
    }
}
/** Check if a request needs rematching (expired or released/declined). */
function needsRematching(request) {
    if (request.status !== 'requested')
        return false;
    if (request.mechanicId)
        return false;
    if (request.offerExpiresAt != null && request.offerExpiresAt < Date.now())
        return true;
    return false;
}
//# sourceMappingURL=matching.js.map