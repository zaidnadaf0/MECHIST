import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { listHistory, type ServiceRequest } from '@/lib/customer';

export function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ServiceRequest[] | null>(null);
  const [filter, setFilter] = useState<'all'|'completed'|'cancelled'|'requested'|'accepted'>('all');
  const filtered = useMemo(() => {
    if (!items) return null;
    if (filter === 'all') return items;
    return items.filter((r) => r.status === filter);
  }, [items, filter]);

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

      <div className="mt-4 flex flex-wrap gap-2">
        {(["all","completed","cancelled","requested","accepted"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s as typeof filter)} className={'rounded-full px-3.5 py-1.5 text-small font-mono ring-1 ring-inset transition-colors ' + (filter===s ? 'bg-ink-900 text-white ring-ink-900 dark:bg-white dark:text-ink-900' : 'text-fg-muted ring-line-soft hover:text-fg-app') }>{s}</button>
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
              <Card key={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-body font-medium text-fg-app">Service {r.id.slice(-6).toUpperCase()}</div>
                    <div className="text-xs text-fg-muted">{new Date(r.createdAt).toLocaleString()}</div>
                    <p className="mt-1 text-small text-fg-muted line-clamp-1">{r.problemText}</p>
                    {/* History enrichment (Batch 2 row 7): optional amountCents/durationMin, compat — older docs have neither */}
                    {(r.amountCents != null || r.durationMin != null) && (
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-fg-muted">
                        {r.amountCents != null && <span>₹{(r.amountCents / 100).toFixed(2)}</span>}
                        {r.durationMin != null && <span>{r.durationMin} min</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'brand'}>
                      {r.status}
                    </Badge>
                    <Link to={`/track/${r.id}`}><Button variant="secondary" size="sm">View</Button></Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
