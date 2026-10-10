import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, SectionHeading, SectionShell, Sparkbars, Stat } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useAuth } from '@/app/AuthProvider';
import { listCompletedJobs } from '@/lib/mechanic';
import { money } from '@/lib/format';

const DAY = 86_400_000;
const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export function Earnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<{ amountCents?: number; durationMin?: number; createdAt: number }[] | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    listCompletedJobs(user.uid, 100).then((r) => { if (!cancelled) setRows(r.data ?? []); });
    return () => { cancelled = true; };
  }, [user, navigate]);

  const stats = useMemo(() => {
    if (!rows) return null;
    const paid = rows.filter((r) => typeof r.amountCents === 'number');
    const total = paid.reduce((s, r) => s + (r.amountCents ?? 0), 0);
    const avg = paid.length ? Math.round(total / paid.length) : 0;
    // Settled revenue per day over the last 7 days — real rows only.
    const today = startOfDay(Date.now());
    const week = Array.from({ length: 7 }, (_, i) => {
      const from = today - (6 - i) * DAY;
      const dayTotal = paid
        .filter((r) => r.createdAt >= from && r.createdAt < from + DAY)
        .reduce((s, r) => s + (r.amountCents ?? 0), 0);
      return {
        day: new Date(from).toLocaleDateString(undefined, { weekday: 'narrow' }),
        total: dayTotal,
      };
    });
    return { jobs: rows.length, total, avg, withAmount: paid.length, week };
  }, [rows]);

  if (!user) return null;
  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-6">
        <SectionHeading as="h1" size="sm" eyebrow="Payouts" title="Earnings" description="Computed only from your completed jobs with a recorded amount. No estimates." />
        {rows === null || !stats ? <Skeleton className="h-32" />
          : rows.length === 0 ? <EmptyState kind="generic" title="No earnings yet" description="Completed jobs with a recorded amount will appear here." />
          : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card><Stat label="Completed jobs" value={String(stats.jobs)} /></Card>
                <Card><Stat label="Recorded revenue" value={money(stats.total / 100)} unit={`${stats.withAmount} w/ amount`} /></Card>
                <Card><Stat label="Avg / job" value={money(stats.avg / 100)} /></Card>
              </div>
              {stats.withAmount > 0 && (
                <Card eyebrow="Last 7 days" title="Settled revenue per day">
                  <Sparkbars values={stats.week.map((w) => w.total / 100)} hue="gold" height={64} />
                  <div className="mt-2 flex justify-between font-mono text-[10px] text-fg-subtle">
                    {stats.week.map((w, i) => <span key={i}>{w.day}</span>)}
                  </div>
                </Card>
              )}
              {stats.withAmount < stats.jobs && (
                <p className="text-xs text-fg-subtle">{stats.jobs - stats.withAmount} completed jobs have no recorded amount and are excluded from revenue.</p>
              )}
            </>
          )}
      </div>
    </SectionShell>
  );
}
