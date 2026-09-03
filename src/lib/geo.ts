/**
 * MECHIST — pure geo helpers.
 *
 * Great-circle distance (Haversine) and a Haversine-derived ETA
 * estimate. Dependency-free so they can be unit-tested without a DOM.
 *
 * All input coordinates are { lat, lng } decimal degrees. Outputs are SI-ish:
 *   distanceKm  — kilometres along the Earth's surface
 *   kmToMin     — minutes at the supplied average speed
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const DEG2RAD = Math.PI / 180;

function toRad(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return deg * DEG2RAD;
}

/** Great-circle distance between two coordinates, in kilometres. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/**
 * Estimate travel time in whole minutes from a distance at a given speed.
 * Defaults to 35 km/h, which is roughly the urban / mixed-road average the
 * MECHIST product uses until real routing lands.
 */
export function kmToMin(km: number, speedKmh = 35): number {
  if (!Number.isFinite(km) || km <= 0) return 0;
  if (!Number.isFinite(speedKmh) || speedKmh <= 0) return 0;
  return Math.max(1, Math.round((km / speedKmh) * 60));
}
