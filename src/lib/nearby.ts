/**
 * MECHIST — nearby-mechanic filter.
 *
 * Pure functions so the same logic is exercised in tests and at runtime.
 * Firestore returns whatever the client queries for; this module is the
 * authoritative filter for "is this mechanic actually eligible right now".
 */
import { distanceKm, type LatLng } from './geo';
import type { MechanicProfile } from './mechanic';

/** Request-categories MECHIST supports. Mirrors the option list in RequestFlow. */
export type ProblemCategory =
  | 'flat-tyre'
  | 'battery'
  | 'engine'
  | 'tow'
  | 'other';

const SPECIALTY_BY_CATEGORY: Record<ProblemCategory, string[]> = {
  'flat-tyre': ['tyre', 'tire', 'wheels', 'general'],
  'battery':   ['battery', 'electrical', 'general'],
  'engine':    ['engine', 'general'],
  'tow':       ['tow', 'recovery', 'general'],
  'other':     ['general'],
};

/**
 * Reduce a free-form specialty string to a comparable stem so we can match
 * across pluralization and US/UK spelling. This is intentionally crude:
 * the goal is "tires" matches "tyre", not full lemmatization.
 */
function stem(s: string): string {
  let out = s.toLowerCase().trim();
  // Common UK/US aliases before stripping a trailing 's'.
  if (out === 'tire' || out === 'tyres') out = 'tyre';
  // Drop a trailing 's' so 'tires' → 'tire' → 'tyre' via the alias above.
  if (out.endsWith('s') && out.length > 3) out = out.slice(0, -1);
  // Re-apply aliases after singularization ('tyres' → 'tyre' → 'tyre').
  if (out === 'tire') out = 'tyre';
  return out;
}

/**
 * A mechanic is "compatible" with a request if at least one of their
 * specialties matches the category's expected specialties. A mechanic with
 * no specialties at all is treated as a generalist and always passes.
 *
 * The match is symmetric and stem-normalized, so:
 *   - 'tires'    matches 'tyre'      (plural / UK-US)
 *   - 'batteries' matches 'battery'  (plural)
 *   - 'engine'   matches 'engine'    (identical)
 */
export function problemCompatibility(
  category: ProblemCategory | string | undefined,
  specialties: string[] | undefined,
): boolean {
  if (!category) return true;
  if (!specialties || specialties.length === 0) return true;
  const expected = SPECIALTY_BY_CATEGORY[category as ProblemCategory] ?? ['general'];
  const got = specialties.map(stem);
  return expected.some((need) => got.includes(stem(need)));
}

export interface NearbyMechanic {
  mechanic: MechanicProfile;
  distanceKm: number;
  etaMin: number;
}

/**
 * Filter mechanics to the ones we can actually dispatch for a given request.
 * Hard requirements:
 *   - mechanic has `approved === true`
 *   - mechanic has `isAvailable === true`
 *   - mechanic has a base location (baseLat, baseLng) we can measure from
 *   - mechanic is within `radiusKm` of the request's location
 *   - mechanic's specialties are compatible with the request category
 */
export function nearbyMechanics(
  origin: LatLng,
  problemCategory: string | undefined,
  mechanics: MechanicProfile[],
  opts: { radiusKm?: number; speedKmh?: number } = {},
): NearbyMechanic[] {
  const radiusKm = opts.radiusKm ?? 25;
  const speedKmh = opts.speedKmh ?? 35;
  const out: NearbyMechanic[] = [];
  for (const m of mechanics) {
    if (!m.approved || !m.isAvailable) continue;
    if (m.baseLat == null || m.baseLng == null) continue;
    if (!problemCompatibility(problemCategory, m.specialties)) continue;
    const d = distanceKm(origin, { lat: m.baseLat, lng: m.baseLng });
    if (d > radiusKm) continue;
    out.push({
      mechanic: m,
      distanceKm: d,
      etaMin: Math.max(1, Math.round((d / speedKmh) * 60)),
    });
  }
  out.sort((a, b) => a.distanceKm - b.distanceKm);
  return out;
}

/** Pick the closest available mechanic, or null. */
export function pickBest(
  origin: LatLng,
  problemCategory: string | undefined,
  mechanics: MechanicProfile[],
): NearbyMechanic | null {
  return nearbyMechanics(origin, problemCategory, mechanics)[0] ?? null;
}
