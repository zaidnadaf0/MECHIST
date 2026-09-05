/**
 * MECHIST — Public Map at /map (no auth).
 * FACTS: importers App.tsx->MapPage (/map route), callers TopNav/NearbyCTA,
 * API watchPublicMechanics + ProviderMap + useGeolocation/useWatchPosition + distanceKm,
 * schema PublicMechanic{id,name,baseLat,baseLng,specialties,isAvailable},
 * verbatim "MECHIST — IMPROVE LOCATION DISCOVERY UX ... Make location discovery obvious ... Find Mechanics Near Me -> /map ... Do NOT request GPS automatically on the landing page ... Use My Location / Track My Location via existing useGeolocation/useWatchPosition ... Do NOT continuously track unless user explicitly enables it"
 * Explicit discovery: no auto GPS, prominent Use My Location, Track toggle, 8 states.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Map as MapIcon, MapPin, Navigation, Radio, Wrench, Crosshair, List, LocateFixed } from 'lucide-react';
import { Badge, Button, Card, SectionHeading } from '@/components/ui';
import { EmptyState, ErrorState, ErrorBoundary, Skeleton } from '@/components/feedback';
import { FadeIn, ScrollRevealSection } from '@/components/motion';
import { ProviderMap } from '@/components/map/ProviderMap';
import { toMapMarkers } from '@/lib/geoapify';
import { useGeolocation, useWatchPosition, type GeoState } from '@/lib/geolocation';
import { distanceKm, type LatLng } from '@/lib/geo';
import { problemCompatibility, type ProblemCategory } from '@/lib/nearby';
import { firebaseConfigured } from '@/app/firebase';
import { watchPublicMechanics, type PublicMechanic } from '@/lib/public';

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 11;
const LOCATED_ZOOM = 12;
type Filter = 'all' | ProblemCategory;

function statusMessage(s: GeoState['status'], err: string | null): string | null {
  if (s === 'requesting') return 'Finding your location...';
  if (s === 'granted') return 'Location found';
  if (s === 'denied') return 'Location permission was denied. Enable location permission in your browser or choose another option.';
  if (s === 'unavailable') return 'Your location is currently unavailable.';
  if (s === 'error') {
    const m = (err ?? '').toLowerCase();
    if (m.includes('timeout') || m.includes('timed out')) return 'Location request timed out. Try again.';
    return err ? err : 'Could not determine your location. Try again.';
  }
  return null;
}

function MapPageInner() {
  const navigate = useNavigate();
  const [roster, setRoster] = useState<PublicMechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [tracking, setTracking] = useState(false);

  const [geo, requestGeo] = useGeolocation();
  const [watchGeo] = useWatchPosition({ enabled: tracking, minDistanceM: 25, minIntervalMs: 5000 });

  const effective: GeoState = useMemo(() => {
    if (!tracking) return geo;
    if (watchGeo.coords) return watchGeo;
    if (geo.coords && watchGeo.status === 'requesting') return { status: 'requesting', coords: geo.coords, error: null };
    if (watchGeo.status === 'idle' && geo.coords) return geo;
    return watchGeo;
  }, [tracking, geo, watchGeo]);

  const origin = useMemo<LatLng | null>(() => (effective.coords ? { lat: effective.coords.lat, lng: effective.coords.lng } : null), [effective.coords]);

  useEffect(() => {
    if (!firebaseConfigured) { setLoading(false); setError('MECHIST is not yet connected to its backend. Check back soon.'); return; }
    const unsub = watchPublicMechanics(200, (items) => { setRoster(items); setLoading(false); });
    return () => { if (unsub) unsub(); };
  }, []);

  const filtered = useMemo(() => {
    return roster
      .filter((m) => category === 'all' || problemCompatibility(category, m.specialties))
      .map((m) => ({ m, dist: origin && m.baseLat != null && m.baseLng != null ? distanceKm(origin, { lat: m.baseLat, lng: m.baseLng }) : null }))
      .sort((a, b) => {
        if (a.dist != null && b.dist != null) return a.dist - b.dist;
        return a.m.name.localeCompare(b.m.name);
      });
  }, [roster, origin, category]);

  const markers = useMemo(() => toMapMarkers(filtered.map((f) => f.m)), [filtered]);
  const selected = useMemo(() => (selectedId ? filtered.find((f) => f.m.id === selectedId)?.m ?? null : null), [selectedId, filtered]);
  const center: [number, number] = useMemo(() => {
    if (selected?.baseLat != null && selected?.baseLng != null) return [selected.baseLat, selected.baseLng];
    if (origin) return [origin.lat, origin.lng];
    return DEFAULT_CENTER;
  }, [selected, origin]);
  const zoom = selected ? 14 : origin ? LOCATED_ZOOM : DEFAULT_ZOOM;
  const hasMarkers = markers.length > 0;
  const hasRoster = roster.length > 0;
  const locating = effective.status === 'requesting';
  const msg = statusMessage(effective.status, effective.error);
  const isDenied = effective.status === 'denied';
  const isError = effective.status === 'error' || effective.status === 'unavailable';

  return (
    <ScrollRevealSection as="section" className="container section">
      <SectionHeading
        as="h1" size="lg" hue="aqua"
        eyebrow={<span className="inline-flex items-center gap-2"><MapIcon size={13} className="text-aqua-400" /> Live Map · Geoapify / OSM</span>}
        title="Find Mechanics Near You"
        description="Open the map, tap Use My Location once, and see available mechanics sorted by straight-line distance. No account required to explore — your location is requested only when you choose it."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={origin ? 'success' : 'neutral'} dot={Boolean(origin)} live={Boolean(origin)}>{origin ? 'located' : 'location off'}</Badge>
            <Link to="/mechanics" className="inline-flex items-center gap-1.5 rounded-lg border border-line-soft bg-surface-2 px-3 py-1.5 text-small text-fg-muted hover:text-fg-app hover:border-line-strong transition-colors"><List size={14} /> Directory</Link>
          </div>
        }
      />

      <FadeIn className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-line-soft bg-surface-2/70 p-1.5 backdrop-blur-sm">
          {(['all', 'flat-tyre', 'battery', 'engine', 'tow', 'other'] as const).map((c) => {
            const on = category === c;
            const label = c === 'all' ? 'All' : c === 'flat-tyre' ? 'Tyres' : c === 'battery' ? 'Battery' : c === 'engine' ? 'Engine' : c === 'tow' ? 'Tow' : 'Other';
            return <button key={c} type="button" onClick={() => { setCategory(c); setSelectedId(null); }} className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${on ? 'bg-azure-500 text-white font-semibold shadow-sm' : 'text-fg-muted hover:text-fg-app hover:bg-surface-app/60'}`}>{label}</button>;
          })}
        </div>
        <Button variant={origin ? 'secondary' : 'primary'} size="sm" leftIcon={<LocateFixed size={14} />} loading={locating} onClick={() => requestGeo()} aria-label="Use my location">Use My Location</Button>
        {origin && <Button variant="secondary" size="sm" leftIcon={<Crosshair size={14} />} onClick={() => setSelectedId(null)}>Recenter</Button>}
        <Button variant={tracking ? 'live' : 'ghost'} size="sm" leftIcon={<Navigation size={14} />} onClick={() => setTracking((v) => !v)} aria-pressed={tracking} aria-label={tracking ? 'Stop tracking my location' : 'Track my location'}>{tracking ? 'Tracking on' : 'Track My Location'}</Button>
        <Button variant="ghost" size="sm" onClick={() => setListOpen((v) => !v)}>{listOpen ? 'Hide list' : 'Show list'} ({filtered.length})</Button>
        {selected && <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>Clear selection</Button>}
      </FadeIn>

      {msg && (
        <div className={`mt-3 rounded-xl border px-4 py-3 text-small ${isDenied || isError ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200' : locating ? 'border-line-soft bg-surface-2/60 text-fg-muted' : 'border-success-500/30 bg-success-500/10 text-success-700 dark:text-success-300'}`} role="status" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            {locating && <span aria-hidden className="h-3.5 w-3.5 rounded-full border-2 border-aqua-400 border-t-transparent animate-spin" />}
            {isDenied && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
            {!locating && !isDenied && !isError && origin && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success-500" />}
            <span>{msg}</span>
            {(isDenied || isError) && <Button variant="ghost" size="sm" onClick={() => requestGeo()} className="ml-1">Try again</Button>}
          </div>
          {isDenied && <p className="mt-1 text-xs opacity-80">Enable location permission in your browser or continue browsing the Bengaluru overview.</p>}
          {tracking && origin && <p className="mt-1 text-xs opacity-80">Tracking updates as you move (25 m / 5 s throttle). Turn off to stop.</p>}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card className="p-0 overflow-hidden">
            {error ? (
              <div className="w-full">
                <ProviderMap center={center} zoom={zoom} className="aspect-[16/11] w-full" userPosition={origin ? [origin.lat, origin.lng] : null} userLabel="You are here" mechanicMarkers={markers} />
                <div className="border-t border-line-soft p-6"><ErrorState kind="firebase" title="Connection issue" description={error} /></div>
              </div>
            ) : hasMarkers ? (
              <ProviderMap center={center} zoom={zoom} className="aspect-[16/11] w-full" userPosition={origin ? [origin.lat, origin.lng] : null} userLabel="You are here" mechanicMarkers={markers} />
            ) : loading ? (
              <div className="relative aspect-[16/11] w-full overflow-hidden">
                <ProviderMap center={center} zoom={zoom} className="absolute inset-0 w-full h-full" userPosition={origin ? [origin.lat, origin.lng] : null} userLabel="You are here" mechanicMarkers={[]} />
                <div className="absolute inset-0 grid place-items-center bg-surface-1/55 backdrop-blur-[2px]">
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-line-soft bg-surface-1 px-6 py-5 shadow-card">
                    <span aria-hidden className="h-8 w-8 rounded-full border-2 border-aqua-400 border-t-transparent animate-spin" />
                    <span className="text-small text-fg-muted">Loading mechanics...</span>
                    <span className="sr-only">Loading nearby mechanics from the network.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <ProviderMap center={center} zoom={zoom} className="aspect-[16/11] w-full" userPosition={origin ? [origin.lat, origin.lng] : null} userLabel="You are here" mechanicMarkers={[]} />
                <div className="border-t border-line-soft bg-surface-2/40 p-6"><EmptyState compact kind="mechanics" title={hasRoster ? 'No mechanics match this filter' : 'No nearby mechanics found'} description={hasRoster ? 'Try a different category or clear the filter.' : 'No nearby mechanics found. Try a wider area or request roadside assistance — availability changes throughout the day.'} ctaLabel={hasRoster ? 'Show all' : 'Request assistance'} onAction={() => hasRoster ? setCategory('all') : navigate('/request')} /></div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft bg-surface-2/60 px-3 py-2 text-[11px] font-mono text-fg-subtle">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${origin ? 'bg-aqua-500' : 'bg-line-soft'}`} />{origin ? `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}` : 'location off — Bengaluru overview'}<span className="hidden sm:inline"> · {filtered.length} in view</span>{tracking && origin && <span className="hidden sm:inline"> · tracking</span>}</span>
              <span className="inline-flex items-center gap-1"><Navigation size={14} strokeWidth={2} /> Geoapify to OSM fallback · straight-line distance</span>
            </div>
          </Card>
          <p className="mt-3 text-xs text-fg-subtle">Tiles: <span className="text-fg-muted">Geoapify</span> when <code className="rounded bg-surface-2 px-1 py-0.5">VITE_GEOAPIFY_API_KEY</code> is set, otherwise <span className="text-fg-muted">OpenStreetMap</span>. Pins reuse the directory data — no duplicate fetch. Recenter keeps the same map instance; tracking is off until you enable it.</p>
        </div>
        <div className="lg:col-span-4">
          {listOpen && (
            <Card className="flex max-h-[520px] flex-col p-0">
              <div className="flex items-center justify-between border-b border-line-soft px-4 py-3"><div className="flex items-center gap-2 text-small font-medium text-fg-app"><Radio size={14} className="text-aqua-400" />{loading ? 'Loading mechanics...' : `${filtered.length} mechanics`}</div><Badge tone="neutral" size="sm">{category === 'all' ? 'all specialties' : category}</Badge></div>
              <div className="flex-1 overflow-auto">
                {loading ? <div className="grid gap-2 p-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div> : filtered.length === 0 ? <div className="p-6"><p className="text-small text-fg-muted">No mechanics found nearby. Try a wider area or request roadside assistance.</p></div> : (
                  <ul className="divide-y divide-line-soft">
                    {filtered.map(({ m, dist }) => {
                      const on = m.id === selectedId;
                      return (
                        <li key={m.id}><button type="button" onClick={() => setSelectedId(m.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 ${on ? 'bg-azure-500/10' : ''}`}><span className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] font-bold ${on ? 'border-aqua-400 bg-azure-600 text-white' : 'border-line-soft bg-surface-2 text-fg-muted'}`}><Wrench size={14} strokeWidth={2} /></span><span className="min-w-0 flex-1"><span className="block truncate text-small font-medium text-fg-app">{m.name}</span><span className="block truncate text-xs text-fg-muted">{(m.specialties ?? []).slice(0, 2).join(' · ') || 'General'}{m.garageName ? ` · ${m.garageName}` : ''}</span></span><span className="shrink-0 text-right">{dist != null ? <span className="flex items-center gap-1 text-xs font-mono text-fg-muted"><MapPin size={14} strokeWidth={2} className="text-aqua-400" />{dist.toFixed(1)} km</span> : <span className="text-xs text-fg-subtle">— km</span>}<span className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${m.isAvailable ? 'bg-success-500/15 text-success-700 dark:text-success-300' : 'bg-surface-2 text-fg-subtle'}`}>{m.isAvailable ? 'available' : 'on job'}</span></span></button></li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="border-t border-line-soft p-3">{selected ? <div className="flex flex-col gap-2"><div className="text-small font-medium text-fg-app">{selected.name}</div><div className="flex gap-2"><Link to="/request" className="inline-flex flex-1 items-center justify-center rounded-lg bg-azure-600 px-3 py-2 text-small font-medium text-white hover:bg-azure-700 transition-colors">Request this mechanic</Link><Button variant="secondary" size="sm" onClick={() => setSelectedId(null)}>Clear</Button></div></div> : <p className="text-xs text-fg-subtle">Tap a mechanic to focus the map, then request help. Use My Location to sort by distance.</p>}</div>
            </Card>
          )}
        </div>
      </div>
    </ScrollRevealSection>
  );
}
export function MapPage() { return <ErrorBoundary label="Map"><MapPageInner /></ErrorBoundary>; }
export default MapPage;
