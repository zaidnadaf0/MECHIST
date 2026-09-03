import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';
import type { Hue } from './Section';

const hueText: Record<Hue, string> = {
  azure: 'text-azure-500',
  aqua: 'text-aqua-500',
  iris: 'text-iris-500',
  gold: 'text-gold-400',
  neutral: 'text-fg-muted',
};

const hueBar: Record<Hue, string> = {
  azure: 'bg-azure-500',
  aqua: 'bg-aqua-500',
  iris: 'bg-iris-500',
  gold: 'bg-gold-400',
  neutral: 'bg-fg-subtle',
};

/** Label + large mono value + optional delta. The workhorse of every dashboard. */
export function Stat({
  label,
  value,
  unit,
  delta,
  hue = 'azure',
  icon,
  className,
  size = 'md',
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
  hue?: Hue;
  icon?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const valueSize = size === 'lg' ? 'text-display-sm' : size === 'sm' ? 'text-h2' : 'text-h1';
  const deltaTone =
    delta?.direction === 'up'
      ? 'text-success-600 dark:text-success-400'
      : delta?.direction === 'down'
        ? 'text-danger-500'
        : 'text-fg-subtle';

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        {icon && <span className={cx('shrink-0', hueText[hue])}>{icon}</span>}
        <span className="eyebrow">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cx('stat-num font-semibold text-fg-app', valueSize)}>{value}</span>
        {unit && <span className="text-small font-mono text-fg-subtle">{unit}</span>}
      </div>
      {delta && (
        <div className={cx('flex items-center gap-1 font-mono text-xs', deltaTone)}>
          <span aria-hidden>{delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '■'}</span>
          {delta.value}
        </div>
      )}
    </div>
  );
}

/** Thin determinate progress track. */
export function Progress({
  value,
  hue = 'azure',
  label,
  showValue,
  className,
}: {
  value: number;
  hue?: Hue;
  label?: ReactNode;
  showValue?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cx('flex flex-col gap-2', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-3">
          {label && <span className="eyebrow">{label}</span>}
          {showValue && <span className="stat-num text-xs text-fg-muted">{pct}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-full bg-hair/[0.1]"
      >
        <div
          className={cx('h-full rounded-full transition-[width] duration-700 ease-out-soft', hueBar[hue])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Compact bar chart for trend context inside cards. */
export function Sparkbars({
  values,
  hue = 'azure',
  className,
  height = 40,
}: {
  values: number[];
  hue?: Hue;
  className?: string;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={cx('flex items-end gap-1', className)} style={{ height }} aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={cx('flex-1 origin-bottom rounded-sm animate-bar-grow', hueBar[hue])}
          style={{ height: `${Math.max(6, (v / max) * 100)}%`, opacity: 0.35 + (v / max) * 0.65, animationDelay: `${i * 45}ms` }}
        />
      ))}
    </div>
  );
}

/** Hued icon tile — carries the multi-hue language into dense UI. */
export function IconTile({
  icon,
  hue = 'azure',
  size = 'md',
  className,
}: {
  icon: ReactNode;
  hue?: Hue;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const box = size === 'lg' ? 'h-14 w-14 rounded-xl' : size === 'sm' ? 'h-9 w-9 rounded-md' : 'h-11 w-11 rounded-lg';
  const tint: Record<Hue, string> = {
    azure: 'bg-azure-500/12 text-azure-500 ring-azure-500/20',
    aqua: 'bg-aqua-500/12 text-aqua-500 ring-aqua-500/20',
    iris: 'bg-iris-500/12 text-iris-500 ring-iris-500/20',
    gold: 'bg-gold-400/14 text-gold-500 ring-gold-400/25',
    neutral: 'bg-hair/[0.07] text-fg-muted ring-line-soft',
  };
  return (
    <span className={cx('grid shrink-0 place-items-center ring-1 ring-inset', box, tint[hue], className)}>
      {icon}
    </span>
  );
}

const avatarHues: Hue[] = ['azure', 'aqua', 'iris', 'gold'];

/** Initials avatar; hue is derived from the name so it's stable per person. */
export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
  const hue = avatarHues[Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarHues.length];
  const box = size === 'lg' ? 'h-12 w-12 text-small' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs';
  const tint: Record<Hue, string> = {
    azure: 'bg-azure-500/15 text-azure-600 dark:text-azure-300',
    aqua: 'bg-aqua-500/15 text-aqua-700 dark:text-aqua-300',
    iris: 'bg-iris-500/15 text-iris-600 dark:text-iris-300',
    gold: 'bg-gold-400/18 text-gold-700 dark:text-gold-300',
    neutral: 'bg-hair/[0.08] text-fg-muted',
  };
  return (
    <span
      aria-hidden
      className={cx('grid shrink-0 place-items-center rounded-full font-mono font-semibold', box, tint[hue], className)}
    >
      {initials}
    </span>
  );
}
