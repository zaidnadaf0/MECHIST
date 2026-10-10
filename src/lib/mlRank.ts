/**
 * ML ranking with fallback: ML API -> deterministic baseline -> distance.
 * Pure + resilient; never throws to caller.
 *
 * FEATURE CONTRACT (Batch 6 audit — deterministic derivations only):
 * - rating / distance_km / eta_min / within_service_radius: real Firestore fields.
 * - specialty_match: same stem-normalized `problemCompatibility` matcher as
 *   dispatch (`nearby.ts`) — 1 when compatible, else 0.
 * - vehicle_match: token match of the customer's vehicle type against the
 *   mechanic's listed vehicleTypes — 1 for generalists (no types listed),
 *   else 0/1. Deterministic; never observed completion data.
 * - urgency: derived from the problem category (tow/engine = high because
 *   the driver is stranded; everything else medium). The model vocab also
 *   accepts low/critical but production never invents them.
 * - completion_rate / active_jobs: NOT in the production mechanic schema.
 *   Deterministic safe defaults (0.88 / 0, the training-set means) are used
 *   and documented here — they are NOT live observations.
 */
import type { MechanicProfile } from './mechanic';

export interface RankCandidate {
  mechanic: MechanicProfile;
  distanceKm: number;
  etaMin: number;
  specialtyMatch: number;
  vehicleMatch: number;
  withinRadius: number;
}

const BASELINE_WEIGHTS: Record<string, number> = {
  rating: 0.8, completion_rate: 0.6, distance_km: -1.5, active_jobs: -0.9,
  eta_min: -0.6, specialty_match: 2.0, vehicle_match: 1.0, within_service_radius: 1.2, available: 0.7,
};

// Means/stds from ml/features/feature_schema.json (train fit) for baseline normalization parity
const MEANS: Record<string, number> = {
  rating: 4.2930, completion_rate: 0.8792, distance_km: 33.1801, active_jobs: 0.7186,
  eta_min: 56.9228, specialty_match: 0.5108, vehicle_match: 0.3240, within_service_radius: 0.3030,
};
const STDS: Record<string, number> = {
  rating: 0.4670, completion_rate: 0.0645, distance_km: 15.6419, active_jobs: 0.8324,
  eta_min: 26.8479, specialty_match: 0.4999, vehicle_match: 0.4680, within_service_radius: 0.4596,
};

function baselineScore(c: RankCandidate): number {
  const norm = (k: string, v: number) => (v - (MEANS[k] ?? 0)) / (STDS[k] ?? 1);
  let s = 0;
  s += BASELINE_WEIGHTS.rating * norm('rating', (c.mechanic.rating as number) ?? 4.2);
  s += BASELINE_WEIGHTS.completion_rate * norm('completion_rate', (c.mechanic as unknown as {completion_rate?:number}).completion_rate ?? 0.88);
  s += BASELINE_WEIGHTS.distance_km * norm('distance_km', c.distanceKm);
  s += BASELINE_WEIGHTS.active_jobs * norm('active_jobs', (c.mechanic as unknown as {active_jobs?:number}).active_jobs ?? 0);
  s += BASELINE_WEIGHTS.eta_min * norm('eta_min', c.etaMin);
  s += BASELINE_WEIGHTS.specialty_match * norm('specialty_match', c.specialtyMatch);
  s += BASELINE_WEIGHTS.vehicle_match * norm('vehicle_match', c.vehicleMatch);
  s += BASELINE_WEIGHTS.within_service_radius * norm('within_service_radius', c.withinRadius);
  const avail = c.mechanic.isAvailable ? 1 : 0;
  s += BASELINE_WEIGHTS.available * (avail ? 0.7 : -0.7);
  return s;
}

