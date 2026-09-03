import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { Skeleton } from '@/components/feedback';
import { FadeIn, MotionCard } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { watchStats } from '@/lib/admin';
import { AdminDiagnosticsStrip } from './AdminDiagnosticsStrip';

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ requests: number; mechanics: number; users: number } | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    const unsub = watchStats((s) => setStats(s));
    return () => { if (unsub) unsub(); };
  }, [user, navigate]);

  if (!user) return null;

  return (
    <main className="container section-sm">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Admin</div>
        <h1 className="mt-2 display text-display-md text-fg-app">Control room</h1>
        <p className="mt-2 text-small text-fg-muted">Approve mechanics, monitor the request queue, and manage users.</p>
      </FadeIn>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {stats === null ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard label="Open requests" value={stats.requests} />
            <StatCard label="Mechanics"     value={stats.mechanics} />
            <StatCard label="Users"         value={stats.users} />
          </>
        )}
      </div>

      <div className="mt-10 grid gap-3 md:grid-cols-3" id="admin-actions">
        <MotionCard lift="sm" className="p-6">
          <h2 className="text-h3 text-fg-app">Mechanic review</h2>
          <p className="mt-1 text-small text-fg-muted">Approve, reject, or audit the network.</p>
          <div className="mt-4"><Link to="/admin/mechanics"><Button variant="primary" size="sm">Open review</Button></Link></div>
        </MotionCard>
        <MotionCard lift="sm" className="p-6">
          <h2 className="text-h3 text-fg-app">Requests queue</h2>
          <p className="mt-1 text-small text-fg-muted">See every request, intervene when needed.</p>
          <div className="mt-4"><Link to="/admin/requests"><Button variant="primary" size="sm">Open queue</Button></Link></div>
        </MotionCard>
        <MotionCard lift="sm" className="p-6">
          <h2 className="text-h3 text-fg-app">Users</h2>
          <p className="mt-1 text-small text-fg-muted">Assign roles, audit access.</p>
          <div className="mt-4"><Link to="/admin/users"><Button variant="primary" size="sm">Manage users</Button></Link></div>
        </MotionCard>
      </div>

      {/* Diagnostic accent — pixel-retroui (lazy-loaded with this chunk). */}
      <AdminDiagnosticsStrip stats={stats} />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wider text-fg-muted">{label}</div>
      <div className="mt-2 display text-display-md text-fg-app">{value}</div>
    </Card>
  );
}
