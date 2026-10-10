import type { ReactNode } from 'react';

/**
 * Shared receipt/detail row (Batch 5 consistency pass).
 *
 * Single label/value hierarchy for every request-summary surface
 * (request wizard, tracking details, receipts). Missing data renders
 * an em dash — never blank, never fabricated.
 */
export function ReceiptRow({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line-soft pb-2 last:border-b-0 last:pb-0">
      <dt className="flex shrink-0 items-center gap-2 text-fg-muted">
        {icon}
        {label}
      </dt>
      <dd className="max-w-[60%] text-right text-fg-app">{empty ? '—' : value}</dd>
    </div>
  );
}
