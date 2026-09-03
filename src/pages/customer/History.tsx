import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    listHistory(user.uid, 50).then((h) => { if (!cancelled) setItems(h); });
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (!user) return null;

  return (
    <main className="container section-sm">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Service history</div>
        <h1 className="mt-2 display text-display-md text-fg-app">Past services</h1>
      </FadeIn>

      <div className="mt-8">
        {items === null ? (
          <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState kind="history" />
        ) : (
          <div className="grid gap-3">
            {items.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-body font-medium text-fg-app">Service {r.id.slice(-6).toUpperCase()}</div>
                    <div className="text-xs text-fg-muted">{new Date(r.createdAt).toLocaleString()}</div>
                    <p className="mt-1 text-small text-fg-muted line-clamp-1">{r.problemText}</p>
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
