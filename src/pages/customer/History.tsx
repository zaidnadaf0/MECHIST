import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wrench } from 'lucide-react';
import { Card, Badge, StatusPill, Stars, IconTile } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { listHistory, type ServiceRequest } from '@/lib/customer';
import { money } from '@/lib/format';
import type { CanonicalStatus } from '@/lib/requestStatus';

type Filter = 'all' | CanonicalStatus;

/** Every real request status is filterable — same vocabulary as the backend. */
const FILTERS: Filter[] = ['all', 'requested', 'accepted', 'on-the-way', 'arrived', 'service', 'completed', 'cancelled'];

const DONUT_TONES: Record<string, string> = {
  requested: '#3b82f6',
  accepted: '#22d3ee',
  'on-the-way': '#a78bfa',
  arrived: '#f59e0b',
  service: '#eab308',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

export function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ServiceRequest[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = useMemo(() => {
    if (!items) return null;
    if (filter === 'all') return items;
    return items.filter((r) => r.status === filter);
  }, [items, filter]);

  // Real status distribution across the customer's own history.
  const dist = useMemo(() => {
    if (!items || items.length === 0) return null;
    const counts = new Map<CanonicalStatus, number>();
    for (const r of items) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    const entries = [...counts.entries()].filter(([, n]) => n > 0);
    if (entries.length === 0) return null;
    const total = entries.reduce((t, [, n]) => t + n, 0);
    let acc = 0;
    const segs = entries.map(([status, n]) => {
      const frac = n / total;
      const seg = { status, n, from: acc, to: acc + frac };
      acc += frac;
      return seg;
    });
    return { segs, total };
  }, [items]);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    listHistory(user.uid, 50).then((h) => { if (!cancelled) setItems(h); });
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (!user) return null;

  return (
    <main className="container section-compact">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Service history</div>
        <h1 className="mt-2 display text-display-md text-fg-app">Past services</h1>
      </FadeIn>

      {dist && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center gap-5">
            <StatusDonut segs={dist.segs} total={dist.total} />
            <ul className="grid flex-1 gap-1.5" aria-label="Requests by status">
              {dist.segs.map(({ status, n }) => (
                <li key={status} className="flex items-center gap-2 text-small">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: DONUT_TONES[status] ?? '#94a3b8' }}
                  />
                  <StatusPill status={status} size="sm" />
                  <span className="ml-auto font-mono text-fg-muted">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((s) => (
          <button
            key={s} type="button" onClick={() => setFilter(s)} aria-pressed={filter === s}
            className={'rounded-full px-3.5 py-1.5 text-small font-mono ring-1 ring-inset transition-colors ' + (filter === s ? 'bg-ink-900 text-white ring-ink-900 dark:bg-white dark:text-ink-900' : 'text-fg-muted ring-line-soft hover:text-fg-app')}
          >
            {s === 'all' ? 'all' : s}
            {s !== 'all' && items ? ` · ${items.filter((r) => r.status === s).length}` : ''}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {items === null ? (
          <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : (filtered?.length ?? 0) === 0 ? (
          items !== null && items.length > 0 ? <EmptyState kind="filtered" /> : <EmptyState compact kind="history" />
        ) : (
          <div className="grid gap-3">
            {filtered!.map((r) => (
              <Card key={r.id} interactive onClick={() => navigate(`/history/${r.id}`)}>
                <div className="flex items-center gap-3">
                  <IconTile icon={<Wrench size={18} />} hue={r.status === 'completed' ? 'gold' : r.status === 'cancelled' ? 'neutral' : 'iris'} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-body font-bold text-fg-app">
                        {r.problemCategory ?? 'Service'} · {r.id.slice(-6).toUpperCase()}
                      </span>
                      <Badge tone={r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'brand'} size="sm">
                        {r.status}
                      </Badge>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-fg-muted">
                      {r.mechanicName ?? 'Awaiting mechanic'} · {new Date(r.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                      {r.amountCents != null && <span className="font-medium text-fg-app">{money(r.amountCents / 100)}</span>}
                      {r.durationMin != null && <span>{r.durationMin} min</span>}
                      {typeof r.rating === 'number' && (
                        <span className="inline-flex items-center gap-1">
                          <Stars value={r.rating} size="xs" /> {r.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-fg-subtle" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/** Pure-SVG donut of the customer's own request statuses — no chart dependency. */
function StatusDonut({ segs, total }: { segs: Array<{ status: CanonicalStatus; n: number; from: number; to: number }>; total: number }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-4">
      <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label={`${total} requests by status`}>
        <circle cx="48" cy="48" r={R} fill="none" strokeWidth="14" className="stroke-hair" stroke="currentColor" opacity={0.15} />
        {segs.map(({ status, from, to }) => (
          <circle
            key={status}
            cx="48" cy="48" r={R} fill="none" strokeWidth="14"
            stroke={DONUT_TONES[status] ?? '#94a3b8'}
            strokeDasharray={`${Math.max(0, (to - from) * C - 2)} ${C}`}
            strokeLinecap="butt"
            transform={`rotate(${-90 + from * 360} 48 48)`}
          >
            <title>{`${status}: ${segs.find((s) => s.status === status)?.n ?? 0}`}</title>
          </circle>
        ))}
        <text x="48" y="48" textAnchor="middle" dominantBaseline="central" className="fill-fg-app font-mono" fontSize="20" fontWeight={700}>
          {total}
        </text>
      </svg>
    </div>
  );
}
