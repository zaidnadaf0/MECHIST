/**
 * Customer dashboard.
 *
 * Sections, top to bottom:
 *   1. Hero strip      — greeting + primary CTA, no fake metrics.
 *   2. Active request  — full-bleed StatusPill + ETA card, with a deep
 *                        link to the tracking page. Empty state if no
 *                        request is in flight.
 *   3. Your vehicles   — grid of IconTile + name/plate. Empty state
 *                        with a CTA into the vehicles manager.
 *   4. Quick actions   — 4 card-style links (request / mechanics /
 *                        history / vehicles) for repeat customers.
 *   5. Recent history  — last 3 services, status-pilled, deep-linked
 *                        back into tracking or history.
 *
 * All data is fetched via the customer lib; no logic lives here.
 * Role gating and auth redirects are owned by RequireAuth in App.tsx.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import {
  ArrowRight, Bike, Car, Clock, History, MapPin, Plus, Truck, Wrench, XCircle,
} from 'lucide-react';
import {
  Button, Card, IconTile, SectionHeading, SectionShell, StatusPill,
} from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { db } from '@/app/firebase';
import { listVehicles, listHistory, cancelRequest, CANCELLABLE_STATUSES, type Vehicle, type ServiceRequest } from '@/lib/customer';
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
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;

    // users/{uid} holds the canonical fullName — read it for the greeting.
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

    Promise.all([listVehicles(user.uid), listHistory(user.uid, 3)]).then(([v, h]) => {
      if (cancelled) return;
      setVehicles(v);
      setHistory(h);
    });
    return () => { cancelled = true; };
  }, [user, navigate]);

  const greeting = useMemo(() => greetingFor(new Date().getHours()), []);
  const firstName = useMemo(() => {
    if (displayName && displayName.trim()) return displayName.trim().split(/\s+/)[0] ?? null;
    if (user?.email) return user.email.split('@')[0] ?? null;
    return null;
  }, [displayName, user?.email]);

  if (!user) return null;

  const active = history?.find((r) => !TERMINAL.includes(r.status)) ?? null;
  const heroTitle = firstName ? `${greeting}, ${firstName}.` : `${greeting}.`;
  const recent = (history ?? []).filter((r) => TERMINAL.includes(r.status));
  const activeVehicle = vehicles?.find((v) => v.id === active?.vehicleId);

  const canCancel = active != null && (CANCELLABLE_STATUSES as readonly string[]).includes(active.status);

  const handleCancel = async () => {
    if (!active || !user) return;
    const confirmed = window.confirm(
      'Cancel this service request? The mechanic will be notified and the request will be closed.'
    );
    if (!confirmed) return;

    setCancellingId(active.id);
    try {
      const result = await cancelRequest(active.id, user.uid);
      if (result === 'cancelled') {
        toast.push({ title: 'Request cancelled', tone: 'success' });
        // The listener will update history; navigate to history to reflect the change
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
      <div className="container section-sm flex flex-col gap-10">

        {/* ---------- Hero ---------- */}
        <FadeIn>
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className="eyebrow">Customer dashboard</span>
                <h1 className="display text-display-md text-fg-app text-balance">
                  {heroTitle}
                </h1>
                <p className="max-w-prose text-body text-fg-muted text-pretty">
                  Request help, track a mechanic to your location, and keep an eye on your vehicles — all from one place.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate('/request')}
                >
                  Request assistance
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ---------- Active request ---------- */}
        <FadeIn>
          <section className="flex flex-col gap-4">
            <SectionHeading
              as="h2"
              size="sm"
              eyebrow="Live"
              title="Active request"
              description={active
                ? 'A mechanic is on this request. Tap through to follow the next step in real time.'
                : 'You have no active request right now. Need help? Send one in under a minute.'}
            />
            {active ? (
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
                        {activeVehicle
                          ? `${activeVehicle.make} ${activeVehicle.model}`.trim()
                          : '—'}
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
                        onClick={handleCancel}
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
            ) : (
              <EmptyState
                kind="requests"
                onAction={() => navigate('/request')}
              />
            )}
          </section>
        </FadeIn>

        {/* ---------- Vehicles ---------- */}
        <FadeIn delay={0.04}>
          <section className="flex flex-col gap-4">
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles === null
                ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28" />)
                : vehicles.length === 0
                  ? (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <EmptyState kind="vehicles" onAction={() => navigate('/vehicles')} />
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
              {vehicles && vehicles.length > 0 && vehicles.length < 3 && (
                <Card
                  interactive
                  className="border-dashed"
                  onClick={() => navigate('/vehicles')}
                >
                  <div className="flex items-center gap-3 text-fg-muted">
                    <IconTile icon={<Plus className="h-5 w-5" />} hue="neutral" size="md" />
                    <div className="text-small">Add another vehicle</div>
                  </div>
                </Card>
              )}
            </div>
          </section>
        </FadeIn>

        {/* ---------- Quick actions ---------- */}
        <FadeIn delay={0.06}>
          <section className="flex flex-col gap-4">
            <SectionHeading as="h2" size="sm" eyebrow="Shortcuts" title="Quick actions" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                to="/request"
                label="Request assistance"
                hint="Find a mechanic now"
                icon={<Wrench className="h-5 w-5" />}
                hue="azure"
              />
              <QuickAction
                to="/mechanics"
                label="Find a mechanic"
                hint="Browse the network"
                icon={<MapPin className="h-5 w-5" />}
                hue="aqua"
              />
              <QuickAction
                to="/history"
                label="Service history"
                hint="Past services & receipts"
                icon={<History className="h-5 w-5" />}
                hue="iris"
              />
              <QuickAction
                to="/vehicles"
                label="Manage vehicles"
                hint="Add or update"
                icon={<Car className="h-5 w-5" />}
                hue="gold"
              />
            </div>
          </section>
        </FadeIn>

        {/* ---------- Recent ---------- */}
        <FadeIn delay={0.08}>
          <section className="flex flex-col gap-4">
            <SectionHeading
              as="h2"
              size="sm"
              eyebrow="Last 3"
              title="Recent"
              actions={
                history && history.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
                    View all
                  </Button>
                ) : null
              }
            />
            {history === null ? (
              <Skeleton className="h-24" />
            ) : recent.length === 0 ? (
              <EmptyState kind="history" />
            ) : (
              <div className="grid gap-3">
                {recent.map((r) => (
                  <Card
                    key={r.id}
                    interactive
                    onClick={() => navigate(r.status === 'completed' ? `/track/${r.id}` : '/history')}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <IconTile
                          icon={<Wrench className="h-5 w-5" />}
                          hue={r.status === 'completed' ? 'gold' : 'iris'}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="text-body font-medium text-fg-app truncate">
                            Service {shortId(r.id)}
                          </div>
                          <div className="text-xs text-fg-muted">
                            {formatWhen(r.createdAt)} · {r.problemText ? r.problemText.slice(0, 60) : '—'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill status={r.status} size="sm" />
                        <ArrowRight className="h-4 w-4 text-fg-subtle" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="text-center text-xs text-fg-subtle">
            Need help? Open a request and a verified mechanic will be on the way.{' '}
            <Link to="/request" className="link-quiet">Get help now →</Link>
          </p>
        </FadeIn>
      </div>
    </SectionShell>
  );
}

function QuickAction({
  to, label, hint, icon, hue,
}: {
  to: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  hue: 'azure' | 'aqua' | 'iris' | 'gold';
}) {
  return (
    <Link
      to={to}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-azure-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app rounded-xl"
    >
      <Card interactive tone={hue}>
        <div className="flex items-center gap-3">
          <IconTile icon={icon} hue={hue} size="md" />
          <div className="min-w-0 flex-1">
            <div className="text-body font-medium text-fg-app">{label}</div>
            <div className="text-xs text-fg-muted">{hint}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-fg-subtle" />
        </div>
      </Card>
    </Link>
  );
}
