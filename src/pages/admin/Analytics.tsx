import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, SectionHeading, SectionShell, Sparkbars, Stat } from '@/components/ui';
import { Skeleton } from '@/components/feedback';
import { useAuth } from '@/app/AuthProvider';
import { getOpsStats, type OpsStats } from '@/lib/admin';

export function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<OpsStats | null>(null);

  useEffect(() => {
    if (!user) { navigate('/admin/login', { replace: true }); return; }
    getOpsStats(200).then(setStats);
  }, [user, navigate]);

  if (!user) return null;
  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-6">
        <SectionHeading as="h1" size="sm" eyebrow="Insight" title="Analytics" description="Real Firestore aggregates only. Empty when no requests exist." />
        {!stats ? <Skeleton className="h-32" /> : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <Card><Stat label="Requests (cap 200)" value={String(stats.total)} /></Card>
              <Card><Stat label="Avg ETA" value={stats.avgEtaMin != null ? `${stats.avgEtaMin} min` : '—'} /></Card>
              <Card><Stat label="Revenue recorded" value={stats.completedRevenueCents != null ? `₹${(stats.completedRevenueCents / 100).toFixed(2)}` : '—'} /></Card>
              <Card><Stat label="Avg duration" value={stats.avgDurationMin != null ? `${stats.avgDurationMin} min` : '—'} /></Card>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <Card>
                <div className="text-small font-medium text-fg-app">By status</div>
                <div className="mt-3"><Sparkbars values={Object.values(stats.byStatus)} /></div>
                <div className="mt-2 text-xs text-fg-subtle">{Object.entries(stats.byStatus).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</div>
              </Card>
              <Card>
                <div className="text-small font-medium text-fg-app">By category</div>
                <div className="mt-3"><Sparkbars values={Object.values(stats.byCategory)} /></div>
                <div className="mt-2 text-xs text-fg-subtle">{Object.entries(stats.byCategory).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</div>
              </Card>
            </div>
            <p className="text-xs text-fg-subtle">Sampled from the latest {stats.total} requests (cap 200). No comparisons are shown — there is no manufactured baseline.</p>
          </>
        )}
      </div>
    </SectionShell>
  );
}
