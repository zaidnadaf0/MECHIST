import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Check, CircleAlert, Clock, MapPin, Power, Star, Wrench, X, XCircle } from 'lucide-react';
import { Badge, Button, Card, IconTile, Progress, Sparkbars, Stat, useToast, Modal, Textarea } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn, PageTransition } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import {
  watchIncoming, getMechanicProfile, setAvailability, acceptJob, listActiveJob, listCompletedJobs,
  declineOffer, type MechanicProfile,
} from '@/lib/mechanic';
import type { ServiceRequest } from '@/lib/customer';
import { inr, verificationUi, type VerificationStatus } from '@/lib/authUI';

/** Dispatch offers stay hot for two minutes before they read as stale. */
const OFFER_WINDOW_MS = 120_000;
/** Standard call-out fee used for the shift estimate until settlement lands. */
const CALLOUT_FEE = 45;

const STAGE_LABEL: Record<ServiceRequest['status'], string> = {
  requested: 'Requested', accepted: 'Accepted', 'on-the-way': 'On the way',
  arrived: 'On site', service: 'In service', completed: 'Completed', cancelled: 'Cancelled',
};

const DAY = 86_400_000;
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function MechanicDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState<MechanicProfile | null | 'loading'>('loading');
  const [incoming, setIncoming] = useState<ServiceRequest[]>([]);
  const [active, setActive] = useState<ServiceRequest | null>(null);
  const [history, setHistory] = useState<ServiceRequest[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [busyAvail, setBusyAvail] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [declining, setDeclining] = useState<{ jobId: string; reason: string } | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    let unsub: (() => void) | null = null;
    (async () => {
      const [p, aRes, hRes] = await Promise.all([
        getMechanicProfile(user.uid),
        listActiveJob(user.uid),
        listCompletedJobs(user.uid, 30),
      ]);
      if (cancelled) return;
      setProfile(p);
      setActive(aRes.data ?? null);
      setHistory(hRes.data ?? []);
      if (aRes.error) console.warn("[MechanicDashboard] listActiveJob failed:", aRes.error);
      if (hRes.error) console.warn("[MechanicDashboard] listCompletedJobs failed:", hRes.error);
      unsub = watchIncoming((jobs) => {
        if (!cancelled) setIncoming(jobs);
      }, undefined, user.uid);
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [user, navigate]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const loaded = profile !== 'loading' && profile !== null ? profile : null;
  const available = Boolean(loaded?.isAvailable);
  // Verification state — once the mechanic is approved, the banner
  // becomes a quiet confirmation rather than a gate. While not
  // approved, `canAcceptJobs === false` and the Accept button on
  // every offer is disabled, so the mechanic can browse but not
  // commit to a job.
  const status: VerificationStatus | null = loaded?.verificationStatus ?? null;
  const verif = verificationUi(status);
  const offers = useMemo(() => incoming.filter((j) => !dismissed.includes(j.id)), [incoming, dismissed]);

  const week = useMemo(() => {
    const today = startOfDay(Date.now());
    return Array.from({ length: 7 }, (_, i) => {
      const from = today - (6 - i) * DAY;
      return {
        day: new Date(from).toLocaleDateString(undefined, { weekday: 'narrow' }),
        count: history.filter((h) => h.updatedAt >= from && h.updatedAt < from + DAY).length,
      };
    });
  }, [history]);

  const todayCount = week[6]?.count ?? 0;
  const completeness = useMemo(() => {
    if (!loaded) return 0;
    const checks = [
      Boolean(loaded.name), Boolean(loaded.phone), Boolean(loaded.vehicleDescription),
      loaded.specialties.length > 0, loaded.baseLat != null && loaded.baseLng != null, loaded.approved,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [loaded]);

  if (!user) return null;

  const toggleAvail = async () => {
    if (!loaded) return;
    const next = !loaded.isAvailable;
    setBusyAvail(true);
    const ok = await setAvailability(user.uid, next);
    setBusyAvail(false);
    if (ok) {
      setProfile({ ...loaded, isAvailable: next });
      toast.push({ title: next ? 'You are available' : 'You are offline', tone: next ? 'success' : 'info' });
    }
  };

  const onAccept = async (job: ServiceRequest) => {
    if (!loaded) return;
    if (!verif.canAcceptJobs) {
      // Belt-and-braces: the OfferCard Accept button is also disabled,
      // but a tap on the card body could theoretically bubble here.
      toast.push({ title: 'Verification required', description: verif.bannerTitle, tone: 'info' });
      return;
    }
    setAccepting(job.id);
    // Server-authoritative check: an offer older than OFFER_WINDOW_MS
    // is treated as expired without ever calling Firestore.
    if (job.offerExpiresAt != null && job.offerExpiresAt < now) {
      setAccepting(null);
      setDismissed((d) => d.includes(job.id) ? d : [...d, job.id]);
      toast.push({ title: 'Offer expired', description: 'A faster mechanic got there first.', tone: 'info' });
      return;
    }
    const result = await acceptJob(
      job.id,
      user.uid,
      loaded.name,
      undefined,
      loaded.baseLat != null && loaded.baseLng != null
        ? { lat: loaded.baseLat, lng: loaded.baseLng }
        : undefined,
    );
    setAccepting(null);
    if (result === 'accepted') {
      toast.push({ title: 'Job accepted', tone: 'success' });
      navigate(`/mechanic/job/${job.id}`);
      return;
    }
    if (result === 'expired' || result === 'alreadyTaken') {
      setDismissed((d) => d.includes(job.id) ? d : [...d, job.id]);
      toast.push({
        title: result === 'expired' ? 'Offer expired' : 'Already taken',
        description: result === 'expired' ? 'The 2-minute window elapsed.' : 'Another mechanic accepted this job first.',
        tone: 'info',
      });
      return;
    }
    toast.push({ title: 'Could not accept', description: 'Please try again.', tone: 'danger' });
  };

  const onDeclineOpen = (job: ServiceRequest) => {
    setDeclining({ jobId: job.id, reason: '' });
  };

  const onDeclineSubmit = async () => {
    if (!declining || !loaded) return;
    const { jobId, reason } = declining;
    setAccepting(jobId);
    const result = await declineOffer(jobId, user.uid);
    setAccepting(null);
    setDeclining(null);
    if (result === 'declined') {
      setDismissed((d) => d.includes(jobId) ? d : [...d, jobId]);
      toast.push({ title: 'Offer declined', description: reason ? `Reason: ${reason}` : undefined, tone: 'info' });
      return;
    }
    if (result === 'forbidden') {
      toast.push({ title: 'Cannot decline', description: 'You are not authorized to decline this offer.', tone: 'danger' });
      return;
    }
    if (result === 'alreadyTaken') {
      setDismissed((d) => d.includes(jobId) ? d : [...d, jobId]);
      toast.push({ title: 'Offer unavailable', description: 'This offer was already taken or expired.', tone: 'info' });
      return;
    }
    toast.push({ title: 'Could not decline', description: 'Please try again.', tone: 'danger' });
  };

  return (
    <>
      <PageTransition>
        <div className="container section-compact">
          <FadeIn>
          {loaded && status && (
            <VerificationBanner
              tone={verif.badgeTone}
              title={verif.bannerTitle}
              body={verif.bannerBody}
              badgeLabel={verif.badgeLabel}
            />
          )}

          <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-8 bg-gradient-to-r from-aqua-500 to-transparent" />
                <span className="eyebrow">Mechanic portal</span>
              </div>
              <h1 className="mt-3 display text-display-md text-fg-app">
                {loaded ? `Welcome, ${loaded.name}` : 'Welcome.'}
              </h1>
              <p className="mt-2 max-w-xl text-small text-fg-muted text-pretty">
                Live dispatch, job stages and shift totals. Go online to receive jobs — availability toggles your presence in the queue. Offers expire after two minutes; GPS is throttled 25&nbsp;m&nbsp;/&nbsp;5&nbsp;s and shared only after you accept.
              </p>
            </div>

            <Card tone="aqua" flush className="w-full lg:max-w-sm">
              <div className="flex items-center gap-4 p-4">
                <IconTile icon={<Power size={18} />} hue={available ? 'aqua' : 'neutral'} />
                <div className="min-w-0 flex-1">
                  <Badge tone={available ? 'aqua' : 'neutral'} live={available} dot={!available}>
                    {available ? 'Available' : 'Offline'}
                  </Badge>
                  <p className="mt-1.5 text-xs text-fg-muted">
                    {available ? 'Receiving dispatch in real time.' : 'Hidden from the live queue.'}
                  </p>
                </div>
                <Button
                  variant={available ? 'secondary' : 'live'}
                  size="sm"
                  loading={busyAvail}
                  onClick={toggleAvail}
                  disabled={!loaded}
                >
                  {available ? 'Go offline' : 'Go available'}
                </Button>
              </div>
            </Card>
          </header>
        </FadeIn>

        <p aria-live="polite" className="sr-only">
          {loaded ? (available ? 'You are available for dispatch.' : 'You are offline.') : 'Loading profile.'}
        </p>

        {profile === null && (
          <div className="mt-8">
            <ErrorState
              kind="empty-results"
              title="No mechanic profile yet"
              description="An admin needs to approve your application before you can receive jobs."
              retryLabel="Refresh"
              onRetry={() => location.reload()}
            />
          </div>
        )}

        {/* ── shift metrics ─────────────────────────────────────────── */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {profile === 'loading' ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : (
            <>
              <Card tone="aqua">
                <Stat label="Live offers" value={offers.length} hue="aqua" size="sm" icon={<Activity size={14} />} />
                <p className="mt-3 text-xs text-fg-subtle">{available ? 'Queue is streaming.' : 'Go available to receive offers.'}</p>
              </Card>
              <Card>
                <Stat label="Completed today" value={todayCount} hue="azure" size="sm" icon={<Check size={14} />} />
                <Sparkbars className="mt-3" values={week.map((w) => w.count)} hue="azure" height={28} />
              </Card>
              <Card tone="gold">
                <Stat
                  label="Earnings today (est.)"
                  value={inr(todayCount * CALLOUT_FEE)}
                  hue="gold"
                  size="sm"
                  icon={<Wrench size={14} />}
                />
                <p className="mt-3 text-xs text-fg-subtle">
                  {inr(history.length * CALLOUT_FEE)} across last {history.length} jobs · settles nightly.
                </p>
              </Card>
              <Card tone="gold">
                <Stat
                  label="Rating"
                  value={loaded?.rating != null ? loaded.rating.toFixed(1) : '—'}
                  unit="/5"
                  hue="gold"
                  size="sm"
                  icon={<Star size={14} />}
                />
                <p className="mt-3 text-xs text-fg-subtle">{loaded?.reviewCount ?? 0} customer reviews</p>
              </Card>
            </>
          )}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* ── dispatch column ───────────────────────────────────── */}
          <div className="lg:col-span-2">
            <section aria-labelledby="active-job">
              <div className="flex items-end justify-between gap-3">
                <h2 id="active-job" className="text-h2 text-fg-app">Active job</h2>
                {active && <Badge tone="aqua" live>{STAGE_LABEL[active.status]}</Badge>}
              </div>
              <div className="mt-3">
                {active ? (
                  <Card tone="aqua" interactive onClick={() => navigate(`/mechanic/job/${active.id}`)}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-fg-subtle">#{active.id.slice(-6).toUpperCase()}</div>
                        <div className="mt-1 display text-h3 text-fg-app">
                          {active.problemCategory ?? 'Service request'}
                        </div>
                        <p className="mt-1 max-w-lg text-small text-fg-muted line-clamp-2">{active.problemText}</p>
                      </div>
                      <Button
                        variant="live"
                        size="sm"
                        rightIcon={<ArrowRight size={15} />}
                        onClick={(e) => { e.stopPropagation(); navigate(`/mechanic/job/${active.id}`); }}
                      >
                        Open job
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 border-t border-line-soft pt-4 text-xs sm:grid-cols-3">
                      <Meta icon={<MapPin size={13} />} label="Location" value={`${active.customerLat.toFixed(4)}, ${active.customerLng.toFixed(4)}`} />
                      <Meta icon={<Clock size={13} />} label="ETA given" value={active.etaMin != null ? `${active.etaMin} min` : '—'} />
                      <Meta icon={<Activity size={13} />} label="Updated" value={new Date(active.updatedAt).toLocaleTimeString()} />
                    </div>
                  </Card>
                ) : (
                  <EmptyState kind="incoming" title="No active job" description="Accept an offer from the dispatch queue to get started." />
                )}
              </div>
            </section>

            <section className="mt-10" aria-labelledby="dispatch-queue">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="dispatch-queue" className="text-h2 text-fg-app">Dispatch queue</h2>
                <span className="font-mono text-xs text-fg-subtle">
                  {offers.length} open · updated {new Date(now).toLocaleTimeString()}
                </span>
              </div>
              <p aria-live="polite" className="sr-only">{offers.length} job offers waiting.</p>
              <ul className="mt-3 grid gap-3">
{offers.length === 0 ? (
                    <li>
                      <EmptyState compact kind="incoming" title="Queue is quiet" description="New jobs appear here in realtime the moment a customer requests help." />
                    </li>
                  ) : (
                    offers.map((j) => (
                      <OfferCard
                        key={j.id}
                        job={j}
                        now={now}
                        accepting={accepting === j.id}
                        disabled={Boolean(accepting) || !loaded || !verif.canAcceptJobs}
                        blockReason={!verif.canAcceptJobs ? verif.bannerTitle : undefined}
                        onAccept={() => onAccept(j)}
                        onDismiss={() => setDismissed((d) => [...d, j.id])}
                        onDecline={() => onDeclineOpen(j)}
                      />
                    ))
                  )}
              </ul>
            </section>
          </div>

          {/* ── shift rail ────────────────────────────────────────── */}
          <aside className="space-y-6">
            <Card eyebrow="This week" title="Completed per day">
              <Sparkbars values={week.map((w) => w.count)} hue="aqua" height={64} />
              <div className="mt-2 flex justify-between font-mono text-[10px] text-fg-subtle">
                {week.map((w, i) => <span key={i}>{w.day}</span>)}
              </div>
              <div className="mt-4 border-t border-line-soft pt-4">
                <Stat
                  label="Completed · 7 days"
                  value={week.reduce((a, w) => a + w.count, 0)}
                  hue="aqua"
                  size="sm"
                />
              </div>
            </Card>

            <Card eyebrow="Readiness" title="Profile completeness">
              <Progress value={completeness} hue={completeness >= 80 ? 'aqua' : 'gold'} showValue label="Verified fields" />
              <ul className="mt-4 space-y-2 text-xs">
                <Ready ok={Boolean(loaded?.approved)} label="Approved by admin" />
                <Ready ok={Boolean(loaded?.phone)} label="Contact number on file" />
                <Ready ok={Boolean(loaded?.vehicleDescription)} label="Service vehicle described" />
                <Ready ok={Boolean(loaded && loaded.specialties.length > 0)} label="Specialties listed" />
                <Ready ok={Boolean(loaded && loaded.baseLat != null && loaded.baseLng != null)} label="Coverage base set" />
              </ul>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-line-soft pt-4">
                <Link to="/mechanic/profile"><Button variant="secondary" size="sm">Edit profile</Button></Link>
                <Link to="/mechanic/history"><Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>History</Button></Link>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </PageTransition>
      <DeclineModal
        open={!!declining}
        onClose={() => setDeclining(null)}
        onSubmit={onDeclineSubmit}
        reason={declining?.reason ?? ''}
        setReason={(v) => setDeclining((d) => (d ? { ...d, reason: v } : null))}
        busy={accepting === declining?.jobId}
      />
    </>
  );
}

/* ── pieces ─────────────────────────────────────────────────────── */

function OfferCard({
  job, now, accepting, disabled, blockReason, onAccept, onDismiss, onDecline,
}: {
  job: ServiceRequest;
  now: number;
  accepting: boolean;
  disabled: boolean;
  blockReason?: string;
  onAccept: () => void;
  onDismiss: () => void;
  onDecline: () => void;
}) {
  const left = Math.max(0, OFFER_WINDOW_MS - (now - job.createdAt));
  const pct = (left / OFFER_WINDOW_MS) * 100;
  const urgent = left < 30_000;

  return (
    <li>
      <Card tone={urgent ? 'gold' : 'aqua'}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={urgent ? 'gold' : 'aqua'} live={!urgent} dot={urgent}>
                {left === 0 ? 'Overdue' : urgent ? 'Expiring' : 'New offer'}
              </Badge>
              <span className="font-mono text-xs text-fg-subtle">#{job.id.slice(-6).toUpperCase()}</span>
            </div>
            <div className="mt-2 text-body font-medium text-fg-app">{job.problemCategory ?? 'Service request'}</div>
            <p className="mt-0.5 max-w-xl text-small text-fg-muted line-clamp-2">{job.problemText}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-fg-subtle">
              <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden />{job.customerLat.toFixed(4)}, {job.customerLng.toFixed(4)}</span>
              <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden />{new Date(job.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className={'stat-num text-h2 ' + (urgent ? 'text-gold-500' : 'text-aqua-500')}>{clock(left)}</div>
            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<X size={14} />}
                  onClick={onDismiss}
                  title="Hide this offer from your queue — the customer keeps waiting for a mechanic."
                  disabled={disabled && !accepting}
                >
                  Hide
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<XCircle size={14} />}
                  onClick={onDecline}
                  title="Decline this offer — it will no longer appear in your queue."
                  disabled={disabled && !accepting}
                >
                  Decline
                </Button>
              </div>
              <Button variant="live" size="sm" loading={accepting} disabled={disabled} onClick={onAccept} title={blockReason}>Accept</Button> // Row 11 — pending/disabled guard, server transaction authoritative
            </div>
          </div>
        </div>
        <Progress className="mt-4" value={pct} hue={urgent ? 'gold' : 'aqua'} />
      </Card>
    </li>
  );
}

function DeclineModal({
  open,
  onClose,
  onSubmit,
  reason,
  setReason,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  reason: string;
  setReason: (v: string) => void;
  busy: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Decline offer" size="sm">
      <p className="text-small text-fg-muted mb-4">
        You are about to decline this offer. It will no longer appear in your queue.
        The customer will continue waiting for another mechanic.
      </p>
      <Textarea
        label="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g., Too far, wrong specialty, unavailable..."
        rows={3}
      />
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="danger" size="sm" onClick={onSubmit} loading={busy}>Decline</Button>
      </div>
    </Modal>
  );
}

function Meta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow inline-flex items-center gap-1.5">{icon}{label}</div>
      <div className="mt-1 font-mono text-xs text-fg-app">{value}</div>
    </div>
  );
}

function Ready({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden
        className={
          'grid h-4 w-4 place-items-center rounded-full ' +
          (ok ? 'bg-success-500/15 text-success-600 dark:text-success-400' : 'bg-hair/[0.08] text-fg-subtle')
        }
      >
        {ok ? <Check size={11} /> : <X size={11} />}
      </span>
      <span className={ok ? 'text-fg-app' : 'text-fg-muted'}>{label}</span>
      <span className="sr-only">{ok ? '(complete)' : '(missing)'}</span>
    </li>
  );
}

function VerificationBanner({
  tone, title, body, badgeLabel,
}: {
  tone: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  body: string;
  badgeLabel: string;
}) {
  const wrap = {
    info:    'border-azure-500/30 bg-azure-500/10 text-azure-700 dark:text-azure-300',
    warning: 'border-warning-500/30 bg-warning-500/10 text-warning-700 dark:text-warning-300',
    success: 'border-success-500/30 bg-success-500/10 text-success-700 dark:text-success-300',
    danger:  'border-danger-500/30 bg-danger-500/10 text-danger-700 dark:text-danger-300',
  }[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      aria-live="polite"
      className={
        'mb-8 flex flex-wrap items-start gap-3 rounded-xl border p-4 ' + wrap
      }
    >
      <span aria-hidden className="mt-0.5 grid h-7 w-7 place-items-center rounded-md bg-surface-1/70">
        {tone === 'success' ? <Check className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone} dot>{badgeLabel}</Badge>
          <div className="text-small font-medium text-fg-app">{title}</div>
        </div>
        <p className="mt-1 max-w-2xl text-small text-fg-muted text-pretty">{body}</p>
      </div>
    </div>
  );
}
