/**
 * MECHIST — StatusPill component.
 *
 * Visual contract for a single canonical request status. Uses
 * `lib/requestStatus.ts` as the single source of truth so the pill,
 * the timeline, the matching reveal, and the tracking page all agree
 * on what each state looks like.
 */
import { cx } from '@/lib/utils';
import { STATUS_META, type CanonicalStatus } from '@/lib/requestStatus';

export interface StatusPillProps {
  status: CanonicalStatus;
  size?: 'sm' | 'md' | 'lg';
  /** show the descriptive blurb under the label */
  withBlurb?: boolean;
  className?: string;
  /** visually indicate "current step" by adding a pulsing ring */
  active?: boolean;
}

export function StatusPill({ status, size = 'md', withBlurb, className, active }: StatusPillProps) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  const box = size === 'lg'
    ? 'h-9 px-3.5 text-small gap-2'
    : size === 'sm'
      ? 'h-6 px-2.5 text-[11px] gap-1.5'
      : 'h-7 px-3 text-xs gap-1.5';

  const iconBox = size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const dotBox = size === 'lg' ? 'h-2 w-2' : 'h-1.5 w-1.5';

  const toneStyles: Record<string, { fill: string; text: string; dot: string; ring: string }> = {
    azure:  { fill: 'bg-azure-500/12 ring-azure-500/25',  text: 'text-azure-700 dark:text-azure-300',  dot: 'bg-azure-500',  ring: 'bg-azure-500/40'  },
    aqua:   { fill: 'bg-aqua-500/12 ring-aqua-500/25',    text: 'text-aqua-700 dark:text-aqua-300',    dot: 'bg-aqua-500',   ring: 'bg-aqua-500/40'   },
    iris:   { fill: 'bg-iris-500/12 ring-iris-500/25',    text: 'text-iris-700 dark:text-iris-300',    dot: 'bg-iris-500',   ring: 'bg-iris-500/40'   },
    gold:   { fill: 'bg-gold-400/14 ring-gold-400/30',    text: 'text-gold-700 dark:text-gold-300',    dot: 'bg-gold-400',   ring: 'bg-gold-400/40'   },
    success:{ fill: 'bg-success-500/12 ring-success-500/25',text: 'text-success-700 dark:text-success-300',dot: 'bg-success-500',ring: 'bg-success-500/40'},
    warning:{ fill: 'bg-warning-500/12 ring-warning-500/25',text: 'text-warning-700 dark:text-warning-300',dot: 'bg-warning-500',ring: 'bg-warning-500/40'},
    danger: { fill: 'bg-danger-500/12 ring-danger-500/25',text: 'text-danger-700 dark:text-danger-300',dot: 'bg-danger-500', ring: 'bg-danger-500/40'},
    neutral:{ fill: 'bg-hair/[0.07] ring-line-soft',      text: 'text-fg-muted',                        dot: 'bg-fg-subtle',  ring: 'bg-fg-subtle/40'  },
  };
  const ts = toneStyles[meta.tone];

  return (
    <div className={cx('inline-flex flex-col gap-1.5', className)}>
      <span
        className={cx(
          'inline-flex items-center rounded-full font-mono font-medium leading-none tracking-[0.02em] ring-1 ring-inset',
          box, ts.fill, ts.text,
        )}
      >
        <span aria-hidden className="relative inline-flex items-center justify-center">
          {active && (
            <span aria-hidden className={cx('absolute inline-flex h-full w-full rounded-full animate-ping2', ts.ring)} />
          )}
          <span aria-hidden className={cx('relative inline-block rounded-full', dotBox, ts.dot)} />
        </span>
        <Icon aria-hidden className={cx(iconBox)} strokeWidth={2.2} />
        <span>{meta.label}</span>
      </span>
      {withBlurb && (
        <p className="text-xs text-fg-muted text-pretty max-w-xs">{meta.blurb}</p>
      )}
    </div>
  );
}