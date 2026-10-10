import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Check, CircleAlert, Clock, MapPin, Star, Wrench, X } from 'lucide-react';
import { Badge, Button, Card, IconTile, OpsStatCard, CountdownRing, Progress, Sparkbars, Stat, useToast, Modal, Textarea } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn, PageTransition } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import {
  watchIncoming, getMechanicProfile, getMechanicContact, setAvailability, acceptJob, listActiveJob, listCompletedJobs,
  declineOffer, type MechanicProfile,
} from '@/lib/mechanic';
import type { ServiceRequest } from '@/lib/customer';
import { OFFER_WINDOW_MS } from '@/lib/customer';
import { money, offerDeadlineMs, formatCountdownMs } from '@/lib/format';
import { distanceKm } from '@/lib/geo';
import { verificationUi, type VerificationStatus } from '@/lib/authUI';

const STAGE_LABEL: Record<ServiceRequest['status'], string> = {
  requested: 'Requested', accepted: 'Accepted', 'on-the-way': 'On the way',
  arrived: 'On site', service: 'In service', completed: 'Completed', cancelled: 'Cancelled',
};

const DAY = 86_400_000;
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function MechanicDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState<MechanicProfile | null | 'loading'>('loading');
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<ServiceRequest[]>([]);
  const [active, setActive] = useState<ServiceRequest | null>(null);
  const [history, setHistory] = useState<ServiceRequest[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [busyAvail, setBusyAvail] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [declining, setDeclining] = useState<{ jobId: string; reason: string } | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    let unsub: (() => void) | null = null;
    (async () => {
      const [p, c, aRes, hRes] = await Promise.all([
        getMechanicProfile(user.uid),
        getMechanicContact(user.uid),
        listActiveJob(user.uid),
        listCompletedJobs(user.uid, 30),
      ]);
      if (cancelled) return;
      setProfile(p);
      setContactPhone(c?.phone ?? null);
      setActive(aRes.data ?? null);
      setHistory(hRes.data ?? []);
      if (aRes.error) console.warn("[MechanicDashboard] listActiveJob failed:", aRes.error);
      if (hRes.error) {
        console.warn("[MechanicDashboard] listCompletedJobs failed:", hRes.error);
        if (!cancelled) setHistoryError(hRes.error.message);
      }
      unsub = watchIncoming((jobs) => {
        if (!cancelled) { setIncoming(jobs); setQueueError(null); }
      }, (err) => {
        console.warn("[MechanicDashboard] watchIncoming failed:", err);
        if (!cancelled) setQueueError(err.message);
      }, user.uid);
    })();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [user, navigate]);

  // Display-only 1s ticker for the offer countdowns. Gated on a
  // non-empty queue so the page idles when there is nothing to count
  // down; always cleaned up. Never decides eligibility — acceptJob and
  // the scheduled server expiry own that.
  useEffect(() => {
    if (incoming.length === 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [incoming.length]);

  const loaded = profile !== 'loading' && profile !== null ? profile : null;
  const available = Boolean(loaded?.isAvailable);
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
  const { settledTotal, settledCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const h of history) {
      if (typeof h.amountCents === 'number' && Number.isFinite(h.amountCents)) {
        total += h.amountCents;
        count += 1;
      }
    }
    return { settledTotal: total / 100, settledCount: count };
  }, [history]);
  const completeness = useMemo(() => {
    if (!loaded) return 0;
    const hasPhone = Boolean(contactPhone ?? loaded.phone);
    const checks = [
      Boolean(loaded.name), hasPhone, Boolean(loaded.vehicleDescription),
      loaded.specialties.length > 0, loaded.baseLat != null && loaded.baseLng != null, loaded.approved,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [loaded, contactPhone]);

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
    } else {
      toast.push({ title: 'Could not update availability', description: 'Check your connection and try again.', tone: 'danger' });
    }
  };

  const onAccept = async (job: ServiceRequest) => {
    if (!loaded) return;
    if (!verif.canAcceptJobs) {
      toast.push({ title: 'Verification required', description: verif.bannerTitle, tone: 'info' });
      return;
    }
    setAccepting(job.id);
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
        <div className="container section-compact flex flex-col gap-6">
          <FadeIn>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="display text-display-md text-fg-app">Dashboard</h1>
                <p className="mt-1 text-small text-fg-muted">
                  {loaded ? (loaded.garageName ?? loaded.name) : 'Mechanic console'}
                </p>
              </div>
            </div>
          </FadeIn>

          {loaded && status && (
            <VerificationBanner
              tone={verif.badgeTone}
              title={verif.bannerTitle}
              body={verif.bannerBody}
              badgeLabel={verif.badgeLabel}
            />
          )}

          {/* ---------- Availability ---------- */}
          <FadeIn>
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-success-500/25 bg-success-500/[0.07] p-4 sm:p-5">
              <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl bg-success-500/15 text-success-500">
                <Activity size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-body font-bold text-fg-app">{available ? "You're online" : "You're offline"}</div>
                <p className="mt-0.5 text-small text-fg-muted">
                  {available
                    ? 'Nearby requests will be offered to you.'
                    : 'Hidden from the live queue.'}
                  {!verif.canAcceptJobs && ' Availability has no effect until your application is approved.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={available}
                aria-label={available ? 'Go offline' : 'Go available'}
                disabled={!loaded || busyAvail}
                onClick={toggleAvail}
                className={'relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-400 disabled:opacity-60 ' + (available ? 'bg-success-500' : 'bg-hair/[0.2]')}
              >
                <span aria-hidden className={'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ' + (available ? 'left-7' : 'left-1')} />
              </button>
            </div>
          </FadeIn>

          <p aria-live="polite" className="sr-only">
            {loaded ? (available ? 'You are available for dispatch.' : 'You are offline.') : 'Loading profile.'}
          </p>

          {profile === null && (
            <ErrorState
              kind="empty-results"
              title="No mechanic profile yet"
              description="An admin needs to approve your application before you can receive jobs."
              retryLabel="Refresh"
              onRetry={() => location.reload()}
            />
          )}

          {/* ---------- Active job ---------- */}
          <section aria-labelledby="active-job">
            {active ? (
              <div className="overflow-hidden rounded-2xl border border-line-soft bg-gradient-to-br from-azure-900 via-[#16233f] to-surface-1 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Badge tone="warning" size="sm" dot>{STAGE_LABEL[active.status].toUpperCase()}</Badge>
                    <div className="mt-2 display text-h1 font-bold text-white text-balance">
                      {active.problemCategory ?? 'Service request'}
                    </div>
                    <p className="mt-1 max-w-lg text-small text-white/70 line-clamp-2">{active.problemText}</p>
                    <div className="mt-1 font-mono text-xs text-white/50">#{active.id.slice(-6).toUpperCase()}</div>
                  </div>
                  {typeof active.amountCents === 'number' && (
                    <div className="text-right">
                      <div className="stat-num text-display-sm font-bold text-white tabular-nums">{money(active.amountCents / 100)}</div>
                      <div className="text-xs text-white/60">recorded amount</div>
                    </div>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="primary" size="md" rightIcon={<ArrowRight size={15} />} onClick={() => navigate(`/mechanic/job/${active.id}`)}>
                    Open active job
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-xs sm:grid-cols-3">
                  <Meta icon={<MapPin size={13} />} label="Location" value={`${active.customerLat.toFixed(4)}, ${active.customerLng.toFixed(4)}`} light />
                  <Meta icon={<Clock size={13} />} label="ETA given" value={active.etaMin != null ? `${active.etaMin} min` : '—'} light />
                  <Meta icon={<Activity size={13} />} label="Updated" value={new Date(active.updatedAt).toLocaleTimeString()} light />
                </div>
              </div>
            ) : (
              <EmptyState kind="incoming" title="No active job" description="Accept an offer from the dispatch queue to get started." />
            )}
          </section>

          {/* ---------- Shift metrics ---------- */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {profile === 'loading' ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)
            ) : (
              <>
                <OpsStatCard icon={<Activity size={18} />} label="Live offers" tone="aqua" value={offers.length} sub={available ? 'queue is streaming' : 'go available to receive offers'} />
                <OpsStatCard icon={<Check size={18} />} label="Jobs today" tone="azure" value={todayCount} sub="completed call-outs" />
                <OpsStatCard
                  icon={<Wrench size={18} />} label="Settled revenue" tone="gold"
                  value={money(settledTotal)}
                  sub={settledCount === 0 ? `no settled amounts in last ${history.length}` : `${settledCount} of last ${history.length} recorded`}
                />
                <OpsStatCard
                  icon={<Star size={18} />} label="Avg rating" tone="gold"
                  value={loaded?.rating != null ? loaded.rating.toFixed(2) : '—'}
                  sub={`${loaded?.reviewCount ?? 0} customer reviews`}
                />
              </>
            )}
          </div>

          {/* ---------- Dispatch queue ---------- */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <section aria-labelledby="dispatch-queue">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 id="dispatch-queue" className="display text-h2 text-fg-app">Incoming requests</h2>
                  <span className="font-mono text-xs text-fg-subtle">
                    {offers.length} open · updated {new Date(now).toLocaleTimeString()}
                  </span>
                </div>
                <p aria-live="polite" className="sr-only">{offers.length} job offers waiting.</p>
                {queueError && offers.length === 0 && (
                  <div className="mt-3">
                    <ErrorState kind="api" title="Queue unavailable" description={queueError} retryLabel="Retry" onRetry={() => location.reload()} />
                  </div>
                )}
                <ul className="mt-3 grid gap-3">
                  {offers.length === 0 ? (
                    !queueError && (
                      <li>
                        <EmptyState compact kind="incoming" title="Queue is quiet" description="New jobs appear here in realtime the moment a customer requests help." />
                      </li>
                    )
                  ) : (
                    offers.map((j) => (
                      <OfferCard
                        key={j.id}
                        job={j}
                        now={now}
                        baseLat={loaded?.baseLat}
                        baseLng={loaded?.baseLng}
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

            {/* ---------- Shift rail ---------- */}
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
                  {historyError && (
                    <p role="status" className="mt-2 text-xs text-warning-600">Shift totals may be stale — history failed to load.</p>
                  )}
                </div>
              </Card>

              <Card eyebrow="Readiness" title="Profile completeness">
                <Progress value={completeness} hue={completeness >= 80 ? 'aqua' : 'gold'} showValue label="Verified fields" />
                <ul className="mt-4 space-y-2 text-xs">
                  <Ready ok={Boolean(loaded?.approved)} label="Approved by admin" />
                  <Ready ok={Boolean(contactPhone ?? loaded?.phone)} label="Contact number on file" />
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

function OfferCard({
  job, now, baseLat, baseLng, accepting, disabled, blockReason, onAccept, onDismiss, onDecline,
}: {
  job: ServiceRequest;
  now: number;
  baseLat?: number | null;
  baseLng?: number | null;
  accepting: boolean;
  disabled: boolean;
  blockReason?: string;
  onAccept: () => void;
  onDismiss: () => void;
  onDecline: () => void;
}) {
  // Display deadline comes from the persisted server timestamp, not
  // createdAt: a released job gets a fresh offerExpiresAt while createdAt
  // stays put, so createdAt-based math would read "Expired" on a live offer.
  const left = Math.max(0, offerDeadlineMs(job, OFFER_WINDOW_MS) - now);
  const urgent = left > 0 && left < 30_000;
  const kmAway = baseLat != null && baseLng != null
    ? distanceKm({ lat: baseLat, lng: baseLng }, { lat: job.customerLat, lng: job.customerLng })
    : null;

  return (
    <li>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <IconTile icon={<Wrench size={18} />} hue="aqua" size="md" />
            <div className="min-w-0">
              <div className="text-body font-bold text-fg-app">{job.problemCategory ?? 'Service request'}</div>
              <p className="mt-0.5 max-w-xl text-small text-fg-muted line-clamp-2">{job.problemText}</p>
              <div className="mt-1 font-mono text-[11px] text-fg-subtle">#{job.id.slice(-6).toUpperCase()} · {new Date(job.createdAt).toLocaleTimeString()}</div>
            </div>
          </div>
          <CountdownRing fraction={left / OFFER_WINDOW_MS} label={left === 0 ? '0:00' : formatCountdownMs(left)} urgent={urgent || left === 0} />
        </div>

        <dl className="mt-4 grid gap-0 border-t border-line-soft text-small">
          <div className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5">
            <dt className="text-fg-muted">Location</dt>
            <dd className="font-mono text-xs text-fg-app">{job.customerLat.toFixed(4)}, {job.customerLng.toFixed(4)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5">
            <dt className="text-fg-muted">Distance</dt>
            <dd className="font-medium text-fg-app">{kmAway != null ? `${kmAway.toFixed(1)} km straight-line` : '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-fg-muted">Customer note</dt>
            <dd className="max-w-[60%] truncate text-right text-fg-app">{job.problemText}</dd>
          </div>
        </dl>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Button variant="success" size="md" fullWidth leftIcon={<Check size={15} />} loading={accepting} disabled={disabled} onClick={onAccept} title={blockReason}>Accept job</Button>
          <Button variant="secondary" size="md" fullWidth leftIcon={<X size={15} />} loading={false} disabled={disabled && !accepting} onClick={onDecline}>Decline</Button>
        </div>
        <button type="button" onClick={onDismiss} className="mt-2 w-full text-center text-xs text-fg-subtle hover:text-fg-app">
          Hide this offer
        </button>
        {left === 0 && (
          <p role="status" className="mt-2 text-center text-xs text-danger-500">Offer window elapsed — the dispatcher may already have moved on.</p>
        )}
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

function Meta({ icon, label, value, light }: { icon: ReactNode; label: string; value: string; light?: boolean }) {
  return (
    <div>
      <div className={'eyebrow inline-flex items-center gap-1.5 ' + (light ? 'text-white/60' : '')}>{icon}{label}</div>
      <div className={'mt-1 font-mono text-xs ' + (light ? 'text-white' : 'text-fg-app')}>{value}</div>
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
        {ok ? <Check size={14} strokeWidth={2} /> : <X size={14} strokeWidth={2} />}
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
        'flex flex-wrap items-start gap-3 rounded-xl border p-4 ' + wrap
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
