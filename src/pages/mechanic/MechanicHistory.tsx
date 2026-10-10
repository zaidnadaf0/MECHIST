import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Stars, StatusPill } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { listCompletedJobs } from '@/lib/mechanic';
import { money } from '@/lib/format';
import type { ServiceRequest } from '@/lib/customer';

export function MechanicHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ServiceRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    listCompletedJobs(user.uid, 30).then((r) => { if (!cancelled) { if (r.error) { console.warn('[MechanicHistory] listCompletedJobs failed:', r.error); setError(r.error.message ?? String(r.error)); } else { setError(null); } setItems(r.data ?? []); } });
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (!user) return null;

  return (
    <main className="container section-compact">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Job history</div>
        <h1 className="mt-2 display text-display-md text-fg-app">Completed jobs</h1>
      </FadeIn>

      <div className="mt-8">
        {items === null ? (
          <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : error ? (
          <ErrorState kind="api" title="Could not load history" description={error} retryLabel="Retry" onRetry={() => location.reload()} />
        ) : items.length === 0 ? (
          <EmptyState compact kind="history" title="No completed jobs yet" description="Once you finish a service, it will appear here." />
        ) : (
          <div className="grid gap-3">
            {items.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-body font-medium text-fg-app">
                      {r.problemCategory ?? 'Service'} · {r.id.slice(-6).toUpperCase()}
                    </div>
                    <div className="text-xs text-fg-muted">
                      Completed {new Date(r.updatedAt).toLocaleString()}
                      {r.durationMin != null ? ` · ${r.durationMin} min on site` : ''}
                    </div>
                    <p className="mt-1 text-small text-fg-muted line-clamp-1">{r.problemText}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                      {r.amountCents != null
                        ? <span className="font-medium text-fg-app">{money(r.amountCents / 100)}</span>
                        : <span>No recorded amount</span>}
                      {typeof r.rating === 'number' && (
                        <span className="inline-flex items-center gap-1">
                          <Stars value={r.rating} size="xs" /> {r.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusPill status="completed" size="sm" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
