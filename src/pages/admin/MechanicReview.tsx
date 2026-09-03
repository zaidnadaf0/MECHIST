import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, useToast } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { type MechanicProfile } from '@/lib/mechanic';
import { watchAllMechanics, approveMechanic } from '@/lib/admin';

export function MechanicReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<MechanicProfile[] | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    const unsub = watchAllMechanics(100, (m) => setItems(m));
    return () => { if (unsub) unsub(); };
  }, [user, navigate]);

  if (!user) return null;

  const setApproved = async (id: string, approved: boolean, name: string) => {
    if (!approved) {
      // Revocation is destructive (hides the mechanic from the public
      // roster instantly, possibly mid-job). Require an explicit confirm.
      const ok = window.confirm(
        `Revoke approval for ${name}? They will be hidden from the public roster immediately.`,
      );
      if (!ok) return;
    }
    const wrote = await approveMechanic(id, approved);
    if (wrote && items) {
      setItems(items.map((m) => m.id === id ? { ...m, approved } : m));
      toast.push({ title: approved ? 'Mechanic approved' : 'Approval revoked', tone: approved ? 'success' : 'info' });
    } else {
      toast.push({
        title: approved ? 'Could not approve' : 'Could not revoke',
        description: 'Check the Firestore rules and try again.',
        tone: 'danger',
      });
    }
  };

  return (
    <main className="container section-sm">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Mechanic review</div>
        <h1 className="mt-2 display text-display-md text-fg-app">Network</h1>
      </FadeIn>

      <div className="mt-8">
        {items === null ? (
          <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState kind="mechanics" title="No mechanics yet" description="Mechanic applications will appear here." />
        ) : (
          <div className="grid gap-3">
            {items.map((m) => (
              <Card key={m.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-body font-medium text-fg-app">{m.name}</div>
                    <div className="text-xs text-fg-muted">
                      {m.specialties.length > 0 ? m.specialties.join(' · ') : 'No specialties listed'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={m.approved ? 'success' : 'warning'}>
                      {m.approved ? 'Approved' : 'Pending'}
                    </Badge>
                    {m.approved ? (
                      <Button variant="secondary" size="sm" onClick={() => setApproved(m.id, false, m.name)}>Revoke</Button>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => setApproved(m.id, true, m.name)}>Approve</Button>
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
