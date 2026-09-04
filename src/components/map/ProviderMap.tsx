/**
 * MECHIST — provider switch.
 *
 * Choosing between Geoapify and Leaflet/OSM lives in this one file.
 * Pages import `ProviderMap`; they do not check keys or provider
 * themselves. Behaviour:
 *   - VITE_MAPS_PROVIDER=geoapify + valid VITE_GEOAPIFY_API_KEY -> Geoapify tiles via Leaflet
 *   - otherwise -> Leaflet + OSM (src/lib/map.tsx OSM_TILES)
 *
 * Geoapify reuses the existing Leaflet runtime — no second map engine.
 * Leaflet/MapView handles init/cleanup/StrictMode/markers identically in both branches.
 */
import { GEOAPIFY_ATTRIBUTION, geoapifyTileUrl, hasGeoapifyKey, resolveProvider, type MapMarker } from '@/lib/geoapify';
import { OSM_TILES, MapView, Marker, Polyline, AutoFitBounds, RecenterButton } from '@/lib/map';
import { useEffect, useState } from 'react';

interface ProviderMapProps {
  center: [number, number];
  zoom?: number;
  className?: string;
  userPosition?: [number, number] | null;
  userLabel?: string;
  mechanicMarkers?: MapMarker[];
  line?: Array<[number, number]> | null;
}

function GeoapifyMapView({
  center, zoom, className, apiKey, userPosition, userLabel, mechanicMarkers = [], line,
}: ProviderMapProps & { apiKey: string }) {
  const tileUrl = geoapifyTileUrl(apiKey);
  const hasLine = line && line.length >= 2;
  const points: Array<[number, number]> = [];
  if (userPosition) points.push(userPosition);
  for (const mm of (mechanicMarkers ?? [])) points.push(mm.position);
  if (line) for (const p of line) if (!points.some((q) => q[0] === p[0] && q[1] === p[1])) points.push(p);
  // If Geoapify tiles 403/404 (bad key, quota), TileLayer fires tileerror — we
  // fall back to OSM for the rest of the session so the map stays usable.
  const [fallbackToOsm, setFallbackToOsm] = useState(false);
  useEffect(() => { setFallbackToOsm(false); }, [apiKey]);
  const effectiveUrl = fallbackToOsm ? OSM_TILES.url : tileUrl;
  const effectiveAttr = fallbackToOsm ? OSM_TILES.attribution : GEOAPIFY_ATTRIBUTION;
  return (
    <MapView center={center} zoom={zoom} className={className} tileUrl={effectiveUrl} attribution={effectiveAttr} onTileError={() => setFallbackToOsm(true)}>
      {userPosition && <Marker position={userPosition} tone="azure" label={userLabel} />}
      {(mechanicMarkers ?? []).map((mm) => (
        <Marker key={mm.id} position={mm.position} tone={mm.tone ?? 'aqua'} label={mm.label} />
      ))}
      {hasLine && <Polyline positions={line!} tone="aqua" weight={3} dashArray="6 8" />}
      <AutoFitBounds points={points.length ? points : [center]} />
      <RecenterButton center={center} zoom={zoom} />
    </MapView>
  );
}

export function ProviderMap({
  center,
  zoom = 13,
  className,
  userPosition = null,
  userLabel = 'You',
  mechanicMarkers = [],
  line = null,
}: ProviderMapProps) {
  const provider = resolveProvider(import.meta.env.VITE_MAPS_PROVIDER as string | undefined);
  const geoKey = import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined;
  const keyOk = hasGeoapifyKey(geoKey);

  if (provider === 'geoapify' && keyOk) {
    return (
      <GeoapifyMapView
        center={center}
        zoom={zoom}
        className={className}
        apiKey={geoKey!}
        userPosition={userPosition}
        userLabel={userLabel}
        mechanicMarkers={mechanicMarkers}
        line={line}
      />
    );
  }

  // Leaflet/OSM fallback — preserves existing behaviour exactly; uses the
  // same data that Geoapify would have consumed (no duplicate fetch).
  const hasLine = line && line.length >= 2;
  const points: Array<[number, number]> = [];
  if (userPosition) points.push(userPosition);
  for (const mm of mechanicMarkers) points.push(mm.position);
  if (line) for (const p of line) if (!points.some((q) => q[0] === p[0] && q[1] === p[1])) points.push(p);

  return (
    <MapView center={center} zoom={zoom} className={className}>
      {userPosition && <Marker position={userPosition} tone="azure" label={userLabel} />}
      {mechanicMarkers.map((mm) => (
        <Marker key={mm.id} position={mm.position} tone={mm.tone ?? 'aqua'} label={mm.label} />
      ))}
      {hasLine && <Polyline positions={line!} tone="aqua" weight={3} dashArray="6 8" />}
      <AutoFitBounds points={points.length ? points : [center]} />
      <RecenterButton center={center} zoom={zoom} />
    </MapView>
  );
}

export type { MapMarker };
