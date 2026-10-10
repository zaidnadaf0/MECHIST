import { Firestore } from 'firebase-admin/firestore';
import { ServiceRequest, MechanicProfile } from './types';
export declare const OFFER_WINDOW_MS = 120000;
export declare const MAX_CANDIDATES_PER_ROUND = 5;
/** Haversine distance in km between two lat/lng points. */
export declare function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number;
/** Derive ETA in minutes from mechanic base to request location. */
export declare function deriveEtaMinutes(mechanicBase: {
    lat: number;
    lng: number;
} | undefined, request: ServiceRequest): number;
/** Score a mechanic for a request (higher = better match). */
export declare function scoreMechanic(mechanic: MechanicProfile, request: ServiceRequest): number;
/** Find eligible mechanics for a request, sorted by score descending. */
export declare function findEligibleMechanics(db: Firestore, request: ServiceRequest, excludeUids?: string[]): Promise<Array<{
    mechanic: MechanicProfile;
    score: number;
}>>;
/** Extend offer window for a request and clear assignment. Uses transaction so concurrent accepts don't race a reset. */
export declare function resetRequestForRematch(db: Firestore, requestId: string): Promise<boolean>;
/** Check if a request needs rematching (expired or released/declined). */
export declare function needsRematching(request: ServiceRequest): boolean;
//# sourceMappingURL=matching.d.ts.map