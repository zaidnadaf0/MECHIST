import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Button, Card, IconTile, SectionHeading, SectionShell, StatusPill } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useAuth } from '@/app/AuthProvider';
import { adminAssignRequest, adminReassignRequest, listAllMechanics, watchAllRequests, type AdminAssignResult } from '@/lib/admin';
import type { ServiceRequest } from '@/lib/customer';
import type { MechanicProfile } from '@/lib/mechanic';
import { useToast } from '@/components/ui';

type DispatchFilter = 'all' | 'unassigned' | 'inflight';

export function Dispatch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<ServiceRequest[] | null>(null);
  const [mechs, setMechs] = useState<MechanicProfile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<DispatchFilter>('all');

  useEffect(() => {
    if (!user) { navigate('/admin/login', { replace: true }); return; }
    const unsub = watchAllRequests(100, (items) => setRows(items.filter((r) => ['requested', 'accepted', 'on-the-way', 'arrived', 'service'].includes(r.status))), () => setRows([]));
    // Eligible pool only: approved + available. The transactions stay
    // authoritative (rules + race guards); this keeps the UI from
    // offering mechanics who can't legally take the job.
    listAllMechanics(100).then((m) => setMechs(m.filter((x) => x.approved && x.isAvailable)));
    return () => { unsub?.(); };
  }, [user, navigate]);

  const visible = useMemo(() => {
    if (!rows) return null;
    if (filter === 'unassigned') return rows.filter((r) => r.status === 'requested' && !r.mechanicId);
    if (filter === 'inflight') return rows.filter((r) => r.status !== 'requested' || r.mechanicId);
    return rows;
  }, [rows, filter]);

  if (!user) return null;

  const assign = async (req: ServiceRequest, mechId: string) => {
    if (busyId) return;
    // Unassigned queued requests go through adminAssignRequest; anything
    // already carrying a mechanic goes through adminReassignRequest so the
    // audit reason path and clobber-guards apply. Both are transactional
    // and race-safe; a non-admin caller gets `forbidden` from the rules.
    const isFresh = req.status === 'requested' && !req.mechanicId;
    setBusyId(req.id);
    const r: AdminAssignResult = await (isFresh
      ? adminAssignRequest(req.id, mechId)
      : adminReassignRequest(req.id, mechId));
    if (r === 'assigned') toast.push({ title: isFresh ? 'Assigned' : 'Reassigned', tone: 'success' });
    else if (r === 'invalid_state') toast.push({ title: 'Cannot assign in this state', description: 'The request changed — the list refreshes live.', tone: 'info' });
    else if (r === 'forbidden') toast.push({ title: 'Admin claim required', tone: 'danger' });
    else toast.push({ title: isFresh ? 'Assign failed' : 'Reassign failed', tone: 'danger' });
    setBusyId(null);
  };

  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-6">
        <SectionHeading as="h1" size="sm" eyebrow="Live" title="Dispatch" description="Unassigned queue + in-flight jobs. Assignment is transactional; approved + available mechanics only." />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Dispatch filter">
          {(['all', 'unassigned', 'inflight'] as const).map((f) => (
            <button
              key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={'rounded-full px-3.5 py-1.5 text-small font-mono ring-1 ring-inset transition-colors ' + (filter === f ? 'bg-ink-900 text-white ring-ink-900 dark:bg-white dark:text-ink-900' : 'text-fg-muted ring-line-soft hover:text-fg-app')}
            >
              {f === 'all' ? `all · ${rows?.length ?? '—'}` : f === 'unassigned' ? `needs assignment · ${rows?.filter((r) => r.status === 'requested' && !r.mechanicId).length ?? '—'}` : `in flight · ${rows?.filter((r) => r.status !== 'requested' || r.mechanicId).length ?? '—'}`}
            </button>
          ))}
        </div>
        {visible === null ? <Skeleton className="h-32" />
          : visible.length === 0 ? <EmptyState kind="requests" title={filter === 'unassigned' ? 'Nothing waiting' : undefined} description={filter === 'unassigned' ? 'Every queued request has a mechanic.' : undefined} />
          : (
            <div className="grid gap-3">
              {visible.map((r) => {
                const isFresh = r.status === 'requested' && !r.mechanicId;
                return (
                  <Card key={r.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <IconTile icon={<Wrench size={18} />} hue={r.status === 'requested' && !r.mechanicId ? 'gold' : 'azure'} size="md" />
                        <div className="min-w-0">
                          <div className="text-body font-bold text-fg-app">{r.id.slice(-6).toUpperCase()} · {r.problemCategory ?? 'general'}</div>
                          <p className="mt-0.5 max-w-xl text-small text-fg-muted line-clamp-1">{r.problemText}</p>
                          <div className="mt-1 text-xs text-fg-subtle">mech: {r.mechanicName ?? 'unassigned'}{r.etaMin != null ? ` · ~${r.etaMin} min` : ''}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill status={r.status} size="sm" />
                        <select
                          aria-label={`${isFresh ? 'Assign' : 'Reassign'} ${r.id}`}
                          className="rounded-lg border border-line-soft bg-surface-1 px-2 py-1.5 text-small"
                          defaultValue=""
                          disabled={busyId === r.id || mechs.length === 0}
                          onChange={(e) => { if (e.target.value) void assign(r, e.target.value); e.target.value = ''; }}
                        >
                          <option value="" disabled>{isFresh ? 'Assign…' : 'Reassign…'}</option>
                          {mechs.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        <Button variant="ghost" size="sm" loading={busyId === r.id} onClick={() => navigate(`/admin/requests`)}>Open queue</Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
      </div>
    </SectionShell>
  );
}
