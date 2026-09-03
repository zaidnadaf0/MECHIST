import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Badge, Button, useToast } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { watchAllRequests, cancelRequest } from '@/lib/admin';
import type { ServiceRequest } from '@/lib/customer';

export function RequestsQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<ServiceRequest[] | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    const unsub = watchAllRequests(100, (r) => setItems(r));
    return () => { if (unsub) unsub(); };
  }, [user, navigate]);

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

  return (
    <main className="container section-sm">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Requests</div>
        <h1 className="mt-2 display text-display-md text-fg-app">All requests</h1>
      </FadeIn>

      <div className="mt-8">
        {items === null ? (
          <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState kind="requests" title="No requests yet" />
        ) : (
          <div className="grid gap-3">
            {items.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-body font-medium text-fg-app">Service {r.id.slice(-6).toUpperCase()}</div>
                    <div className="text-xs text-fg-muted">{new Date(r.createdAt).toLocaleString()} · {r.problemCategory ?? '—'}</div>
                    <p className="mt-1 text-small text-fg-muted line-clamp-1">{r.problemText}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'brand'}>{r.status}</Badge>
                    <Link to={`/track/${r.id}`}><Button variant="secondary" size="sm">View</Button></Link>
                    {r.status !== 'completed' && r.status !== 'cancelled' && (
                      <Button variant="danger" size="sm" onClick={() => onCancel(r.id)}>Cancel</Button>
                    )}
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
