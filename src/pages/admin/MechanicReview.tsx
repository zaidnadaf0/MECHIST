import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, useToast } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { type MechanicProfile } from '@/lib/mechanic';
import { watchAllMechanics, approveMechanic } from '@/lib/admin';

type Tab = 'pending' | 'approved' | 'all';

export function MechanicReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<MechanicProfile[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    const unsub = watchAllMechanics(100, (m) => { setItems(m); setErr(null); }, (e) => setErr(e.message));
    return () => { if (unsub) unsub(); };
  }, [user, navigate]);

  const counts = useMemo(() => {
    if (!items) return null;
    return {
      pending: items.filter((m) => !m.approved).length,
      approved: items.filter((m) => m.approved).length,
      all: items.length,
    };
  }, [items]);

  const visible = useMemo(() => {
    if (!items) return null;
    if (tab === 'pending') return items.filter((m) => !m.approved);
    if (tab === 'approved') return items.filter((m) => m.approved);
    return items;
  }, [items, tab]);

  if (!user) return null;

  const setApproved = async (id: string, approved: boolean, name: string) => {
    if (busyId) return;
    if (!approved) {
      // Revocation is destructive (hides the mechanic from the public
      // roster instantly, possibly mid-job). Require an explicit confirm.
      const ok = window.confirm(
        `Revoke approval for ${name}? They will be hidden from the public roster immediately.`,
      );
      if (!ok) return;
    }
    setBusyId(id);
    const wrote = await approveMechanic(id, approved);
    setBusyId(null);
    if (wrote && items) {
      // Realtime listener will confirm; patch optimistically meanwhile.
      setItems(items.map((m) => m.id === id ? { ...m, approved, verificationStatus: approved ? 'approved' : 'rejected' } : m));
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
    <main className="container section-compact">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Mechanic review</div>
        <h1 className="mt-2 display text-display-md text-fg-app">Network</h1>
        <p className="mt-2 max-w-prose text-small text-fg-muted">Approvals and roster from live Firestore data. Contact numbers stay in the owner-only private subcollection — never shown here.</p>
      </FadeIn>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Mechanic filter">
        {(['pending', 'approved', 'all'] as const).map((t) => (
          <button
            key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t}
            className={'rounded-full px-3.5 py-1.5 text-small font-mono ring-1 ring-inset transition-colors ' + (tab === t ? 'bg-ink-900 text-white ring-ink-900 dark:bg-white dark:text-ink-900' : 'text-fg-muted ring-line-soft hover:text-fg-app')}
          >
            {t} · {counts ? counts[t] : '—'}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {err ? (
          <ErrorState kind="api" title="Could not load mechanics" description={err} onRetry={() => location.reload()} />
        ) : visible === null ? (
          <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : visible.length === 0 ? (
          <EmptyState kind="mechanics" compact title={tab === 'pending' ? 'No pending applications' : 'No mechanics here'} description={tab === 'pending' ? 'New mechanic applications will appear here for review.' : 'Mechanic applications will appear here.'} />
        ) : (
          <div className="grid gap-3">
            {visible.map((m) => (
              <Card key={m.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-body font-medium text-fg-app">{m.name}</div>
                    <div className="text-xs text-fg-muted">
                      {m.specialties.length > 0 ? m.specialties.join(' · ') : 'No specialties listed'}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-subtle">
                      <span>{m.verificationStatus ?? (m.approved ? 'approved' : 'pending')}</span>
                      <span>{m.isAvailable ? 'available' : 'offline'}</span>
                      {typeof m.rating === 'number' && <span>★ {m.rating.toFixed(1)} ({m.reviewCount ?? 0})</span>}
                      {m.garageName && <span>{m.garageName}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={m.approved ? 'success' : 'warning'}>
                      {m.approved ? 'Approved' : 'Pending'}
                    </Badge>
                    {m.approved ? (
                      <Button variant="secondary" size="sm" loading={busyId === m.id} disabled={busyId !== null} onClick={() => setApproved(m.id, false, m.name)}>Revoke</Button>
                    ) : (
                      <Button variant="primary" size="sm" loading={busyId === m.id} disabled={busyId !== null} onClick={() => setApproved(m.id, true, m.name)}>Approve</Button>
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
