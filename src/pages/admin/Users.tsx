import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Select, useToast } from '@/components/ui';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { watchUsers, setUserRole, type UserSummary } from '@/lib/admin';

export function Users() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState<UserSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    const unsub = watchUsers(200, (u) => { setItems(u); setErr(null); }, (e) => setErr(e.message));
    return () => { if (unsub) unsub(); };
  }, [user, navigate]);

  if (!user) return null;

  const onRole = async (uid: string, role: UserSummary['role']) => {
    // Self-protection: the signed-in admin cannot demote themselves to a
    // non-admin role. Doing so would lock them out of the admin surface
    // on the next page load, with no admin left to undo it. Another
    // admin can demote them when one is available.
    if (uid === user?.uid && role !== 'admin') {
      toast.push({
        title: 'You cannot change your own role',
        description: 'Ask another admin to change your role if needed.',
        tone: 'warning',
      });
      return;
    }
    const result = await setUserRole(uid, role);
    if (result === 'ok') {
      if (items) setItems(items.map((u) => u.id === uid ? { ...u, role: role ?? undefined } : u));
      toast.push({ title: 'Role updated', tone: 'success' });
    } else if (result === 'forbidden') {
      toast.push({
        title: 'Admin role requires the Admin SDK',
        description: 'The admin claim is server-mintable only. Run the Admin SDK / Cloud Function that grants the `admin` custom claim, then refresh.',
        tone: 'warning',
      });
    } else {
      toast.push({
        title: 'Could not update role',
        description: 'Check the Firestore rules and try again.',
        tone: 'danger',
      });
    }
  };

  return (
    <main className="container section-compact">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Users</div>
        <h1 className="mt-2 display text-display-md text-fg-app">All users</h1>
      </FadeIn>

      <div className="mt-8">
        {err ? (
          <ErrorState kind="api" title="Could not load users" description={err} onRetry={() => location.reload()} />
        ) : items === null ? (
          <div className="grid gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState kind="generic" title="No users yet" description="User records will appear here." />
        ) : (
          <div className="grid gap-3">
            {items.map((u) => (
              <Card key={u.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-body font-medium text-fg-app truncate max-w-[16rem]">{u.displayName ?? u.email ?? u.id}</div>
                    <div className="text-xs text-fg-muted truncate max-w-[16rem]">{u.email ?? '—'}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={u.role === 'admin' ? 'danger' : u.role === 'mechanic' ? 'brand' : 'neutral'}>
                      {u.role ?? 'unset'}
                    </Badge>
                    <Select aria-label="Role" value={u.role ?? ''} onChange={(e) => onRole(u.id, (e.target.value || undefined) as UserSummary['role'])}>
                      <option value="">Unset</option>
                      <option value="customer">Customer</option>
                      <option value="mechanic">Mechanic</option>
                      <option value="admin">Admin</option>
                    </Select>
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
