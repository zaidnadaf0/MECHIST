/**
 * Customer dashboard — operations-style home.
 *
 * Sections: greeting → SOS hero → active request → services →
 * stats → mechanics near you → vehicles → recent activity.
 * Every number comes from Firestore (vehicles, history, public roster)
 * or the service catalogue; distances appear only after the customer
 * taps "Use my location". No fabricated proximity, payouts, or counts.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bike, Car, Clock, History, MapPin, Star, Truck, Wrench, XCircle, Zap,
} from 'lucide-react';
import {
  Avatar, Badge, Button, Card, IconTile, Modal, OpsStatCard, SectionHeading, SectionShell, StatusPill, Textarea,
} from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { db } from '@/app/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  listVehiclesDetailed, listHistoryDetailed, cancelRequest, CANCELLABLE_STATUSES,
  type Vehicle, type ServiceRequest,
} from '@/lib/customer';
import { SERVICES, serviceCategoryFor } from '@/lib/services';
import { watchPublicMechanics } from '@/lib/public';
import type { MechanicProfile } from '@/lib/mechanic';
import { nearbyMechanics, problemCompatibility, DISPATCH_RADIUS_KM } from '@/lib/nearby';
import { useGeolocation } from '@/lib/geolocation';
import { money } from '@/lib/format';
import { useToast } from '@/components/ui';

const TERMINAL: ReadonlyArray<ServiceRequest['status']> = ['completed', 'cancelled'];

function greetingFor(hour: number): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Up late';
}

function vehicleIcon(type: Vehicle['type']) {
  switch (type) {
    case 'bike':  return <Bike className="h-5 w-5" />;
    case 'van':   return <Truck className="h-5 w-5" />;
    case 'truck': return <Truck className="h-5 w-5" />;
    case 'car':
    default:      return <Car className="h-5 w-5" />;
  }
}

function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}

function formatWhen(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

export function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [history, setHistory] = useState<ServiceRequest[] | null>(null);
  const [roster, setRoster] = useState<MechanicProfile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [geo, requestGeo] = useGeolocation();

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;

    (async () => {
      try {
        const handle = db();
        if (handle) {
          const snap = await getDoc(doc(handle, 'users', user.uid));
          if (!cancelled && snap.exists()) {
            const data = snap.data() as { fullName?: string };
            setDisplayName(data.fullName ?? null);
          }
        }
      } catch {
        /* graceful degrade — greeting falls back to the email handle */
      }
    })();

    Promise.all([listVehiclesDetailed(user.uid), listHistoryDetailed(user.uid, 50)]).then(([v, h]) => {
      if (cancelled) return;
      const err = v.error ?? h.error;
      if (err) {
        console.warn('[CustomerDashboard] load failed:', err);
        setLoadError(err.message);
        return;
      }
      setVehicles(v.data ?? []);
      setHistory(h.data ?? []);
    });
    const unsub = watchPublicMechanics(200, setRoster, () => setRoster([]));
    return () => { cancelled = true; unsub?.(); };
  }, [user, navigate]);

  const greeting = useMemo(() => greetingFor(new Date().getHours()), []);
  const firstName = useMemo(() => {
    if (displayName && displayName.trim()) return displayName.trim().split(/\s+/)[0] ?? null;
    if (user?.email) return user.email.split('@')[0] ?? null;
    return null;
  }, [displayName, user?.email]);

  const completed = useMemo(() => (history ?? []).filter((r) => r.status === 'completed'), [history]);
  const paid = useMemo(() => completed.filter((r) => typeof r.amountCents === 'number'), [completed]);
  const totalSpent = useMemo(() => paid.reduce((s, r) => s + (r.amountCents ?? 0), 0) / 100, [paid]);
  const timed = useMemo(() => completed.filter((r) => typeof r.durationMin === 'number'), [completed]);
  const avgDuration = useMemo(
    () => (timed.length ? Math.round(timed.reduce((s, r) => s + (r.durationMin ?? 0), 0) / timed.length) : null),
    [timed],
  );
  const defaultVehicle = useMemo(
    () => vehicles?.find((v) => v.isDefault) ?? vehicles?.[0] ?? null,
    [vehicles],
  );

  const nearby = useMemo(() => {
    if (!roster) return null;
    if (geo.coords) {
      return nearbyMechanics(
        { lat: geo.coords.lat, lng: geo.coords.lng },
        undefined,
        roster,
        { radiusKm: DISPATCH_RADIUS_KM },
      ).slice(0, 3);
    }
    return roster
      .slice()
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 3)
      .map((mechanic) => ({ mechanic, distanceKm: null as number | null, etaMin: null as number | null }));
  }, [roster, geo.coords]);

  const serviceCounts = useMemo(() => {
    if (!roster) return null;
    const out = new Map<string, number>();
    for (const s of SERVICES) {
      out.set(s.id, roster.filter((m) => problemCompatibility(serviceCategoryFor(s.id), m.specialties)).length);
    }
    return out;
  }, [roster]);

  if (!user) return null;

  const active = history?.find((r) => !TERMINAL.includes(r.status)) ?? null;
  const recent = (history ?? []).filter((r) => TERMINAL.includes(r.status)).slice(0, 3);
  const activeVehicle = vehicles?.find((v) => v.id === active?.vehicleId);
  const canCancel = active != null && (CANCELLABLE_STATUSES as readonly string[]).includes(active.status);

  const handleCancel = async () => {
    if (!active || !user || cancellingId) return;
    setCancellingId(active.id);
    try {
      const result = await cancelRequest(active.id, user.uid, cancelReason || undefined);
      if (result === 'cancelled') {
        toast.push({ title: 'Request cancelled', tone: 'success' });
        setCancelOpen(false);
        setCancelReason('');
        navigate('/history', { replace: true });
      } else if (result === 'too_late') {
        toast.push({ title: 'Too late to cancel', description: 'This request is already completed or cancelled.', tone: 'info' });
      } else if (result === 'forbidden') {
        toast.push({ title: 'Not allowed', description: 'You can only cancel your own requests.', tone: 'danger' });
      } else {
        toast.push({ title: 'Could not cancel', description: 'Please check your connection and try again.', tone: 'danger' });
      }
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-8">

        {/* ---------- Greeting ---------- */}
        <FadeIn>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="display text-display-md text-fg-app text-balance">
                Hi, {firstName ?? 'there'}
              </h1>
              <p className="mt-1 text-small text-fg-muted">
                {defaultVehicle
                  ? `${defaultVehicle.year} ${defaultVehicle.make} ${defaultVehicle.model} · ${defaultVehicle.plate}`
                  : 'Add a vehicle to get roadside help in one tap.'}
              </p>
            </div>
            <span className="text-small text-fg-subtle">{greeting}.</span>
          </div>
        </FadeIn>

        {loadError && (
          <ErrorState
            kind="api"
            title="Could not load your dashboard"
            description={loadError}
            retryLabel="Retry"
            onRetry={() => location.reload()}
          />
        )}

        {/* ---------- SOS hero ---------- */}
        <FadeIn>
          <div className="rounded-2xl border border-danger-500/25 bg-danger-500/[0.07] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="min-w-0 flex-1">
                <div className="eyebrow text-danger-500">Emergency assistance</div>
                <h2 className="mt-2 display text-h1 text-fg-app text-balance">Broken down right now?</h2>
                <p className="mt-2 max-w-prose text-small text-fg-muted text-pretty">
                  Start a real request — your live location goes to verified mechanics in range,
                  and dispatch assigns the closest match. For immediate danger, call 112 first.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="danger" size="md" onClick={() => navigate('/request')}>
                    Request emergency help
                  </Button>
                  <a href="tel:112">
                    <Button variant="secondary" size="md">Call 112</Button>
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/request')}
                aria-label="SOS — start an emergency request now"
                className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-danger-500 text-white shadow-[0_0_36px_-6px_rgb(239_68_68/0.65)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app"
              >
                <span className="flex flex-col items-center leading-none">
                  <Zap size={26} aria-hidden fill="currentColor" />
                  <span className="mt-1 font-mono text-small font-bold tracking-widest">SOS</span>
                </span>
              </button>
            </div>
          </div>
        </FadeIn>

        {/* ---------- Active request ---------- */}
        {active ? (
          <FadeIn>
            <Card tone="azure" elevated>
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="eyebrow text-azure-600 dark:text-azure-300">Service {shortId(active.id)}</span>
                    <h3 className="display text-h2 text-fg-app text-balance">
                      {active.mechanicName ? `${active.mechanicName} is on this` : 'We are finding you a mechanic'}
                    </h3>
                    <p className="max-w-prose text-small text-fg-muted text-pretty line-clamp-2">
                      {active.problemText}
                    </p>
                  </div>
                  <StatusPill status={active.status} size="lg" active />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-line-soft bg-surface-1 p-3">
                    <span className="eyebrow">ETA</span>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="stat-num text-h2 text-fg-app">
                        {active.etaMin != null ? active.etaMin : '—'}
                      </span>
                      <span className="text-small text-fg-muted">min</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-line-soft bg-surface-1 p-3">
                    <span className="eyebrow">Started</span>
                    <div className="mt-1.5 flex items-center gap-2 text-small text-fg-app">
                      <Clock className="h-3.5 w-3.5 text-fg-muted" />
                      {formatWhen(active.createdAt)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-line-soft bg-surface-1 p-3">
                    <span className="eyebrow">Vehicle</span>
                    <div className="mt-1.5 flex items-center gap-2 text-small text-fg-app">
                      <Car className="h-3.5 w-3.5 text-fg-muted" />
                      {activeVehicle ? `${activeVehicle.make} ${activeVehicle.model}`.trim() : '—'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="md"
                      leftIcon={<XCircle className="h-4 w-4" />}
                      loading={cancellingId === active.id}
                      disabled={cancellingId !== null}
                      onClick={() => { setCancelReason(''); setCancelOpen(true); }}
                    >
                      Cancel request
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="md"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                    onClick={() => navigate(`/track/${active.id}`)}
                  >
                    Track service
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => navigate('/history')}
                  >
                    All history
                  </Button>
                </div>
              </div>
            </Card>
          </FadeIn>
        ) : null}

        {/* ---------- Services ---------- */}
        <section aria-labelledby="dash-services">
          <div className="flex items-end justify-between gap-3">
            <h2 id="dash-services" className="display text-h2 text-fg-app">What do you need?</h2>
            <Link to="/services" className="text-small text-azure-600 dark:text-azure-300 hover:underline">See all</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/request?service=${s.id}`)}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-line-soft bg-surface-1 px-3 py-6 text-center transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure-400"
              >
                <IconTile icon={<span className="text-lg font-bold">{s.name.slice(0, 1)}</span>} hue="azure" size="md" />
                <span className="text-small font-medium text-fg-app">{s.name}</span>
                <span className="text-xs text-fg-subtle">from {money(s.basePriceInr)}</span>
                <span className="text-[11px] text-fg-subtle" aria-live="polite">
                  {serviceCounts === null
                    ? '…'
                    : (() => {
                      const n = serviceCounts.get(s.id) ?? 0;
                      return n === 0 ? 'none available now' : `${n} available`;
                    })()}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ---------- Stats ---------- */}
        <section aria-label="Your totals">
          {history === null || vehicles === null ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <OpsStatCard
                icon={<History size={18} />} label="Call-outs" tone="azure"
                value={completed.length} sub="lifetime"
              />
              <OpsStatCard
                icon={<span className="font-mono text-body font-bold">₹</span>} label="Total spent" tone="green"
                value={money(totalSpent)}
                sub={paid.length === 0 ? 'no recorded amounts yet' : `${money(totalSpent / paid.length)} average`}
              />
              <OpsStatCard
                icon={<Clock size={18} />} label="Avg. job time" tone="gold"
                value={avgDuration != null ? `${avgDuration} min` : '—'}
                sub={timed.length === 0 ? 'no timed jobs yet' : `across ${timed.length} timed jobs`}
              />
              <OpsStatCard
                icon={<Car size={18} />} label="Saved vehicles" tone="neutral"
                value={vehicles.length}
                sub={defaultVehicle ? `${defaultVehicle.plate} default` : 'add your first vehicle'}
              />
            </div>
          )}
        </section>

        {/* ---------- Mechanics near you ---------- */}
        <section aria-labelledby="dash-nearby">
          <div className="flex items-end justify-between gap-3">
            <h2 id="dash-nearby" className="display text-h2 text-fg-app">Mechanics near you</h2>
            <Link to="/mechanics" className="text-small text-azure-600 dark:text-azure-300 hover:underline">View all</Link>
          </div>
          <div className="mt-4">
            {nearby === null ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : nearby.length === 0 ? (
              <EmptyState
                compact kind="mechanics"
                title="No mechanics online right now"
                description="Availability changes through the day — or browse the full directory."
                ctaLabel="Open directory" onAction={() => navigate('/mechanics')}
              />
            ) : (
              <>
                {!geo.coords && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                    <MapPin size={14} aria-hidden />
                    <span>Sorted by rating — share your location for live distances and ETAs.</span>
                    <Button variant="ghost" size="sm" onClick={requestGeo} loading={geo.status === 'requesting'}>
                      Use my location
                    </Button>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {nearby.map(({ mechanic: m, distanceKm, etaMin }) => (
                    <Card key={m.id} className="flex h-full flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <span className="relative">
                          <Avatar name={m.name} size="md" />
                          <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-1 bg-success-500" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-body font-semibold text-fg-app">{m.name}</span>
                            {m.approved && <Badge tone="success" size="sm" dot>Verified</Badge>}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-fg-muted">
                            {(m.specialties ?? []).slice(0, 3).join(' · ') || 'General mechanic'}
                          </div>
                        </div>
                        {typeof m.rating === 'number' && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-400/15 px-2 py-0.5 font-mono text-xs font-bold text-gold-600 dark:text-gold-300">
                            <Star size={12} aria-hidden fill="currentColor" />{m.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-fg-subtle">
                        {distanceKm != null && etaMin != null ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} aria-hidden />{distanceKm.toFixed(1)} km away · ETA {etaMin} min
                          </span>
                        ) : (
                          <span>distance on request</span>
                        )}
                        {typeof m.reviewCount === 'number' && <span>{m.reviewCount} reviews</span>}
                      </div>
                      <div className="mt-auto flex gap-2">
                        <Button variant="primary" size="sm" fullWidth onClick={() => navigate(`/request?mechanic=${m.id}`)}>
                          Request Help
                        </Button>
                        <Button variant="secondary" size="sm" aria-label={`View ${m.name}`} onClick={() => navigate(`/mechanics/${m.id}`)}>
                          <ArrowRight size={15} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ---------- Vehicles ---------- */}
        <section aria-labelledby="dash-vehicles">
          <SectionHeading
            as="h2"
            size="sm"
            eyebrow="Garage"
            title="Your vehicles"
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/vehicles')}>
                Manage
              </Button>
            }
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles === null
              ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : vehicles.length === 0
                ? (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <EmptyState compact kind="vehicles" onAction={() => navigate('/vehicles')} />
                  </div>
                )
                : vehicles.map((v) => (
                  <Card key={v.id} interactive onClick={() => navigate('/vehicles')}>
                    <div className="flex items-center gap-3">
                      <IconTile icon={vehicleIcon(v.type)} hue="azure" size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="text-body font-medium text-fg-app truncate">
                          {v.make} {v.model}
                        </div>
                        <div className="text-xs text-fg-muted">
                          {v.year} · {v.plate}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-fg-subtle" />
                    </div>
                  </Card>
                ))}
          </div>
        </section>

        {/* ---------- Recent activity ---------- */}
        <section aria-labelledby="dash-recent">
          <div className="flex items-end justify-between gap-3">
            <h2 id="dash-recent" className="display text-h2 text-fg-app">Recent activity</h2>
            <Link to="/history" className="text-small text-azure-600 dark:text-azure-300 hover:underline">Full history</Link>
          </div>
          <div className="mt-4">
            {history === null ? (
              <Skeleton className="h-24" />
            ) : recent.length === 0 ? (
              <EmptyState compact kind="history" />
            ) : (
              <div className="grid gap-3">
                {recent.map((r) => (
                  <Card key={r.id} interactive onClick={() => navigate(`/history/${r.id}`)}>
                    <div className="flex items-center gap-3">
                      <IconTile icon={<Wrench className="h-5 w-5" />} hue={r.status === 'completed' ? 'gold' : 'iris'} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body font-medium text-fg-app">
                          {r.problemCategory ?? 'Service'} · {shortId(r.id)}
                        </div>
                        <div className="truncate text-xs text-fg-muted">
                          {r.mechanicName ?? 'Awaiting mechanic'} · {formatWhen(r.createdAt)}
                        </div>
                      </div>
                      {r.amountCents != null && (
                        <span className="stat-num shrink-0 text-body font-bold text-fg-app">{money(r.amountCents / 100)}</span>
                      )}
                      <StatusPill status={r.status} size="sm" />
                      <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-fg-subtle">
          Need help? Open a request and a verified mechanic will be on the way.{' '}
          <Link to="/request" className="link-quiet">Get help now →</Link>
        </p>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => { if (!cancellingId) setCancelOpen(false); }}
        title="Cancel this request?"
        description="This writes the cancellation to Firestore and notifies the mechanic. This can't be undone."
        footer={
          <>
            <Button variant="secondary" disabled={cancellingId !== null} onClick={() => setCancelOpen(false)}>Keep request</Button>
            <Button variant="primary" loading={cancellingId !== null} onClick={handleCancel}>Confirm cancellation</Button>
          </>
        }
      >
        <Textarea
          label="Reason (optional)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="e.g. Managed on my own, wrong location, duplicate request…"
        />
      </Modal>
    </SectionShell>
  );
}
