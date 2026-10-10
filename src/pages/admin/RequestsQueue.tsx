/**
 * Admin Requests Queue — Batch 3 row 8 + row 9 wiring.
 * Callers: App.tsx admin routes (/admin/requests), AdminDashboard link, useAuth gate.
 * Affected API: src/lib/admin.ts watchAllRequests/cancelRequest/listAllMechanics/adminAssignRequest/adminReassignRequest/fetchRequestsForExport/toCsv/downloadTextFile; Firestore requests/{id}, mechanics/{uid} (isClaimAdmin authoritative).
 * Schemas: ServiceRequest {id,status,problemCategory,problemText,customerId,mechanicId,mechanicName,etaMin,offerExpiresAt,createdAt,updatedAt,amountCents,durationMin,rating}; MechanicProfile {id,name,approved,isAvailable}.
 * Verbatim: Batch 3 — ADMIN FUNCTIONALITY rows 8–9: 8. Admin Assign/Reassign via forceRematch/assignTopCandidate/matching primitives admin-only transactional handle races do not bypass rules; 9. diagnostics/analytics/reports real Firestore data operational stats CSV export admin-only do not fabricate rate-limited.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Badge, Button, useToast } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import {
  watchAllRequests,
  cancelRequest,
  listAllMechanics,
  adminAssignRequest,
  adminReassignRequest,
  fetchRequestsForExport,
  toCsv,
  downloadTextFile,
} from '@/lib/admin';
import type { ServiceRequest } from '@/lib/customer';
import type { MechanicProfile } from '@/lib/mechanic';

const ASSIGNABLE = new Set(['requested', 'accepted', 'on-the-way', 'arrived', 'service']);

type QueueFilter = 'all' | 'unassigned' | 'inflight' | 'closed';

export function RequestsQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<ServiceRequest[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mechanics, setMechanics] = useState<MechanicProfile[] | null>(null);
  const [pickByReq, setPickByReq] = useState<Record<string, string>>({});
  const [busyByReq, setBusyByReq] = useState<Record<string, boolean>>({});
  const [exportBusy, setExportBusy] = useState(false);
  const [filter, setFilter] = useState<QueueFilter>('all');

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    const unsub = watchAllRequests(100, (r) => { setItems(r); setErr(null); }, (e) => setErr(e.message));
    return () => { if (unsub) unsub(); };
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    listAllMechanics(100).then((m) => { if (!cancelled) setMechanics(m); });
    return () => { cancelled = true; };
  }, []);

  const mechanicOptions = useMemo(() => {
    if (!mechanics) return [];
    // Eligible pool only (approved + available), consistent with Dispatch.
    // The transactions + rules stay authoritative.
    return mechanics
      .filter((m) => m.approved && m.isAvailable)
      .map((m) => ({ id: m.id, label: m.name }));
  }, [mechanics]);

  const visible = useMemo(() => {
    if (!items) return null;
    if (filter === 'unassigned') return items.filter((r) => r.status === 'requested' && !r.mechanicId);
    if (filter === 'inflight') return items.filter((r) => ASSIGNABLE.has(r.status) && (r.status !== 'requested' || r.mechanicId));
    if (filter === 'closed') return items.filter((r) => r.status === 'completed' || r.status === 'cancelled');
    return items;
  }, [items, filter]);

  if (!user) return null;

  const onCancel = async (id: string) => {
    const ok = window.confirm(
      'Cancel this request? The customer and assigned mechanic will see the change immediately.',
    );
    if (!ok) return;
    const wrote = await cancelRequest(id);
    if (wrote && items) {
      setItems(items.map((r) => r.id === id ? { ...r, status: 'cancelled' } : r));
      toast.push({ title: 'Request cancelled', tone: 'warning' });
    } else {
      toast.push({
        title: 'Could not cancel request',
        description: 'Check the Firestore rules and try again.',
        tone: 'danger',
      });
    }
  };

  const onExport = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const rows = await fetchRequestsForExport(500);
      if (rows.length === 0) {
        toast.push({ title: 'Nothing to export', description: 'No requests found.', tone: 'info' });
        return;
      }
      const csv = toCsv(rows);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadTextFile(`mechist-requests-${stamp}.csv`, csv);
      toast.push({ title: `Exported ${rows.length} requests`, tone: 'success' });
    } catch {
      toast.push({ title: 'Export failed', tone: 'danger' });
    } finally {
      setTimeout(() => setExportBusy(false), 10_000);
    }
  };

  const onAssign = async (r: ServiceRequest, mode: 'assign' | 'reassign') => {
    const mechId = pickByReq[r.id];
    if (!mechId) {
      toast.push({ title: 'Pick a mechanic first', tone: 'info' });
      return;
    }
    if (busyByReq[r.id]) return;
    setBusyByReq((prev) => ({ ...prev, [r.id]: true }));
    try {
      const fn = mode === 'assign' ? adminAssignRequest : adminReassignRequest;
      const result = await fn(r.id, mechId);
      if (result === 'assigned') {
        toast.push({ title: mode === 'assign' ? 'Request assigned' : 'Request reassigned', tone: 'success' });
      } else if (result === 'invalid_state') {
        toast.push({ title: 'Could not assign — status changed', description: 'The request was updated by someone else. The list will refresh.', tone: 'warning' });
      } else if (result === 'forbidden') {
        toast.push({ title: 'Not allowed', description: 'Admin claim required (request.auth.token.admin == true).', tone: 'danger' });
      } else {
        toast.push({ title: 'Assign failed', description: 'Check the mechanic and request, then try again.', tone: 'danger' });
      }
    } finally {
      setBusyByReq((prev) => ({ ...prev, [r.id]: false }));
    }
  };

  return (
    <main className="container section-compact">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Requests</div>
        <h1 className="mt-2 display text-display-md text-fg-app">All requests</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onExport} disabled={exportBusy}>
            {exportBusy ? 'Export cooling down…' : 'Export CSV (real data, capped 500)'}
          </Button>
          <span className="text-xs text-fg-subtle">Admin-only · rate-limited · reads live Firestore</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Queue filter">
          {(['all', 'unassigned', 'inflight', 'closed'] as const).map((f) => (
            <button
              key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={'rounded-full px-3.5 py-1.5 text-small font-mono ring-1 ring-inset transition-colors ' + (filter === f ? 'bg-ink-900 text-white ring-ink-900 dark:bg-white dark:text-ink-900' : 'text-fg-muted ring-line-soft hover:text-fg-app')}
            >
              {f}
            </button>
          ))}
        </div>
      </FadeIn>

      <div className="mt-8">
        {err ? (
          <ErrorState kind="api" title="Could not load requests" description={err} retryLabel="Retry" onRetry={() => location.reload()} />
        ) : visible === null ? (
          <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : visible.length === 0 ? (
          <EmptyState kind="requests" title="No requests here" description={filter === 'all' ? undefined : 'Try a different filter.'} />
        ) : (
          <div className="grid gap-3">
            {visible.map((r) => {
              const isAssignable = ASSIGNABLE.has(r.status);
              const mode: 'assign' | 'reassign' = r.status === 'requested' ? 'assign' : 'reassign';
              const busy = !!busyByReq[r.id];
              return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-body font-medium text-fg-app truncate">Service {r.id.slice(-6).toUpperCase()}</div>
                    <div className="text-xs text-fg-muted">{new Date(r.createdAt).toLocaleString()} · {r.problemCategory ?? '—'}</div>
                    <p className="mt-1 text-small text-fg-muted line-clamp-1">{r.problemText}</p>
                    {r.mechanicId && <div className="mt-1 text-xs text-fg-subtle">Mechanic: {r.mechanicName ?? r.mechanicId} · {r.mechanicId.slice(0, 6)}…</div>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'brand'}>{r.status}</Badge>
                    <Link to="/admin/dispatch"><Button variant="secondary" size="sm">Dispatch</Button></Link>
                    {r.status !== 'completed' && r.status !== 'cancelled' && (
                      <Button variant="danger" size="sm" onClick={() => onCancel(r.id)}>Cancel</Button>
                    )}
                  </div>
                </div>
                {isAssignable && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
                    <label htmlFor={`assign-${r.id}`} className="text-xs font-medium text-fg-muted">Admin {mode}:</label>
                    <select
                      id={`assign-${r.id}`}
                      value={pickByReq[r.id] ?? ''}
                      onChange={(e) => setPickByReq((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      disabled={busy || !mechanics}
                      className="h-8 rounded-md border border-line-soft bg-surface-app px-2 text-xs text-fg-app disabled:opacity-50"
                    >
                      <option value="">{mechanics ? 'Pick mechanic…' : 'Loading mechanics…'}</option>
                      {mechanicOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busy || !pickByReq[r.id]}
                      onClick={() => onAssign(r, mode)}
                    >
                      {busy ? '…' : mode === 'assign' ? 'Assign' : 'Reassign'}
                    </Button>
                    {busy && <span className="text-xs text-fg-subtle">Working…</span>}
                  </div>
                )}
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
