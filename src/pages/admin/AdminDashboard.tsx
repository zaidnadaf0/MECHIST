import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, useToast } from '@/components/ui';
import { ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn, MotionCard } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { watchStats, getOpsStats, fetchRequestsForExport, toCsv, downloadTextFile } from '@/lib/admin';
import { AdminDiagnosticsStrip } from './AdminDiagnosticsStrip';

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState<{ requests: number; mechanics: number; users: number } | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [ops, setOps] = useState<null | Awaited<ReturnType<typeof getOpsStats>>>(null);
  const [opsErr, setOpsErr] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    const unsub = watchStats((s) => { setStats(s); setStatsError(null); }, (err) => setStatsError(err.message));
    return () => { if (unsub) unsub(); };
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    getOpsStats(200).then((o) => { if (!cancelled) { setOps(o); setOpsErr(null); } }).catch((e) => { if (!cancelled) setOpsErr(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, []);

  const onExport = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const rows = await fetchRequestsForExport(500);
      if (rows.length === 0) { toast.push({ title: 'Nothing to export', tone: 'info' }); return; }
      downloadTextFile(`mechist-requests-${new Date().toISOString().slice(0,10)}.csv`, toCsv(rows));
      toast.push({ title: `Exported ${rows.length} requests`, tone: 'success' });
    } catch { toast.push({ title: 'Export failed', tone: 'danger' }); }
    finally { setTimeout(() => setExportBusy(false), 10_000); }
  };

  if (!user) return null;

  return (
    <main className="container section-compact">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Admin</div>
        <h1 className="mt-2 display text-display-md text-fg-app">Control room</h1>
        <p className="mt-2 text-small text-fg-muted">Approve mechanics, monitor the request queue, and manage users.</p>
      </FadeIn>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {stats === null ? (
          statsError ? (
            <div className="sm:col-span-3">
              <ErrorState kind="api" title="Could not load stats" description={statsError} onRetry={() => location.reload()} />
            </div>
          ) : (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          )
        ) : (
          <>
            <StatCard label="Open requests" value={stats.requests} />
            <StatCard label="Mechanics"     value={stats.mechanics} />
            <StatCard label="Users"         value={stats.users} />
          </>
        )}
      </div>

      <div className="mt-10 grid gap-3 md:grid-cols-3" id="admin-actions">
        <MotionCard lift="sm" className="p-6">
          <h2 className="text-h3 text-fg-app">Mechanic review</h2>
          <p className="mt-1 text-small text-fg-muted">Approve, reject, or audit the network.</p>
          <div className="mt-4"><Link to="/admin/mechanics"><Button variant="primary" size="sm">Open review</Button></Link></div>
        </MotionCard>
        <MotionCard lift="sm" className="p-6">
          <h2 className="text-h3 text-fg-app">Requests queue</h2>
          <p className="mt-1 text-small text-fg-muted">See every request, intervene when needed.</p>
          <div className="mt-4"><Link to="/admin/requests"><Button variant="primary" size="sm">Open queue</Button></Link></div>
        </MotionCard>
        <MotionCard lift="sm" className="p-6">
          <h2 className="text-h3 text-fg-app">Users</h2>
          <p className="mt-1 text-small text-fg-muted">Assign roles, audit access.</p>
          <div className="mt-4"><Link to="/admin/users"><Button variant="primary" size="sm">Manage users</Button></Link></div>
        </MotionCard>
      </div>

      <section className="mt-8" aria-labelledby="admin-ops-heading">
        <h2 id="admin-ops-heading" className="text-h3 text-fg-app">Operational diagnostics</h2>
        <p className="mt-1 text-xs text-fg-subtle">Real Firestore data &middot; capped reads &middot; CSV export admin-only &middot; rate-limited.</p>
        {opsErr ? (
          <p className="mt-3 text-xs text-danger-500">{opsErr}</p>
        ) : ops ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Card><div className="text-xs uppercase tracking-wider text-fg-muted">Total sampled</div><div className="mt-2 text-display-md text-fg-app">{ops.total}</div><div className="mt-1 text-xs text-fg-subtle">{Object.entries(ops.byStatus).map(([k,v]) => `${k}:${v}`).join(' · ') || '—'}</div></Card>
            <Card><div className="text-xs uppercase tracking-wider text-fg-muted">Avg ETA</div><div className="mt-2 text-display-md text-fg-app">{ops.avgEtaMin != null ? `${ops.avgEtaMin} min` : '—'}</div><div className="mt-1 text-xs text-fg-subtle">{Object.entries(ops.byCategory).slice(0,4).map(([k,v]) => `${k}:${v}`).join(' · ') || '—'}</div></Card>
            <Card><div className="text-xs uppercase tracking-wider text-fg-muted">Completed</div><div className="mt-2 text-display-md text-fg-app">{ops.completedRevenueCents != null ? `₹${(ops.completedRevenueCents/100).toFixed(2)}` : '—'}</div><div className="mt-1 text-xs text-fg-subtle">{ops.avgDurationMin != null ? `${ops.avgDurationMin} min avg` : 'no completed durations'} </div></Card>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onExport} disabled={exportBusy}>{exportBusy ? 'Export cooling down…' : 'Export CSV (real data, capped 500)'}</Button>
          <span className="text-xs text-fg-subtle">Writes real Firestore rows &middot; throttled 10s</span>
        </div>
      </section>

      <AdminDiagnosticsStrip stats={stats} />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wider text-fg-muted">{label}</div>
      <div className="mt-2 display text-display-md text-fg-app">{value}</div>
    </Card>
  );
}
