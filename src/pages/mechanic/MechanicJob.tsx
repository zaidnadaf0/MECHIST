import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Badge, Button, useToast } from '@/components/ui';
import { ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { watchRequest, type ServiceRequest } from '@/lib/customer';
import { updateJobStatus, pushMechanicLocation, pushMechanicLocationToRequest, type JobStatus } from '@/lib/mechanic';
import { useWatchPosition } from '@/lib/geolocation';
import { MapView, Marker, AutoFitBounds, RecenterButton } from '@/lib/map';

const NEXT_STATUS: Record<JobStatus, JobStatus | null> = {
  'accepted':   'on-the-way',
  'on-the-way': 'arrived',
  'arrived':    'service',
  'service':    'completed',
  'requested':  null, 'completed': null, 'cancelled': null,
};

const LABEL: Record<JobStatus, string> = {
  'requested': 'Requested', 'accepted': 'Accepted', 'on-the-way': 'On the way',
  'arrived': 'Arrived', 'service': 'In service', 'completed': 'Completed', 'cancelled': 'Cancelled',
};

/** GPS updates are published to the request at most every 25 m / 5 s while on the job. */
const LIVE_THROTTLE = { minDistanceM: 25, minIntervalMs: 5000 };

/** Statuses during which the mechanic is en route / on site and should be pushing live GPS. */
const LIVE_STATUSES: ReadonlySet<JobStatus> = new Set<JobStatus>(['accepted', 'on-the-way', 'arrived', 'service']);

export function MechanicJob() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [job, setJob] = useState<ServiceRequest | null | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const [geo] = useWatchPosition(LIVE_THROTTLE);
  const lastPushedRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    // watchRequest fires its callback synchronously with the first snapshot,
    // so we don't need a separate getRequest() call — that would just
    // re-render with the same data (and flash through 'loading' for any
    // job the user is allowed to see).
    const unsub = watchRequest(
      id,
      (r) => setJob(r),
      (err) => {
        // Without this branch a permission-denied / unavailable error
        // would leave `job` stuck on 'loading' forever. Surface it so
        // the mechanic can see something is wrong.
        console.error('[MechanicJob] watchRequest failed:', err);
        setJob(null);
        toast.push({
          title: 'Could not load this job',
          description: 'Check your connection and try again.',
          tone: 'danger',
        });
      },
    );
    return () => { if (unsub) unsub(); };
  }, [id, user, navigate, toast]);

  // Push live GPS onto the request while the job is in flight. The
  // `lastPushedRef` is the single source of truth for "what we last sent"
  // so the throttle is honoured even if the hook's emission rate changes.
  useEffect(() => {
    if (!user) return;
    if (job === null || job === 'loading') return;
    if (!LIVE_STATUSES.has(job.status)) return;
    if (!geo.coords) return;
    const last = lastPushedRef.current;
    if (last) {
      const dLat = (geo.coords.lat - last.lat) * 111_000;
      const dLng = (geo.coords.lng - last.lng) * 111_000;
      const moved = Math.sqrt(dLat * dLat + dLng * dLng);
      if (moved < LIVE_THROTTLE.minDistanceM) return;
    }
    lastPushedRef.current = { lat: geo.coords.lat, lng: geo.coords.lng };
    (async () => {
      // Both writes are best-effort but we surface a failure once so the
      // mechanic knows their dot isn't reaching the customer. The profile
      // write is non-critical (just a "last seen"); the request write is
      // the one the customer sees.
      const [reqOk, profileOk] = await Promise.all([
        pushMechanicLocationToRequest(job.id, geo.coords!.lat, geo.coords!.lng),
        pushMechanicLocation(user.uid, geo.coords!.lat, geo.coords!.lng),
      ]);
      if (!reqOk) {
        toast.push({
          title: 'Live location failed to update',
          description: 'The customer may be seeing your last known position. We will retry on the next fix.',
          tone: 'warning',
        });
      } else if (!profileOk) {
        // Profile write is best-effort — don't toast every time, but the
        // first failure is worth flagging so the mechanic can check their
        // network.
        toast.push({
          title: 'Could not update your profile location',
          description: 'Your live position still shows to the customer. We will retry shortly.',
          tone: 'info',
        });
      }
    })();
  }, [geo.coords, job, user, toast]);

  if (!user) return null;
  if (job === 'loading') return <main className="container section-sm"><Skeleton className="h-40" /></main>;
  if (!job) return (
    <main className="container section-sm">
      <ErrorState kind="api" title="Job not found" description="The job may have been reassigned or cancelled." retryLabel="Back to dashboard" onRetry={() => navigate('/mechanic')} />
    </main>
  );

  const next = NEXT_STATUS[job.status];
  const advance = async () => {
    if (!next) return;
    setBusy(true);
    const ok = await updateJobStatus(job.id, next);
    setBusy(false);
    if (ok) {
      toast.push({ title: `Status: ${LABEL[next]}`, tone: 'success' });
    } else {
      toast.push({
        title: 'Could not update the job',
        description: 'Check your connection and try again in a moment.',
        tone: 'danger',
      });
    }
  };

  const liveTracking = LIVE_STATUSES.has(job.status);

  return (
    <main className="container section-sm">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-fg-muted">Job</div>
            <h1 className="mt-2 display text-display-md text-fg-app">Service {job.id.slice(-6).toUpperCase()}</h1>
          </div>
          <div className="flex items-center gap-2">
            {liveTracking && (
              <Badge tone="aqua" live dot>
                Live location on
              </Badge>
            )}
            <Badge tone="brand">{LABEL[job.status]}</Badge>
          </div>
        </div>
      </FadeIn>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-h2 text-fg-app">Problem</h2>
          <p className="mt-2 text-body text-fg-app">{job.problemText}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-small">
            <Field label="Category"     value={job.problemCategory ?? '—'} />
            <Field label="Customer ETA" value={job.etaMin != null ? `${job.etaMin} min` : '—'} />
            <Field label="Location"     value={`${job.customerLat.toFixed(5)}, ${job.customerLng.toFixed(5)}`} />
            <Field label="Created"      value={new Date(job.createdAt).toLocaleString()} />
          </div>
        </Card>
        <Card>
          <h2 className="text-h2 text-fg-app">Actions</h2>
          {next ? (
            <div className="mt-3">
              <Button variant="primary" size="lg" fullWidth loading={busy} onClick={advance}>
                Mark as {LABEL[next].toLowerCase()}
              </Button>
              <p className="mt-3 text-xs text-fg-muted">Customer is notified instantly.</p>
            </div>
          ) : (
            <p className="mt-3 text-small text-fg-muted">This job is closed.</p>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-h2 text-fg-app">Customer location</h2>
        <div className="mt-3 overflow-hidden rounded-xl">
          <MapView
            center={[job.customerLat, job.customerLng]}
            zoom={14}
            className="aspect-[16/9] w-full"
          >
            <Marker position={[job.customerLat, job.customerLng]} tone="azure" label="Customer" />
            {job.mechanicLat != null && job.mechanicLng != null && (
              <Marker position={[job.mechanicLat, job.mechanicLng]} tone="aqua" label="You" />
            )}
            <AutoFitBounds
              points={
                job.mechanicLat != null && job.mechanicLng != null
                  ? [[job.customerLat, job.customerLng], [job.mechanicLat, job.mechanicLng]]
                  : [[job.customerLat, job.customerLng]]
              }
            />
            <RecenterButton center={[job.customerLat, job.customerLng]} />
          </MapView>
        </div>
        {liveTracking && (
          <p className="mt-2 text-xs text-fg-muted">
            Your live position is being shared with the customer while this job is in progress.
          </p>
        )}
      </Card>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-fg-muted">{label}</div>
      <div className="mt-1 text-fg-app">{value}</div>
    </div>
  );
}