async function mlScores(candidates: RankCandidate[], origin: { lat: number; lng: number }, problemCategory: string, vehicleType: string, urgency: string): Promise<number[] | null> {
  const base = import.meta.env.VITE_ML_API_URL as string | undefined || 'http://localhost:8000';
  // don't block UI if API down — 1.2s timeout
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 1200);
  try {
    const payload = {
      candidates: candidates.map(c => ({
        mechanic_id: c.mechanic.id,
        customer_lat: origin.lat, customer_lng: origin.lng,
        problem_category: problemCategory, vehicle_type: vehicleType, urgency,
        mechanic_lat: c.mechanic.baseLat ?? origin.lat, mechanic_lng: c.mechanic.baseLng ?? origin.lng,
        service_radius_km: c.mechanic.serviceRadiusKm ?? 25,
        rating: c.mechanic.rating ?? 4.2, review_count: c.mechanic.reviewCount ?? 10,
        experience_years: c.mechanic.experienceYears ?? 5,
        availability: c.mechanic.isAvailable ? 'available' : 'busy',
        active_jobs: (c.mechanic as unknown as {active_jobs?:number}).active_jobs ?? 0,
        completion_rate: (c.mechanic as unknown as {completion_rate?:number}).completion_rate ?? 0.88,
        eta_min: c.etaMin, distance_km: c.distanceKm,
        specialty_match: c.specialtyMatch, vehicle_match: c.vehicleMatch,
        within_service_radius: c.withinRadius,
      })),
    };
    const res = await fetch(`${base}/rank-mechanics`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json() as { ranked: { mechanic_id: string; score: number }[] };
    const map = new Map(data.ranked.map(r => [r.mechanic_id, r.score]));
    return candidates.map(c => map.get(c.mechanic.id) ?? baselineScore(c));
  } catch {
    return null;
  } finally { clearTimeout(t); }
}

export async function rankMechanics(candidates: RankCandidate[], origin: { lat: number; lng: number }, problemCategory: string, vehicleType: string, urgency: string = 'medium'): Promise<RankCandidate[]> {
  // Hard constraints already enforced by nearbyMechanics / caller (approved, available, specialty, radius, declinedBy).
  // This function only orders the eligible set.
  if (candidates.length <= 1) return candidates;
  const ml = await mlScores(candidates, origin, problemCategory, vehicleType, urgency);
  const scored = candidates.map((c, i) => ({ c, score: ml ? ml[i] : baselineScore(c) }));
  scored.sort((a, b) => b.score - a.score);
  // Log fallback for diagnostics without surfacing to customer
  if (!ml) console.info('[MECHIST mlRank] ML unavailable, used baseline fallback');
  return scored.map(s => s.c);
}

export function rankMechanicsSync(candidates: RankCandidate[]): RankCandidate[] {
  if (candidates.length <= 1) return candidates;
  const scored = candidates.map(c => ({ c, score: baselineScore(c) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.c);
}

/**
 * Deterministic urgency derived from the problem category.
 * tow/engine strand the driver → high; everything else medium.
 * Production never emits low/critical (no source for them).
 */
export function urgencyForCategory(category: string | undefined): string {
  if (category === 'tow' || category === 'engine') return 'high';
  return 'medium';
}

const VEHICLE_TOKENS: Record<string, string[]> = {
  car: ['car', 'sedan', 'suv', 'hatchback', 'coupe'],
  bike: ['bike', 'motorcycle', 'scooter', 'scooty', 'two-wheeler', 'twowheeler'],
  van: ['van', 'tempo', 'minivan'],
  truck: ['truck', 'lorry', 'pickup', 'commercial'],
};

/**
 * Deterministic vehicle compatibility: 1 when the mechanic lists no
 * vehicle types (generalist — same philosophy as `problemCompatibility`),
 * else 1 on token overlap, else 0.
 */
export function vehicleMatchFor(
  customerType: string | undefined,
  mechanicTypes: string[] | undefined,
): number {
  if (!mechanicTypes || mechanicTypes.length === 0) return 1;
  const toks = VEHICLE_TOKENS[customerType ?? ''] ?? [(customerType ?? '').toLowerCase()];
  const have = new Set(mechanicTypes.map((s) => s.toLowerCase().trim()));
  return toks.some((t) => have.has(t)) ? 1 : 0;
}
