/**
 * Phase 1D — public mechanic projection (pure, dependency-free).
 *
 * This module is the SINGLE definition of what customer-facing code may
 * see of a mechanic. It is imported by:
 *   - `functions/src/index.ts` (server authority: builds the projection
 *     with the Admin SDK on every `mechanics/{uid}` write), and
 *   - `src/lib/privacyProjection.test.ts` (vitest: pins the contract).
 *
 * Kept dependency-free on purpose so both consumers can import it
 * without pulling in firebase-admin or client SDKs.
 *
 * Privacy contract:
 *   - `baseLat` / `baseLng` in the projection are COARSE (rounded to 2
 *     decimals, ~1.1 km). Exact home/garage coordinates NEVER leave
 *     `mechanics/{uid}` (owner + claim-admin + trusted server only).
 *   - Live GPS (`currentLat` / `currentLng`), exact address
 *     (`garageAddress`), contact (`phone` / `email`), workflow state
 *     (`verificationStatus`) and operational metadata are NEVER projected.
 *   - Only `approved === true` profiles are publishable. Anything else
 *     (pending / rejected / missing) returns null and the caller must
 *     delete any stale projection.
 */

/** Coarse grid resolution: 2 decimals ≈ 1.1 km — enough for "nearby" sorting, useless for doorstepping. */
export const COARSE_DECIMALS = 2;

export function coarsenCoord(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const factor = 10 ** COARSE_DECIMALS;
  return Math.round(value * factor) / factor;
}

/** Exact allowlist of fields that may appear in `publicMechanics/{uid}`. */
export const PUBLIC_PROJECTION_FIELDS = [
  'name',
  'approved',
  'isAvailable',
  'specialties',
  'vehicleTypes',
  'experienceYears',
  'serviceRadiusKm',
  'rating',
  'reviewCount',
  'vehicleDescription',
  'garageName',
  'baseLat',
  'baseLng',
  'updatedAt',
] as const;

export type PublicProjectionField = (typeof PUBLIC_PROJECTION_FIELDS)[number];

/** Fields that must NEVER appear in the public projection (regression pin). */
export const FORBIDDEN_PROJECTION_FIELDS = [
  'phone',
  'email',
  'garageAddress',
  'currentLat',
  'currentLng',
  'locationUpdatedAt',
  'verificationStatus',
  'uid',
] as const;

export interface MechanicSourceDoc {
  name?: unknown;
  approved?: unknown;
  isAvailable?: unknown;
  specialties?: unknown;
  vehicleTypes?: unknown;
  experienceYears?: unknown;
  serviceRadiusKm?: unknown;
  rating?: unknown;
  reviewCount?: unknown;
  vehicleDescription?: unknown;
  garageName?: unknown;
  baseLat?: unknown;
  baseLng?: unknown;
}

export type PublicMechanicProjection = Record<string, unknown>;

/**
 * Build the customer-safe projection for a `mechanics/{uid}` snapshot.
 * Returns null when the doc must NOT be publicly visible (not approved),
 * in which case the caller deletes any stale `publicMechanics/{uid}` doc.
 */
export function buildPublicProjection(
  raw: MechanicSourceDoc | null | undefined,
): PublicMechanicProjection | null {
  if (!raw || raw.approved !== true) return null;
  if (typeof raw.name !== 'string' || raw.name.trim().length === 0) return null;

  const out: PublicMechanicProjection = {
    name: raw.name.trim(),
    approved: true,
    isAvailable: raw.isAvailable === true,
  };

  if (Array.isArray(raw.specialties)) out.specialties = raw.specialties.filter((s) => typeof s === 'string');
  if (Array.isArray(raw.vehicleTypes)) out.vehicleTypes = raw.vehicleTypes.filter((s) => typeof s === 'string');
  if (typeof raw.experienceYears === 'number' && Number.isFinite(raw.experienceYears)) out.experienceYears = raw.experienceYears;
  if (typeof raw.serviceRadiusKm === 'number' && Number.isFinite(raw.serviceRadiusKm)) out.serviceRadiusKm = raw.serviceRadiusKm;
  if (typeof raw.rating === 'number' && Number.isFinite(raw.rating)) out.rating = raw.rating;
  if (typeof raw.reviewCount === 'number' && Number.isFinite(raw.reviewCount)) out.reviewCount = raw.reviewCount;
  if (typeof raw.vehicleDescription === 'string') out.vehicleDescription = raw.vehicleDescription;
  else if (raw.vehicleDescription == null) out.vehicleDescription = null;
  if (typeof raw.garageName === 'string') out.garageName = raw.garageName;

  const coarseLat = coarsenCoord(raw.baseLat);
  const coarseLng = coarsenCoord(raw.baseLng);
  out.baseLat = coarseLat;
  out.baseLng = coarseLng;

  return out;
}
