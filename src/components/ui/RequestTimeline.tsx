/**
 * MECHIST — RequestTimeline component.
 *
 * Renders the six canonical lifecycle steps (REQUESTED → COMPLETED)
 * with the current step highlighted. Uses `lib/requestStatus.ts` so
 * the same labels/icons appear in the pill, the matching reveal, and
 * the tracking page.
 */
import { cx } from '@/lib/utils';
import { STATUS_META, STATUS_ORDER, type CanonicalStatus } from '@/lib/requestStatus';

export interface RequestTimelineProps {
  /** current status — drives which step is highlighted */
  status: CanonicalStatus;
  className?: string;
  /** compact form for mobile / sidebar */
  compact?: boolean;
}

export function RequestTimeline({ status, className, compact }: RequestTimelineProps) {
  const currentMeta = STATUS_META[status];
  const currentStep = currentMeta.step;
  const isCancelled = status === 'cancelled';

  return (
    <ol
      className={cx(
        'grid gap-3',
        compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-6',
        className,
      )}
      aria-label="Request progress"
    >
      {STATUS_ORDER.map((s, idx) => {
        const m = STATUS_META[s];
        const Icon = m.icon;
        const isCurrent = !isCancelled && currentStep === idx;
        const isPast = !isCancelled && currentStep != null && idx < currentStep;
        const tone = isCurrent ? m.dotClass : isPast ? 'bg-success-500' : 'bg-hair/30';

        return (
          <li
            key={s}
            className={cx(
              'flex items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors',
              isCurrent ? 'border-line-strong bg-surface-2 shadow-card' : 'border-line-soft bg-surface-1',
              compact && 'py-2.5',
            )}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span aria-hidden className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center mt-0.5">
              {isCurrent && (
                <span aria-hidden className={cx('absolute inline-flex h-5 w-5 rounded-full animate-ping2', m.ringClass)} />
              )}
              <span aria-hidden className={cx('relative inline-flex h-2 w-2 rounded-full', tone)} />
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className={cx(
                'flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em]',
                isCurrent ? 'text-fg-app' : isPast ? 'text-success-600 dark:text-success-400' : 'text-fg-subtle',
              )}>
                <Icon aria-hidden className="h-3 w-3" strokeWidth={2.4} />
                {m.label}
              </span>
              <span className="text-[11px] text-fg-subtle truncate">Step {idx + 1} of {STATUS_ORDER.length}</span>
            </div>
          </li>
        );
      })}
      {isCancelled && (
        <li
          className="md:col-span-6 rounded-lg border border-danger-500/30 bg-danger-500/[0.06] px-3.5 py-3 text-small text-danger-700 dark:text-danger-300"
          aria-label="Request cancelled"
        >
          This request was cancelled and is no longer active.
        </li>
      )}
    </ol>
  );
}