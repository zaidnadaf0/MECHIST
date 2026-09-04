import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Badge, Button, Modal, Textarea, useToast } from '@/components/ui';
import { ErrorState, Skeleton, EmptyState, ProgressBar } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { watchRequest, rateRequest, type ServiceRequest } from '@/lib/customer';
import { useAuth } from '@/app/AuthProvider';
import { distanceKm, kmToMin } from '@/lib/geo';
import { ProviderMap } from '@/components/map/ProviderMap';

const TIMELINE: Array<{ k: ServiceRequest['status']; label: string }> = [
  { k: 'requested',   label: 'Requested' },
  { k: 'accepted',    label: 'Accepted' },
  { k: 'on-the-way',  label: 'On the way' },
  { k: 'arrived',     label: 'Arrived' },
  { k: 'service',     label: 'Service' },
  { k: 'completed',   label: 'Completed' },
];

export function Tracking() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [req, setReq] = useState<ServiceRequest | null | 'loading'>('loading');
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [ratingBusy, setRatingBusy] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    // watchRequest fires its callback synchronously with the first snapshot,
    // so we don't need a separate getRequest() call — that would just
    // re-render with the same data.
    const unsub = watchRequest(
      id,
      (r) => setReq(r),
      (err) => {
        // Most likely permission-denied or a network outage. Render the
        // error state so the customer can retry, rather than leaving the
        // page stuck on the loading skeleton.
        console.error('[Tracking] watchRequest failed:', err);
        setReq(null);
        toast.push({
          title: 'Could not load this request',
          description: 'Check your connection and try again.',
          tone: 'danger',
        });
      },
    );
    return () => { if (unsub) unsub(); };
  }, [id, user, navigate, toast]);

  if (!user) return null;

  if (req === 'loading') {
    return (
      <main className="container section-sm">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-40" />
        <Skeleton className="mt-4 h-64" />
      </main>
    );
  }

  if (req === null) {
    return (
      <main className="container section-sm">
        <ErrorState kind="api" title="Request not found" description="This service may have ended or the link is invalid." retryLabel="Back to dashboard" onRetry={() => navigate('/dashboard')} />
      </main>
    );
  }

  const currentIdx = TIMELINE.findIndex((s) => s.k === req.status);
  const percent = req.status === 'completed' || req.status === 'cancelled'
    ? 100
    : Math.max(0, (currentIdx / (TIMELINE.length - 1)) * 100);

  // Live distance + ETA when we have a mechanic pin. Falls back to the
  // ETA the mechanic originally committed, then to a rough estimate.
  const liveEta = useMemo(() => {
    if (req.mechanicLat != null && req.mechanicLng != null) {
      const km = distanceKm(
        { lat: req.customerLat, lng: req.customerLng },
        { lat: req.mechanicLat, lng: req.mechanicLng },
      );
      return kmToMin(km);
    }
    return req.etaMin ?? null;
  }, [req]);

  return (
    <main className="container section-sm">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-fg-muted">Service · live tracking</div>
            <h1 className="mt-2 display text-display-md text-fg-app">{req.id.slice(-6).toUpperCase()}</h1>
            <p className="mt-1 text-small text-fg-muted">Created {new Date(req.createdAt).toLocaleString()} · follow the timeline below; distance is straight-line</p>
          </div>
          <Badge tone={req.status === 'completed' ? 'success' : 'brand'}>{req.status}</Badge>
        </div>
      </FadeIn>

      <div className="mt-6">
        <ProgressBar value={percent} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-h2 text-fg-app">Status</h2>
          <ol className="mt-4 grid gap-3">
            {TIMELINE.map((s, i) => {
              const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'pending';
              return (
                <li key={s.k} className="flex items-center gap-3">
                  <span aria-hidden className={
                    'h-2.5 w-2.5 rounded-full ' +
                    (state === 'done' ? 'bg-success-500' :
                     state === 'current' ? 'bg-brand-500 animate-pulse-dot' :
                     'bg-ink-300 dark:bg-ink-700')
                  } />
                  <span className={'text-small ' + (state === 'pending' ? 'text-fg-muted' : 'text-fg-app')}>
                    {s.label}
                  </span>
                  {state === 'current' && <span className="ml-auto text-xs text-brand-500">now</span>}
                </li>
              );
            })}
          </ol>
        </Card>

        <Card>
          <h2 className="text-h2 text-fg-app">Mechanic</h2>
          {req.mechanicName ? (
            <div className="mt-3">
              <div className="text-body font-medium text-fg-app">{req.mechanicName}</div>
              <div className="text-xs text-fg-muted">
                {liveEta != null ? `ETA ${liveEta} min` : 'Awaiting ETA update'}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" fullWidth>Message</Button>
                <Button variant="ghost" size="sm" fullWidth>Call</Button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <EmptyState kind="mechanics" title="Awaiting match" description="A mechanic will accept your request shortly." />
            </div>
          )}
        </Card>
      </div>

      {req.status !== 'cancelled' && (
        <Card className="mt-6">
          <h2 className="text-h2 text-fg-app">Live location</h2>
          <div className="mt-3 overflow-hidden rounded-xl">
            <ProviderMap
              center={[req.customerLat, req.customerLng]}
              zoom={14}
              className="aspect-[16/9] w-full"
              userPosition={[req.customerLat, req.customerLng]}
              userLabel="You"
              mechanicMarkers={
                req.mechanicLat != null && req.mechanicLng != null
                  ? [{ id: 'mechanic', position: [req.mechanicLat, req.mechanicLng], label: req.mechanicName ?? 'Mechanic', tone: 'aqua' as const }]
                  : []
              }
              line={
                req.mechanicLat != null && req.mechanicLng != null
                  ? [[req.mechanicLat, req.mechanicLng], [req.customerLat, req.customerLng]]
                  : null
              }
            />
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="text-h2 text-fg-app">Details</h2>
        <dl className="mt-3 grid gap-3 text-small">
          <Row label="Problem" value={req.problemText} />
          <Row label="Category" value={req.problemCategory ?? '—'} />
          <Row label="Customer location" value={`${req.customerLat.toFixed(5)}, ${req.customerLng.toFixed(5)}`} />
        </dl>
      </Card>

      {req.status === 'completed' && (
        <div className="mt-6">
          <Button variant="primary" onClick={() => setRatingOpen(true)}>Rate this service</Button>
        </div>
      )}

      <Modal
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
        title="Rate your service"
        description="Your rating helps us match the right mechanic next time."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRatingOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={ratingBusy} onClick={async () => {
              setRatingBusy(true);
              try {
                const ok = await rateRequest(req.id, rating, comment);
                if (!ok) {
                  toast.push({ title: 'Could not save your rating', description: 'Please try again in a moment.', tone: 'danger' });
                  return;
                }
                setRatingOpen(false);
                toast.push({ title: 'Thanks for the feedback', tone: 'success' });
              } finally {
                setRatingBusy(false);
              }
            }}>Submit</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1} star${i ? 's' : ''}`}
                aria-pressed={i < rating}
                onClick={() => setRating(i + 1)}
                className={'h-10 w-10 grid place-items-center rounded-full transition-colors ' + (i < rating ? 'text-brand-500' : 'text-ink-300 dark:text-ink-700')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2 15 9l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>
              </button>
            ))}
          </div>
          <Textarea label="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
      </Modal>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[color:var(--border-subtle)] pb-2 last:border-b-0 last:pb-0">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-fg-app text-right max-w-[60%]">{value}</dd>
    </div>
  );
}
