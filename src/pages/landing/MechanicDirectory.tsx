import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  Card,
  Counter,
  SectionHeading,
} from '@/components/ui';
import { EmptyState, ErrorState, ErrorBoundary, Skeleton } from '@/components/feedback';
import { FadeIn, ScrollRevealSection } from '@/components/motion';
import { firebaseConfigured } from '@/app/firebase';
import { watchPublicMechanics, type PublicMechanic } from '@/lib/public';
import { distanceKm, type LatLng } from '@/lib/geo';
import { problemCompatibility, type ProblemCategory } from '@/lib/nearby';
import { useGeolocation } from '@/lib/geolocation';
import { MapPin, Radio, Star, Wrench } from 'lucide-react';

/**
 * Public-facing mechanic directory at `/mechanics`.
 *
 * The roster is filtered to mechanics the customer is allowed to dispatch:
 *   - `approved === true`     (verified by an admin)
 *   - `isAvailable === true`  (currently accepting jobs)
 *
 * If the visitor grants geolocation, we sort by distance; otherwise we
 * fall back to a name ordering. The page does not require sign-in.
 */
function MechanicDirectoryInner() {
  const [roster, setRoster] = useState<PublicMechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<'all' | ProblemCategory>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      setError('MECHIST is not yet connected to its backend. Check back soon.');
      return;
    }
    const unsub = watchPublicMechanics(100, (items) => {
      setRoster(items);
      setLoading(false);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Try to grab the visitor's geolocation via the shared hook. Failure
  // is silent and degrades gracefully to name ordering — the directory is
  // still useful. We prompt once on mount; if the visitor denies, the
  // "Location unknown" copy explains the fallback. The hook is null-safe
  // for SSR.
  const [geo, requestGeo] = useGeolocation();
  const origin = useMemo<LatLng | null>(
    () => (geo.coords ? { lat: geo.coords.lat, lng: geo.coords.lng } : null),
    [geo.coords],
  );
  useEffect(() => { requestGeo(); }, [requestGeo]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    roster.forEach((m) => (m.specialties ?? []).forEach((s) => set.add(s.toLowerCase())));
    return Array.from(set).sort();
  }, [roster]);

  const filtered = useMemo(() => {
    return roster
      .filter((m) => category === 'all' || problemCompatibility(category, m.specialties))
      .map((m) => ({
        m,
        distanceKm: origin && m.baseLat != null && m.baseLng != null
          ? distanceKm(origin, { lat: m.baseLat, lng: m.baseLng })
          : null,
      }))
      .sort((a, b) => {
        if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
        return a.m.name.localeCompare(b.m.name);
      });
  }, [roster, origin, category]);

  return (
    <ScrollRevealSection as="section" className="container section">
      <SectionHeading
        as="h1"
        size="lg"
        hue="aqua"
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Radio size={13} className="text-aqua-400 animate-pulse" /> Public Roster · Real-Time
          </span>
        }
        title="Mechanics ready to roll."
        description="Vetted, background-checked, and currently accepting jobs. Browse the public network — no account required."
        actions={
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-line-soft bg-surface-2 px-3.5 py-1.5 text-small text-fg-muted hover:text-fg-app hover:border-line-strong transition-colors"
          >
            ← Back to home
          </Link>
        }
      />

      {/* Stat band */}
      <FadeIn className="mt-10">
        <Card>
          <div className="grid divide-y divide-line-soft sm:grid-cols-3 sm:divide-y-0 sm:divide-x sm:divide-line-soft">
            <Stat n={roster.length} label="mechanics available" sub="approved + online" />
            <Stat
              n={origin ? Math.round(origin.lat * 100) / 100 : 0}
              label="your latitude"
              sub={origin ? 'distance sorting on' : 'location unknown — sorted by name'}
            />
            <Stat n={categories.length} label="specialty tags" sub="tyre · battery · tow · engine · general" />
          </div>
        </Card>
      </FadeIn>

      {/* Category filter — only render when there's a roster to filter */}
      {!loading && roster.length > 0 && (
        <FadeIn className="mt-8">
          <div className="flex flex-wrap gap-2 p-1.5 rounded-xl border border-line-soft bg-surface-2/70 backdrop-blur-sm w-fit">
            {(['all', 'flat-tyre', 'battery', 'engine', 'tow', 'other'] as const).map((c) => {
              const isActive = category === c;
              const label =
                c === 'all' ? 'All specialties' :
                c === 'flat-tyre' ? 'Tyres' :
                c === 'battery' ? 'Battery / EV' :
                c === 'engine' ? 'Engine' :
                c === 'tow' ? 'Tow / Recovery' : 'Other';
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                    isActive
                      ? 'bg-azure-500 text-white font-semibold shadow-sm'
                      : 'text-fg-muted hover:text-fg-app hover:bg-surface-app/60'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </FadeIn>
      )}

      {/* Body */}
      <div className="mt-10">
        {loading ? (
          <SkeletonGrid />
        ) : error ? (
          <ErrorState kind="firebase" title="Connection issue" description={error} />
        ) : roster.length === 0 ? (
          <EmptyState
            kind="mechanics"
            title="No mechanics online right now"
            description="Availability changes throughout the day. Check back in a few minutes, or sign up to be the first to join the network."
            ctaLabel="Become a mechanic"
            onAction={() => { navigate('/signup/mechanic'); }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            kind="filtered"
            title="No matches for this filter"
            description="Try All specialties or a different category."
            ctaLabel="Show all"
            onAction={() => setCategory('all')}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(({ m, distanceKm: dist }, i) => (
              <FadeIn key={m.id} delay={Math.min(i * 0.04, 0.4)}>
                <MechanicCard m={m} distanceKm={dist} />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </ScrollRevealSection>
  );
}

function Stat({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div className="px-5 py-6 md:px-6">
      <div className="eyebrow">{label}</div>
      <div className="stat-num mt-3 text-display-sm font-semibold text-fg-app tabular-nums">
        <Counter to={n} />
      </div>
      {sub && <div className="mt-1 text-small text-fg-subtle">{sub}</div>}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64" />
      ))}
    </div>
  );
}

function MechanicCard({ m, distanceKm: dist }: { m: PublicMechanic; distanceKm: number | null }) {
  const specialtyHeadline = (m.specialties ?? []).slice(0, 3).join(' · ') || 'General mechanic';
  const ctaTo = m.isAvailable ? '/request' : '#';
  const ctaLabel = m.isAvailable ? 'Request' : 'Busy';
  return (
    <Card className="h-full" tone={m.isAvailable ? 'aqua' : 'neutral'}>
      <div className="flex items-center justify-between border-b border-line-soft pb-3">
        <span className="font-mono text-[11px] font-bold tracking-widest text-aqua-400">
          UNIT · {m.id.slice(0, 4).toUpperCase()}
        </span>
        <Badge tone={m.isAvailable ? 'success' : 'neutral'} dot={m.isAvailable} live={m.isAvailable}>
          {m.isAvailable ? 'available' : 'on job'}
        </Badge>
      </div>

      <div className="mt-4">
        <h3 className="display text-h3 text-fg-app font-bold">{m.name}</h3>
        {m.garageName && <p className="mt-0.5 text-small text-fg-muted">{m.garageName}</p>}
        <p className="mt-3 text-small text-fg-muted">{specialtyHeadline}</p>
      </div>

      {(m.specialties ?? []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {m.specialties.slice(0, 4).map((s) => (
            <span
              key={s}
              className="font-mono text-[10px] text-fg-subtle bg-surface-2 px-2 py-0.5 rounded border border-line-soft/60"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-line-soft flex items-center justify-between text-xs font-mono">
        <div className="space-y-0.5">
          {dist != null ? (
            <div className="flex items-center gap-1 text-fg-subtle">
              <MapPin size={14} strokeWidth={2} className="text-aqua-400" />
              <span>{dist.toFixed(1)} km from you</span>
            </div>
          ) : m.garageAddress ? (
            <div className="flex items-center gap-1 text-fg-subtle">
              <MapPin size={14} strokeWidth={2} className="text-fg-subtle" />
              <span className="truncate max-w-[10rem]">{m.garageAddress}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-fg-subtle">
              <Wrench size={14} strokeWidth={2} className="text-fg-subtle" />
              <span>Mobile rig</span>
            </div>
          )}
          {typeof m.experienceYears === 'number' && (
            <div className="flex items-center gap-1 text-fg-muted">
              <Star size={14} strokeWidth={2} className="text-gold-400" />
              <span>{m.experienceYears}+ yrs experience</span>
            </div>
          )}
        </div>
        {m.isAvailable ? (
          <Link
            to={ctaTo}
            className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg text-small font-medium tracking-[-0.01em] bg-gradient-to-b from-azure-500 to-azure-600 text-white shadow-[0_1px_0_0_rgb(255_255_255/0.18)_inset,0_10px_24px_-12px_rgb(0_0_0/0.5)] hover:brightness-[1.07] hover:-translate-y-px transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app focus-visible:ring-azure-400"
          >
            {ctaLabel}
          </Link>
        ) : (
          <span className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg text-small font-medium bg-surface-2 text-fg-subtle border border-line-soft">
            {ctaLabel}
          </span>
        )}
      </div>
    </Card>
  );
}

export function MechanicDirectory() {
  return (
    <ErrorBoundary label="Mechanic directory">
      <MechanicDirectoryInner />
    </ErrorBoundary>
  );
}
