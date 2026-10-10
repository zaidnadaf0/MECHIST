import { useState } from 'react';
import { Button, Card, SectionHeading, SectionShell } from '@/components/ui';
import { useToast } from '@/components/ui';
import {
  downloadTextFile, fetchRequestsForExport, listAllMechanics, listUsers,
  mechanicsToCsv, toCsv, usersToCsv,
} from '@/lib/admin';

export function Reports() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const run = async (key: string, label: string, work: () => Promise<{ rows: number; file: string; csv: string }>) => {
    if (busy) return;
    setBusy(key);
    try {
      const { rows, file, csv } = await work();
      setCounts((c) => ({ ...c, [key]: rows }));
      if (rows === 0) {
        toast.push({ title: `No ${label} rows to export`, tone: 'info' });
      } else {
        downloadTextFile(file, csv);
        toast.push({ title: `Exported ${rows} ${label} rows`, tone: 'success' });
      }
    } catch {
      toast.push({ title: `${label} export failed`, tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const stamp = () => new Date().toISOString().slice(0, 10);

  return (
    <SectionShell tone="app">
      <div className="container section-compact flex max-w-xl flex-col gap-6">
        <SectionHeading as="h1" size="sm" eyebrow="Exports" title="Reports" description="CSV exports of real Firestore data. Anything not listed here (PDFs, scheduled delivery) is not available yet — not generated." />
        <Card>
          <div className="flex flex-col gap-3">
            <div className="text-body font-medium text-fg-app">Requests</div>
            <div className="text-small text-fg-muted">Columns: id, status, category, customer, mechanic, dates, ETA, amount, duration, rating. Capped at 500 rows.</div>
            <Button
              variant="primary" size="md" loading={busy === 'requests'}
              onClick={() => void run('requests', 'request', async () => {
                const rows = await fetchRequestsForExport(500);
                return { rows: rows.length, file: `mechist-requests-${stamp()}.csv`, csv: toCsv(rows) };
              })}
            >
              Download requests CSV
            </Button>
            {counts.requests != null && <div className="text-xs text-fg-subtle">Last export: {counts.requests} rows.</div>}
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-3">
            <div className="text-body font-medium text-fg-app">Mechanic roster</div>
            <div className="text-small text-fg-muted">Public roster fields only — contact numbers are never exported. Capped at 100 rows.</div>
            <Button
              variant="secondary" size="md" loading={busy === 'mechanics'}
              onClick={() => void run('mechanics', 'mechanic', async () => {
                const rows = await listAllMechanics(100);
                return { rows: rows.length, file: `mechist-mechanics-${stamp()}.csv`, csv: mechanicsToCsv(rows) };
              })}
            >
              Download mechanics CSV
            </Button>
            {counts.mechanics != null && <div className="text-xs text-fg-subtle">Last export: {counts.mechanics} rows.</div>}
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-3">
            <div className="text-body font-medium text-fg-app">Users</div>
            <div className="text-small text-fg-muted">Admin-only user summaries (id, email, name, role). Capped at 200 rows.</div>
            <Button
              variant="secondary" size="md" loading={busy === 'users'}
              onClick={() => void run('users', 'user', async () => {
                const rows = await listUsers(200);
                return { rows: rows.length, file: `mechist-users-${stamp()}.csv`, csv: usersToCsv(rows) };
              })}
            >
              Download users CSV
            </Button>
            {counts.users != null && <div className="text-xs text-fg-subtle">Last export: {counts.users} rows.</div>}
          </div>
        </Card>
      </div>
    </SectionShell>
  );
}
