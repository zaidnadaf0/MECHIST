import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

/**
 * Operations-style dashboard blocks (backup visual language, real data).
 *
 * Graphite cards, tinted icon tiles, big tabular numerals, ember CTAs.
 * Built on semantic tokens so both themes stay coherent. Every value shown
 * through these blocks must come from real data — they render no fallbacks
 * beyond an explicit `emptyText`.
 */

export type OpsTone = 'ember' | 'green' | 'gold' | 'azure' | 'aqua' | 'iris' | 'red' | 'neutral';

const tile: Record<OpsTone, string> = {
  ember: 'bg-ember-500/15 text-ember-500 ring-ember-500/25',
  green: 'bg-success-500/15 text-success-500 ring-success-500/25',
  gold: 'bg-gold-400/15 text-gold-500 ring-gold-400/25',
  azure: 'bg-azure-500/12 text-azure-500 ring-azure-500/20',
  aqua: 'bg-aqua-500/12 text-aqua-500 ring-aqua-500/20',
  iris: 'bg-iris-500/12 text-iris-500 ring-iris-500/20',
  red: 'bg-danger-500/12 text-danger-500 ring-danger-500/25',
  neutral: 'bg-hair/[0.07] text-fg-muted ring-line-soft',
};

export function OpsStatCard({
  icon,
  label,
  value,
  sub,
  tone = 'neutral',
  className,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: OpsTone;
  className?: string;
}) {
  return (
    <div className={cx('rounded-2xl border border-line-soft bg-surface-1 p-5', className)}>
      <div className="flex items-center gap-3">
        <span aria-hidden className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-inset', tile[tone])}>
          {icon}
        </span>
        <span className="text-small font-medium text-fg-muted">{label}</span>
      </div>
      <div className="stat-num mt-4 text-center text-display-sm font-bold text-fg-app tabular-nums">{value}</div>
      {sub != null && <div className="mt-1.5 text-center text-xs text-fg-subtle">{sub}</div>}
    </div>
  );
}

/** Determinate SVG countdown ring (offers, SLAs). Display-only. */
export function CountdownRing({
  fraction,
  label,
  urgent,
  size = 64,
}: {
  fraction: number;
  label: ReactNode;
  urgent?: boolean;
  size?: number;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  const stroke = urgent ? 'stroke-danger-500' : 'stroke-ember-500';
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="timer" aria-label={typeof label === 'string' ? label : 'Time remaining'}>
      <svg width={size} height={size} aria-hidden className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className="stroke-line-soft" opacity={0.35} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} strokeLinecap="round"
          className={stroke} strokeDasharray={`${f * c} ${c}`}
        />
      </svg>
      <span className="stat-num absolute font-mono text-small font-bold text-fg-app">{label}</span>
    </div>
  );
}

/** Label/value meter row (platform-health style). */
export function MeterRow({ label, display, pct }: { label: ReactNode; display: ReactNode; pct: number }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-small text-fg-muted">{label}</span>
        <span className="stat-num text-small font-bold text-fg-app">{display}</span>
      </div>
      <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-hair/[0.12]">
        <div className="h-full rounded-full bg-fg-subtle/60" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
