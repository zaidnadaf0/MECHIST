import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, SectionHeading, SectionShell } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { useAuth } from '@/app/AuthProvider';
import { markAllRead, markRead } from '@/lib/notifications';
import { useNotifications } from '@/lib/useNotifications';
import { relTime } from '@/lib/format';
import { useToast } from '@/components/ui';

/**
 * Mechanic inbox (Batch 6). Same shared subscription architecture as the
 * customer inbox; server producers deep-link here via `path`
 * (/mechanic/job/:id, /mechanic/requests). Falls back to the queue link
 * for items without a path.
 */
export function MechanicNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [markingAll, setMarkingAll] = useState(false);
  const { items, error } = useNotifications(user?.uid ?? null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); }
  }, [user, navigate]);

  if (!user) return null;
  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-6">
        <SectionHeading
          as="h1" size="sm" eyebrow="Inbox" title="Notifications"
          actions={items && items.length > 0 ? <Button variant="ghost" size="sm" loading={markingAll} onClick={() => {
            if (markingAll || !user) return;
            setMarkingAll(true);
            void markAllRead(user.uid).then((ok) => {
              setMarkingAll(false);
              toast.push(ok ? { title: 'All marked read', tone: 'success' } : { title: 'Could not update', tone: 'danger' });
            });
          }}>Mark all read</Button> : null}
        />
        {items === null && !error ? <Skeleton className="h-32" />
          : error ? <ErrorState kind="api" title="Could not load notifications" description={error.message} retryLabel="Retry" onRetry={() => location.reload()} />
          : items === null || items.length === 0 ? <EmptyState kind="generic" title="No notifications" description="Job assignments and updates will appear here." />
          : (
            <div className="grid gap-3">
              {items.map((n) => (
                <Card key={n.id} tone={n.read ? undefined : 'aqua'}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-body font-medium text-fg-app">{n.title}</div>
                      {n.body && <p className="mt-1 text-small text-fg-muted">{n.body}</p>}
                      <div className="mt-1 text-xs text-fg-subtle">{relTime(n.createdAt) || new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      {(n.path ?? (n.requestId ? `/mechanic/job/${n.requestId}` : null)) && (
                        <Link to={(n.path ?? `/mechanic/job/${n.requestId}`) as string}>
                          <Button variant="secondary" size="sm">Open job</Button>
                        </Link>
                      )}
                      {!n.read && <Button variant="ghost" size="sm" onClick={() => void markRead(user.uid, n.id)}>Mark read</Button>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
      </div>
    </SectionShell>
  );
}
