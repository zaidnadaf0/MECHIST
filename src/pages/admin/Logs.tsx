import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, SectionHeading, SectionShell } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useAuth } from '@/app/AuthProvider';
import { watchAllRequests } from '@/lib/admin';
import type { ServiceRequest } from '@/lib/customer';

type LogFilter = 'all' | 'assigned' | 'released' | 'cancelled' | 'rated';

export function Logs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ServiceRequest[] | null>(null);
  const [filter, setFilter] = useState<LogFilter>('all');

  useEffect(() => {
    if (!user) { navigate('/admin/login', { replace: true }); return; }
    const unsub = watchAllRequests(50, setRows, () => setRows([]));
    return () => { unsub?.(); };
  }, [user, navigate]);

  const visible = useMemo(() => {
    if (!rows) return null;
    if (filter === 'assigned') return rows.filter((r) => r.mechanicId);
    if (filter === 'released') return rows.filter((r) => r.releaseReason);
    if (filter === 'cancelled') return rows.filter((r) => r.status === 'cancelled');
    if (filter === 'rated') return rows.filter((r) => typeof r.rating === 'number');
    return rows;
  }, [rows, filter]);

  if (!user) return null;
  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-6">
        <SectionHeading as="h1" size="sm" eyebrow="Audit" title="Logs" description="Request-derived events only (latest 50) — not a complete backend audit log. No synthetic entries." />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Event filter">
          {(['all', 'assigned', 'released', 'cancelled', 'rated'] as const).map((f) => (
            <button
              key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={'rounded-full px-3.5 py-1.5 text-small font-mono ring-1 ring-inset transition-colors ' + (filter === f ? 'bg-ink-900 text-white ring-ink-900 dark:bg-white dark:text-ink-900' : 'text-fg-muted ring-line-soft hover:text-fg-app')}
            >
              {f}
            </button>
          ))}
          <span aria-live="polite" className="ml-auto font-mono text-xs text-fg-subtle">
            {visible === null ? 'loading…' : `${visible.length} event${visible.length === 1 ? '' : 's'}`}
          </span>
        </div>
        {visible === null ? <Skeleton className="h-32" />
          : visible.length === 0 ? <EmptyState kind="generic" title="No activity yet" description="Recent request changes will appear here." />
          : (
            <div className="grid gap-2">
              {visible.map((r) => (
                <Card key={r.id}>
                  <div className="flex flex-wrap justify-between gap-2 text-small">
                    <span className="text-fg-app">{new Date(r.updatedAt).toLocaleString()} · {r.id.slice(-6).toUpperCase()} → {r.status}</span>
                    <span className="text-fg-subtle">{r.mechanicName ? `mech ${r.mechanicName}` : 'unassigned'}{r.releaseReason ? ` · released: ${r.releaseReason}` : ''}{r.cancellationReason ? ` · cancelled: ${r.cancellationReason}` : ''}{typeof r.rating === 'number' ? ` · ★${r.rating}` : ''}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
      </div>
    </SectionShell>
  );
}
