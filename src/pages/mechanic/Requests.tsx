import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Button, Card, CountdownRing, IconTile, SectionHeading, SectionShell, StatusPill } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useAuth } from '@/app/AuthProvider';
import { acceptJob, declineOffer, getMechanicProfile, listActiveJob, watchIncoming, type AcceptResult, type MechanicProfile } from '@/lib/mechanic';
import { OFFER_WINDOW_MS, type ServiceRequest } from '@/lib/customer';
import { offerDeadlineMs, formatCountdownMs } from '@/lib/format';
import { verificationUi } from '@/lib/authUI';
import { useToast } from '@/components/ui';

export function Requests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [queue, setQueue] = useState<ServiceRequest[] | null>(null);
  const [active, setActive] = useState<ServiceRequest | null>(null);
  const [profile, setProfile] = useState<MechanicProfile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    const unsub = watchIncoming(setQueue, () => setQueue([]), user.uid);
    listActiveJob(user.uid).then((r) => { if (r.data) setActive(r.data); });
    getMechanicProfile(user.uid).then((p) => { if (p) setProfile(p); });
    return () => { unsub?.(); };
  }, [user, navigate]);

  // Display-only ticker for the per-offer countdowns; idle when the
  // queue is empty. Eligibility stays server-side in acceptJob.
  useEffect(() => {
    if (!queue || queue.length === 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [queue]);

  if (!user) return null;

  const canAcceptJobs = verificationUi(profile?.verificationStatus ?? null).canAcceptJobs;

  const doAccept = async (job: ServiceRequest) => {
    if (busyId) return;
    if (!canAcceptJobs) {
      toast.push({ title: 'Verification required', description: 'Your application must be approved before you can accept jobs.', tone: 'info' });
      return;
    }
    setBusyId(job.id);
    // Mechanic display name comes from the real profile, matching the
    // dashboard flow — never the raw auth email.
    const res: AcceptResult = await acceptJob(job.id, user.uid, profile?.name ?? user.uid);
    if (res === 'accepted') { toast.push({ title: 'Job accepted', tone: 'success' }); navigate(`/mechanic/job/${job.id}`); }
    else if (res === 'expired') toast.push({ title: 'Offer expired', description: 'The offer window elapsed.', tone: 'info' });
    else if (res === 'alreadyTaken') toast.push({ title: 'Already taken', tone: 'info' });
    else toast.push({ title: 'Could not accept', tone: 'danger' });
    setBusyId(null);
  };
  const doDecline = async (job: ServiceRequest) => {
    if (busyId) return;
    setBusyId(job.id);
    const r = await declineOffer(job.id, user.uid);
    toast.push(r === 'declined' ? { title: 'Declined', tone: 'success' } : { title: 'Could not decline', tone: 'danger' });
    setBusyId(null);
  };

  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-6">
        <SectionHeading as="h1" size="sm" eyebrow="Queue" title="Incoming requests" description="Requested jobs only. Declined jobs are hidden from your queue." />
        {active && (
          <Card tone="aqua" elevated>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-body font-medium text-fg-app">Active job {active.id.slice(-6).toUpperCase()}</div>
                <div className="text-xs text-fg-muted">{active.problemText}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={active.status} size="sm" />
                <Button variant="primary" size="sm" onClick={() => navigate(`/mechanic/job/${active.id}`)}>Open job</Button>
              </div>
            </div>
          </Card>
        )}
        {queue === null ? <Skeleton className="h-32" />
          : queue.length === 0 ? <EmptyState kind="requests" />
          : (
            <div className="grid gap-3">
              {queue.map((j) => {
                const left = Math.max(0, offerDeadlineMs(j, OFFER_WINDOW_MS) - now);
                const urgent = left > 0 && left < 30_000;
                return (
                  <Card key={j.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <IconTile icon={<Wrench size={18} />} hue="aqua" size="md" />
                        <div className="min-w-0">
                          <div className="text-body font-bold text-fg-app">{j.problemCategory ?? 'Service'} · {j.id.slice(-6).toUpperCase()}</div>
                          <p className="mt-0.5 max-w-xl text-small text-fg-muted line-clamp-2">{j.problemText}</p>
                          <div className="mt-1 font-mono text-[11px] text-fg-subtle">
                            {new Date(j.createdAt).toLocaleString()}{j.etaMin != null ? ` · ~${j.etaMin} min` : ''}
                          </div>
                        </div>
                      </div>
                      <CountdownRing fraction={left / OFFER_WINDOW_MS} label={left === 0 ? '0:00' : formatCountdownMs(left)} urgent={urgent || left === 0} />
                    </div>
                    <dl className="mt-4 grid gap-0 border-t border-line-soft text-small">
                      <div className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5">
                        <dt className="text-fg-muted">Location</dt>
                        <dd className="font-mono text-xs text-fg-app">{j.customerLat.toFixed(4)}, {j.customerLng.toFixed(4)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 py-2.5">
                        <dt className="text-fg-muted">Customer note</dt>
                        <dd className="max-w-[60%] truncate text-right text-fg-app">{j.problemText}</dd>
                      </div>
                    </dl>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Button variant="success" size="md" fullWidth loading={busyId === j.id} disabled={busyId !== null || !canAcceptJobs} title={!canAcceptJobs ? 'Your application must be approved before you can accept jobs.' : undefined} onClick={() => void doAccept(j)}>Accept job</Button>
                      <Button variant="secondary" size="md" fullWidth loading={busyId === j.id} disabled={busyId !== null} onClick={() => void doDecline(j)}>Decline</Button>
                    </div>
                    {left === 0 && (
                      <p role="status" className="mt-2 text-center text-xs text-danger-500">Offer window elapsed — the dispatcher may already have moved on.</p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
      </div>
    </SectionShell>
  );
}
