import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, SectionShell, StatusPill, RequestTimeline, Stars, useToast } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useAuth } from '@/app/AuthProvider';
import { getRequest, type ServiceRequest } from '@/lib/customer';
import { money } from '@/lib/format';

export function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [item, setItem] = useState<ServiceRequest | null | undefined>(undefined);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    if (!id) { setItem(null); return; }
    let cancelled = false;
    getRequest(id).then((r) => {
      if (cancelled) return;
      if (!r || r.customerId !== user.uid) setItem(null);
      else setItem(r);
    });
    return () => { cancelled = true; };
  }, [user, id, navigate]);

  const copyReference = async () => {
    if (!item || copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(item.id);
      toast.push({ title: 'Reference copied', tone: 'success' });
    } catch {
      toast.push({ title: 'Could not copy', description: 'Your reference ID is shown above — long-press to copy it manually.', tone: 'danger' });
    } finally {
      setCopying(false);
    }
  };

  if (!user) return null;
  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-6">
        <div className="text-xs uppercase tracking-wider text-fg-muted">Receipt</div>
        {item === undefined ? <Skeleton className="h-48" />
          : item === null ? <EmptyState kind="history" onAction={() => navigate('/history')} />
          : (
            <>
              <Card tone="azure" elevated>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="display text-display-sm text-fg-app">Service {item.id.slice(-6).toUpperCase()}</h1>
                    <p className="text-small text-fg-muted">{new Date(item.createdAt).toLocaleString()} · {item.problemCategory ?? 'general'}</p>
                    <p className="mt-1 font-mono text-xs text-fg-subtle" title="Full reference ID">Ref {item.id}</p>
                    <p className="mt-2 max-w-prose text-body text-fg-app">{item.problemText}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-small text-fg-muted">
                      {item.amountCents != null && <span>{money(item.amountCents / 100)}</span>}
                      {item.durationMin != null && <span>{item.durationMin} min</span>}
                      {typeof item.rating === 'number' && (
                        <span className="inline-flex items-center gap-1.5">
                          <Stars value={item.rating} size="xs" /> {item.rating}{item.comment ? ` — ${item.comment}` : ''}
                        </span>
                      )}
                      {item.mechanicName && <span>by {item.mechanicName}</span>}
                      {item.cancellationReason && <span>Cancelled: {item.cancellationReason}</span>}
                    </div>
                  </div>
                  <StatusPill status={item.status} size="md" />
                </div>
              </Card>
              <Card>
                <RequestTimeline status={item.status} />
              </Card>
              <div className="flex flex-wrap gap-2">
                <Link to="/history"><Button variant="secondary" size="md">All history</Button></Link>
                <Link to={`/track/${item.id}`}><Button variant="ghost" size="md">Open tracking</Button></Link>
                <Button variant="ghost" size="md" loading={copying} onClick={() => void copyReference()}>
                  Copy reference
                </Button>
                <Button variant="ghost" size="md" onClick={() => window.print()}>
                  Print
                </Button>
              </div>
            </>
          )}
      </div>
    </SectionShell>
  );
}
