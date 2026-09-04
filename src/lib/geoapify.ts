/**
 * MECHIST — Geoapify pure helpers.
 *
 * Dependency-free helpers so they can be unit-tested without a map instance.
 * Leaflet reuse: Geoapify tiles are consumed via the existing Leaflet stack
 * (src/lib/map.tsx MapView), so no second map runtime is introduced.
 * No map instance is constructed here — only portable logic: validation,
 * provider switch, marker view-model, and tile URL builder.
 */
import type { LatLng } from './geo';

export type MapsProvider = 'leaflet' | 'geoapify';

export function isValidLatLng(p: LatLng | null | undefined): boolean {
  if (!p) return false;
  const { lat, lng } = p;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export function isValidTuple(t: [number, number] | null | undefined): boolean {
  if (!t) return false;
  const [lat, lng] = t;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export function resolveProvider(raw: string | undefined): MapsProvider {
  return raw === 'geoapify' ? 'geoapify' : 'leaflet';
}

export function hasGeoapifyKey(key: string | undefined): boolean {
  if (!key) return false;
  const t = key.trim();
  if (!t) return false;
  if (t === 'YOUR_GEOAPIFY_API_KEY') return false;
  return true;
}

export function geoapifyTileUrl(apiKey: string): string {
  return `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`;
}

export const GEOAPIFY_ATTRIBUTION =
  '&copy; <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | &copy; OpenStreetMap contributors' as const;

export interface MapMarker {
  id: string;
  position: [number, number];
  label?: string;
  tone?: 'azure' | 'aqua' | 'iris' | 'gold' | 'neutral';
}

export function toMapMarkers(
  mechanics: Array<{
    id: string;
    name: string;
    baseLat?: number | null;
    baseLng?: number | null;
  }>,
): MapMarker[] {
  const out: MapMarker[] = [];
  for (const m of mechanics) {
    if (m.baseLat == null || m.baseLng == null) continue;
    if (!Number.isFinite(m.baseLat) || !Number.isFinite(m.baseLng)) continue;
    if (m.baseLat < -90 || m.baseLat > 90) continue;
    if (m.baseLng < -180 || m.baseLng > 180) continue;
    out.push({ id: m.id, position: [m.baseLat, m.baseLng], label: m.name, tone: 'aqua' });
  }
  return out;
}
