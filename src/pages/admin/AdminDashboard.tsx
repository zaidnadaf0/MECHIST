import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Radio, Truck, Users2, Wrench } from 'lucide-react';
import { Badge, Button, Card, IconTile, MeterRow, OpsStatCard, useToast } from '@/components/ui';
import { ErrorState, EmptyState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import {
  watchStats, getOpsStats, fetchRequestsForExport, toCsv, downloadTextFile,
  watchAllRequests, listAllMechanics,
} from '@/lib/admin';
import type { ServiceRequest } from '@/lib/customer';
import type { MechanicProfile } from '@/lib/mechanic';
import { money, relTime } from '@/lib/format';
import { AdminDiagnosticsStrip } from './AdminDiagnosticsStrip';

const INFLIGHT: ReadonlyArray<ServiceRequest['status']> = ['requested', 'accepted', 'on-the-way', 'arrived', 'service'];

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState<{ requests: number; mechanics: number; users: number } | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [ops, setOps] = useState<null | Awaited<ReturnType<typeof getOpsStats>>>(null);
  const [opsErr, setOpsErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ServiceRequest[] | null>(null);
  const [mechs, setMechs] = useState<MechanicProfile[] | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    const unsubStats = watchStats((s) => { setStats(s); setStatsError(null); }, (err) => setStatsError(err.message));
    const unsubRows = watchAllRequests(200, setRows, () => setRows([]));
    return () => { unsubStats?.(); unsubRows?.(); };
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    getOpsStats(200).then((o) => { if (!cancelled) { setOps(o); setOpsErr(null); } }).catch((e) => { if (!cancelled) setOpsErr(e instanceof Error ? e.message : String(e)); });
    listAllMechanics(100).then((m) => { if (!cancelled) setMechs(m); });
    return () => { cancelled = true; };
  }, []);

  const unmatched = useMemo(
    () => (rows ?? []).filter((r) => r.status === 'requested' && !r.mechanicId),
    [rows],
  );
  const inflight = useMemo(
    () => (rows ?? []).filter((r) => INFLIGHT.includes(r.status)).slice(0, 5),
    [rows],
  );
  const onlineMechs = useMemo(() => (mechs ?? []).filter((m) => m.approved && m.isAvailable).length, [mechs]);
  const pendingMechs = useMemo(() => (mechs ?? []).filter((m) => !m.approved).length, [mechs]);
  const completedRows = useMemo(() => (rows ?? []).filter((r) => r.status === 'completed'), [rows]);
  const completionRate = useMemo(() => {
    const term = (rows ?? []).filter((r) => r.status === 'completed' || r.status === 'cancelled');
    return term.length ? (completedRows.length / term.length) * 100 : null;
  }, [rows, completedRows]);
  const monthBuckets = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: 'short' }), count: 0 };
    });
    for (const r of rows) {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.find((x) => x.key === key);
      if (b) b.count += 1;
    }
    return buckets;
  }, [rows]);
  const monthRevenue = useMemo(() => {
    if (!rows) return null;
    const now = new Date();
    let sum = 0;
    let n = 0;
    for (const r of rows) {
      const d = new Date(r.createdAt);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && typeof r.amountCents === 'number') {
        sum += r.amountCents;
        n += 1;
      }
    }
    return { total: sum / 100, count: n };
  }, [rows]);

  const onExport = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const data = await fetchRequestsForExport(500);
      if (data.length === 0) { toast.push({ title: 'Nothing to export', tone: 'info' }); return; }
      downloadTextFile(`mechist-requests-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(data));
      toast.push({ title: `Exported ${data.length} requests`, tone: 'success' });
    } catch { toast.push({ title: 'Export failed', tone: 'danger' }); }
    finally { setTimeout(() => setExportBusy(false), 10_000); }
  };

  if (!user) return null;

  return (
    <main className="container section-compact flex flex-col gap-6">
      <FadeIn>
        <h1 className="display text-display-md text-fg-app">Control room</h1>
        <p className="mt-1 text-small text-fg-muted">Live operations overview</p>
      </FadeIn>

      {/* ---------- KPI cards ---------- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats === null ? (
          statsError ? (
            <div className="sm:col-span-2 xl:col-span-4">
              <ErrorState kind="api" title="Could not load stats" description={statsError} onRetry={() => location.reload()} />
            </div>
          ) : (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)
          )
        ) : (
          <>
            <OpsStatCard icon={<Radio size={18} />} label="Open dispatches" tone="red" value={stats.requests} sub={unmatched.length === 0 ? 'queue is clear' : `${unmatched.length} still unmatched`} />
            <OpsStatCard icon={<Users2 size={18} />} label="Active mechanics" tone="green" value={stats.mechanics} sub={mechs === null ? 'loading roster…' : `${onlineMechs} online now`} />
            <OpsStatCard icon={<Wrench size={18} />} label="Pending approvals" tone="gold" value={mechs === null ? '—' : pendingMechs} sub="awaiting verification" />
            <OpsStatCard
              icon={<span className="font-mono text-body font-bold">₹</span>} label="Revenue this month" tone="ember"
              value={monthRevenue === null ? '—' : money(monthRevenue.total)}
              sub={monthRevenue === null ? 'loading…' : `${monthRevenue.count} recorded rescues`}
            />
          </>
        )}
      </div>

      {/* ---------- Unmatched banner ---------- */}
      {unmatched.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-4 rounded-2xl border border-warning-500/25 bg-warning-500/[0.07] p-4 sm:p-5">
          <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl bg-warning-500/15 text-warning-500">
            <Activity size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-body font-bold text-fg-app">
              {unmatched.length} request{unmatched.length === 1 ? '' : 's'} still unmatched
            </div>
            <p className="mt-0.5 text-small text-fg-muted">No mechanic has accepted yet — assign one manually.</p>
          </div>
          <Link to="/admin/dispatch">
            <Button variant="primary" size="md">Open dispatch board</Button>
          </Link>
        </div>
      )}

      {/* ---------- Health + all-time ---------- */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h2 className="text-h2 text-fg-app">Platform health</h2>
          <div className="mt-4 grid gap-4">
            <MeterRow label="Completion rate" display={completionRate != null ? `${completionRate.toFixed(1)}%` : '—'} pct={completionRate ?? 0} />
            <MeterRow label="Avg response (ETA)" display={ops?.avgEtaMin != null ? `${ops.avgEtaMin} min` : '—'} pct={ops?.avgEtaMin != null ? Math.min(100, (ops.avgEtaMin / 60) * 100) : 0} />
            <MeterRow
              label="Mechanics online"
              display={mechs === null ? '—' : `${onlineMechs} / ${mechs.length}`}
              pct={mechs && mechs.length ? (onlineMechs / mechs.length) * 100 : 0}
            />
          </div>
          {rows === null && <p className="mt-3 text-xs text-fg-subtle">Loading live rows…</p>}
        </Card>
        <Card>
          <h2 className="text-h2 text-fg-app">All time</h2>
          <dl className="mt-2 text-small">
            <div className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5">
              <dt className="text-fg-muted">Registered users</dt>
              <dd className="stat-num font-bold text-fg-app">{stats?.users ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5">
              <dt className="text-fg-muted">Total rescues</dt>
              <dd className="stat-num font-bold text-fg-app">{ops ? ops.total : '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-line-soft py-2.5">
              <dt className="text-fg-muted">Recorded revenue</dt>
              <dd className="stat-num font-bold text-fg-app">{ops?.completedRevenueCents != null ? money(ops.completedRevenueCents / 100) : '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-fg-muted">Avg job duration</dt>
              <dd className="stat-num font-bold text-fg-app">{ops?.avgDurationMin != null ? `${ops.avgDurationMin} min` : '—'}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* ---------- Monthly volume ---------- */}
      <section aria-labelledby="ops-monthly">
        <div className="flex items-end justify-between gap-3">
          <h2 id="ops-monthly" className="display text-h2 text-fg-app">Monthly volume</h2>
          <Link to="/admin/analytics" className="text-small text-azure-600 dark:text-azure-300 hover:underline">Full analytics</Link>
        </div>
        <div className="mt-3 rounded-2xl border border-line-soft bg-surface-1 p-4 sm:p-6">
          {!monthBuckets || (rows ?? []).length === 0 ? (
            <EmptyState compact kind="generic" title="No volume yet" description="Monthly bars appear once requests exist." />
          ) : (
            <div>
              <div className="flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label="Requests per month for the last six months">
                {monthBuckets.map((b) => {
                  const max = Math.max(...monthBuckets.map((x) => x.count), 1);
                  return (
                    <div key={b.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <span className="font-mono text-[11px] text-fg-muted">{b.count}</span>
                      <div
                        className="w-full max-w-10 rounded-t-lg bg-gradient-to-b from-ember-500 to-ember-600"
                        style={{ height: `${Math.max(4, (b.count / max) * 100)}%` }}
                      />
                      <span className="text-[11px] text-fg-subtle">{b.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-fg-subtle">Sampled from the latest {rows?.length ?? 0} requests (cap 200).</p>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Open dispatches ---------- */}
      <section aria-labelledby="ops-open">
        <div className="flex items-end justify-between gap-3">
          <h2 id="ops-open" className="display text-h2 text-fg-app">Open dispatches</h2>
          <Link to="/admin/dispatch" className="text-small text-azure-600 dark:text-azure-300 hover:underline">Dispatch board</Link>
        </div>
        <div className="mt-3">
          {rows === null ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : inflight.length === 0 ? (
            <EmptyState compact kind="requests" title="No open dispatches" description="New requests appear here in realtime." />
          ) : (
            <div className="grid gap-3">
              {inflight.map((r) => (
                <Card key={r.id} interactive onClick={() => navigate('/admin/dispatch')}>
                  <div className="flex items-center gap-3">
                    <IconTile icon={<Truck size={18} />} hue="azure" size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-body font-bold text-fg-app">{shortId(r.id)} · {r.problemCategory ?? 'general'}</span>
                        <Badge tone={r.status === 'requested' && !r.mechanicId ? 'warning' : 'brand'} size="sm" dot>{r.status}</Badge>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-fg-muted">
                        {shortId(r.customerId)} · {r.mechanicName ?? 'unassigned'}
                      </div>
                    </div>
                    {r.amountCents != null && (
                      <span className="stat-num shrink-0 text-body font-bold text-fg-app">{money(r.amountCents / 100)}</span>
                    )}
                    <span className="shrink-0 font-mono text-xs text-fg-subtle">{relTime(r.updatedAt) || ''}</span>
                    <ArrowRight size={16} className="shrink-0 text-fg-subtle" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Ops links + export ---------- */}
      <div className="grid gap-3 md:grid-cols-3" id="admin-actions">
        <Card>
          <h2 className="text-h3 text-fg-app">Mechanic review</h2>
          <p className="mt-1 text-small text-fg-muted">Approve, reject, or audit the network.</p>
          <div className="mt-4"><Link to="/admin/mechanics"><Button variant="primary" size="sm">Open review</Button></Link></div>
        </Card>
        <Card>
          <h2 className="text-h3 text-fg-app">Requests queue</h2>
          <p className="mt-1 text-small text-fg-muted">See every request, intervene when needed.</p>
          <div className="mt-4"><Link to="/admin/requests"><Button variant="primary" size="sm">Open queue</Button></Link></div>
        </Card>
        <Card>
          <h2 className="text-h3 text-fg-app">Reports & logs</h2>
          <p className="mt-1 text-small text-fg-muted">CSV export + recent activity.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={onExport} disabled={exportBusy}>{exportBusy ? 'Export cooling down…' : 'Export CSV'}</Button>
            <Link to="/admin/logs"><Button variant="ghost" size="sm">Logs</Button></Link>
          </div>
        </Card>
      </div>

      <section aria-labelledby="admin-ops-heading">
        <h2 id="admin-ops-heading" className="text-h3 text-fg-app">Operational diagnostics</h2>
        <p className="mt-1 text-xs text-fg-subtle">Real Firestore data · capped reads · CSV export admin-only · rate-limited.</p>
        {opsErr ? (
          <p className="mt-3 text-xs text-danger-500">{opsErr}</p>
        ) : !ops ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Card><div className="text-xs uppercase tracking-wider text-fg-muted">Total sampled</div><div className="mt-2 text-display-md text-fg-app">{ops.total}</div><div className="mt-1 text-xs text-fg-subtle">{Object.entries(ops.byStatus).map(([k, v]) => `${k}:${v}`).join(' · ') || '—'}</div></Card>
            <Card><div className="text-xs uppercase tracking-wider text-fg-muted">Unassigned / expired</div><div className="mt-2 text-display-md text-fg-app">{ops.unassignedRequested}</div><div className="mt-1 text-xs text-fg-subtle">{ops.expiredOffers} past expiry</div></Card>
            <Card><div className="text-xs uppercase tracking-wider text-fg-muted">Users / mechanics</div><div className="mt-2 text-display-md text-fg-app">{stats?.users ?? '—'}</div><div className="mt-1 text-xs text-fg-subtle">{onlineMechs} online · {pendingMechs} pending</div></Card>
          </div>
        )}
      </section>

      <AdminDiagnosticsStrip stats={stats} />
    </main>
  );
}

function shortId(id: string): string {
  return id.slice(-6).toUpperCase();
}
