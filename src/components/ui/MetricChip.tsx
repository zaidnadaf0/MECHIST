/**
 * MECHIST — MetricChip.
 *
 * Small, semantic cluster used for problem categories, specializations,
 * and "why this mechanic" reason pills. Renders an icon + label with
 * a tone-coded tint and consistent geometry.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/utils';

export type ChipTone = 'azure' | 'aqua' | 'iris' | 'gold' | 'success' | 'warning' | 'danger' | 'neutral';

export interface MetricChipProps {
  /**
   * A lucide-react icon component reference (e.g. `Activity`, `Wrench`,
   * `BadgeCheck`). Pass the reference itself, not a JSX element — this
   * component instantiates it with the chip's own `aria-hidden`,
   * `className`, and `strokeWidth` so the icon scales with chip size.
   */
  icon?: LucideIcon;
  label: ReactNode;
  tone?: ChipTone;
  size?: 'sm' | 'md';
  /** passes the raw node instead of wrapping it in a tint */
  outline?: boolean;
  className?: string;
}

const toneFill: Record<ChipTone, string> = {
  azure:   'bg-azure-500/12 text-azure-700 dark:text-azure-300 ring-azure-500/25',
  aqua:    'bg-aqua-500/12 text-aqua-700 dark:text-aqua-300 ring-aqua-500/25',
  iris:    'bg-iris-500/12 text-iris-700 dark:text-iris-300 ring-iris-500/25',
  gold:    'bg-gold-400/14 text-gold-700 dark:text-gold-300 ring-gold-400/30',
  success: 'bg-success-500/12 text-success-700 dark:text-success-300 ring-success-500/25',
  warning: 'bg-warning-500/12 text-warning-700 dark:text-warning-300 ring-warning-500/25',
  danger:  'bg-danger-500/12 text-danger-700 dark:text-danger-300 ring-danger-500/25',
  neutral: 'bg-hair/[0.07] text-fg-muted ring-line-soft',
};

export function MetricChip({ icon: Icon, label, tone = 'neutral', size = 'md', outline, className }: MetricChipProps) {
  const sz = size === 'sm' ? 'h-7 px-2.5 text-[11px] gap-1.5' : 'h-8 px-3 text-xs gap-1.5';
  const iconSz = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full font-mono font-medium leading-none tracking-[0.02em] ring-1 ring-inset',
        outline ? 'bg-transparent text-fg-muted ring-line-strong' : toneFill[tone],
        sz,
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className={iconSz} strokeWidth={2.2} /> : null}
      <span>{label}</span>
    </span>
  );
}
