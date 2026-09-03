import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { listCompletedJobs } from '@/lib/mechanic';
import type { ServiceRequest } from '@/lib/customer';

export function MechanicHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ServiceRequest[] | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    listCompletedJobs(user.uid, 30).then((h) => { if (!cancelled) setItems(h); });
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (!user) return null;

  return (
    <main className="container section-sm">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Job history</div>
        <h1 className="mt-2 display text-display-md text-fg-app">Completed jobs</h1>
      </FadeIn>

      <div className="mt-8">
        {items === null ? (
          <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState kind="history" title="No completed jobs yet" description="Once you finish a service, it will appear here." />
        ) : (
          <div className="grid gap-3">
            {items.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-body font-medium text-fg-app">Service {r.id.slice(-6).toUpperCase()}</div>
                    <div className="text-xs text-fg-muted">{new Date(r.updatedAt).toLocaleString()}</div>
                    <p className="mt-1 text-small text-fg-muted line-clamp-1">{r.problemText}</p>
                  </div>
                  <Badge tone="success">Completed</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
