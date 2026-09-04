import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { useMap as useLeafletMap } from 'react-leaflet';
import L, { type DivIcon } from 'leaflet';

interface MapProps {
  center: [number, number];
  zoom?: number;
  className?: string;
  tileUrl?: string;
  attribution?: string;
  onTileError?: () => void;
  children?: ReactNode;
}

export const OSM_TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreet.org/copyright">OpenStreetMap</a> contributors',
} as const;

export function TileLayer({ url, attribution, onTileError }: { url: string; attribution: string; onTileError?: () => void }) {
  const Mod = useReactLeaflet();
  if (!Mod) return null;
  return <Mod.TileLayer url={url} attribution={attribution} eventHandlers={onTileError ? { tileerror: onTileError } : undefined} />;
}

/**
 * Module context for react-leaflet. MapView sets this once on mount;
 * Marker / Polyline / AutoFitBounds / RecenterButton read it so they
 * don't each kick off their own dynamic import (3× the network for one
 * map render) and don't double-paint while they wait.
 */
type ReactLeafletModule = typeof import('react-leaflet');
const ReactLeafletContext = createContext<ReactLeafletModule | null>(null);
function useReactLeaflet(): ReactLeafletModule | null {
  return useContext(ReactLeafletContext);
}

/**
 * MapView — dynamically imports react-leaflet so the map bundle is only
 * loaded by pages that actually use it. Renders a loading placeholder
 * during the async import; surfaces a clear error if the import fails
 * (CDN down, network blip) so the user isn't stuck on "Loading map…"
 * forever.
 *
 * Pass `<Marker>`, `<Polyline>`, `<AutoFitBounds>`, or `<RecenterButton>`
 * as children. All of these read react-leaflet from the context set
 * here, so they render in the same paint as the map tiles.
 */
export function MapView({ center, zoom = 13, className, tileUrl, attribution, onTileError, children }: MapProps) {
  const [Mod, setMod] = useState<ReactLeafletModule | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    import('react-leaflet')
      .then((m) => { if (mounted) setMod(m); })
      .catch(() => { if (mounted) setLoadError(true); });
    return () => { mounted = false; };
  }, []);

  if (loadError) {
    return (
      <div className={className ?? 'aspect-[16/10] w-full rounded-xl bg-ink-100 dark:bg-ink-800 grid place-items-center text-fg-muted text-small'}>
        Map could not be loaded. Check your connection and refresh.
      </div>
    );
  }
  if (!Mod) {
    return (
      <div className={className ?? 'aspect-[16/10] w-full rounded-xl bg-ink-100 dark:bg-ink-800 grid place-items-center text-fg-muted text-small'}>
        Loading map…
      </div>
    );
  }
  const { MapContainer } = Mod;
  const effectiveTileUrl = tileUrl ?? OSM_TILES.url;
  const effectiveAttribution = attribution ?? OSM_TILES.attribution;
  return (
    <div className={(className ?? 'aspect-[16/10]') + ' relative w-full overflow-hidden rounded-xl'}>
      <ReactLeafletContext.Provider value={Mod}>
        <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <Mod.TileLayer url={effectiveTileUrl} attribution={effectiveAttribution} eventHandlers={onTileError ? { tileerror: onTileError } : undefined} />
          {children}
        </MapContainer>
      </ReactLeafletContext.Provider>
    </div>
  );
}

/**
 * Pin colour tokens. The string values are real CSS / SVG colours; the
 * pin icon helper below uses them directly.
 */
export type PinTone = 'azure' | 'aqua' | 'iris' | 'gold' | 'neutral';

const TONE_COLOR: Record<PinTone, string> = {
  azure: '#3b82f6',
  aqua:  '#22c7c2',
  iris:  '#8e73ff',
  gold:  '#f5b54a',
  neutral: '#94a3b8',
};

export function pinColor(tone: PinTone = 'azure'): string {
  return TONE_COLOR[tone];
}

interface MarkerProps {
  position: [number, number];
  tone?: PinTone;
  label?: string;
}

/**
 * Drop-in `<Marker>` with a MECHIST pin icon. Reads react-leaflet from
 * the MapView context, so it renders in the same paint as the map and
 * does not initiate its own dynamic import.
 */
export function Marker({ position, tone = 'azure', label }: MarkerProps) {
  const Mod = useReactLeaflet();
  const icon = useMemo(() => makeDivIcon(TONE_COLOR[tone], label), [tone, label]);
  if (!Mod) return null;
  return <Mod.Marker position={position} icon={icon} />;
}

interface PolylineProps {
  positions: Array<[number, number]>;
  tone?: PinTone;
  weight?: number;
  dashArray?: string;
}

export function Polyline({ positions, tone = 'aqua', weight = 3, dashArray }: PolylineProps) {
  const Mod = useReactLeaflet();
  if (!Mod) return null;
  return (
    <Mod.Polyline
      positions={positions}
      pathOptions={{ color: TONE_COLOR[tone], weight, dashArray, opacity: 0.9 }}
    />
  );
}

interface AutoFitBoundsProps {
  points: Array<[number, number]>;
  padding?: [number, number];
}

/**
 * Adjusts the visible map bounds to fit the supplied points. Place inside
 * a `<MapContainer>`; recomputes when `points` changes.
 */
export function AutoFitBounds({ points, padding = [40, 40] }: AutoFitBoundsProps) {
  const map = useLeafletMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15), { animate: true });
      return;
    }
    let bounds: import('leaflet').LatLngBounds | null = null;
    for (const p of points) {
      bounds = bounds ? bounds.extend(p) : L.latLngBounds(p, p);
    }
    if (bounds) map.fitBounds(bounds, { padding });
  }, [map, points, padding]);
  return null;
}

interface RecenterButtonProps {
  center: [number, number];
  zoom?: number;
}

/**
 * Floating "Recenter" button rendered inside the map container. Place
 * inside `<MapView>`; uses react-leaflet's `useMap` to read the map
 * instance and reset it on click.
 */
export function RecenterButton({ center, zoom = 14 }: RecenterButtonProps) {
  const map = useLeafletMap();
  return (
    <div className="absolute right-3 top-3 z-[400]">
      <button
        type="button"
        onClick={() => map.setView(center, zoom, { animate: true })}
        className="rounded-md border border-line bg-surface-1/95 px-3 py-1.5 text-xs font-medium text-fg-app shadow-card hover:bg-surface-2"
      >
        Recenter
      </button>
    </div>
  );
}

// --- helpers ------------------------------------------------------------

function makeDivIcon(color: string, label: string | undefined): DivIcon {
  return L.divIcon({
    html: `
      <div style="position:relative;transform:translate(-50%,-100%);">
        <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 24 14 24s14-14.5 14-24C28 6.27 21.73 0 14 0z" fill="${color}" />
          <circle cx="14" cy="14" r="5.5" fill="white" />
        </svg>
        ${label ? `<div style="position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:2px;padding:2px 6px;border-radius:6px;background:${color};color:white;font-size:10px;font-weight:600;white-space:nowrap;">${label}</div>` : ''}
      </div>
    `,
    className: 'mechist-divicon',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
  });
}
