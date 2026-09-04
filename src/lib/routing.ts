/**
 * MECHIST — routing seam.
 *
 * Routing-provider abstraction so Geoapify Directions (or any future
 * provider) can be slotted in later without touching map rendering.
 * For now the only concrete implementation is Haversine fallback,
 * which is the same `distanceKm` already used in `src/lib/geo.ts`.
 *
 * No paid routing API is called here.
 */
import { distanceKm, kmToMin, type LatLng } from './geo';
import { isValidLatLng } from './geoapify';

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: Array<[number, number]> | null;
  provider: 'haversine' | 'geoapify-directions';
}

export interface RoutingProvider {
  route(from: LatLng, to: LatLng): Promise<RouteResult>;
}

/**
 * Haversine fallback — straight-line distance, not road distance.
 * Always available, no network, no token.
 */
export const haversineRouting: RoutingProvider = {
  async route(from: LatLng, to: LatLng): Promise<RouteResult> {
    if (!isValidLatLng(from) || !isValidLatLng(to)) {
      throw new Error('Invalid coordinates for routing');
    }
    const d = distanceKm(from, to);
    return {
      distanceKm: d,
      durationMin: kmToMin(d),
      geometry: null,
      provider: 'haversine',
    };
  },
};

/**
 * Factory: returns the active provider. This is always the
 * Haversine fallback; a future phase can branch on key/config and
 * return a Geoapify Directions provider here without touching callers.
 */
export function getRoutingProvider(): RoutingProvider {
  return haversineRouting;
}
