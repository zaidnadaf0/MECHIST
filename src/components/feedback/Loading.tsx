import { type HTMLAttributes } from 'react';
import { cx } from '@/lib/utils';

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cx(
        'min-h-4 rounded-xl border border-line-soft bg-ink-200/70 dark:bg-ink-800/70',
        'bg-[length:420px_100%] bg-no-repeat',
        'animate-shimmer',
        'bg-gradient-to-r from-transparent via-white/65 dark:via-white/[0.14] to-transparent',
        className,
      )}
      {...rest}
    />
  );
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx('rounded-xl border border-line-soft bg-surface-1 p-5 md:p-6 shadow-card', className)} aria-hidden>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-2/3 rounded-full bg-ink-200/70 dark:bg-ink-700/60 bg-[length:420px_100%] bg-no-repeat animate-shimmer bg-gradient-to-r from-transparent via-white/65 dark:via-white/[0.14] to-transparent" />
          <div className="h-3 w-1/2 rounded-full bg-ink-200/60 dark:bg-ink-700/50 bg-[length:420px_100%] bg-no-repeat animate-shimmer bg-gradient-to-r from-transparent via-white/65 dark:via-white/[0.14] to-transparent" />
          {lines > 2 && <div className="h-3 w-5/6 rounded-full bg-ink-200/50 dark:bg-ink-700/40 bg-[length:420px_100%] bg-no-repeat animate-shimmer bg-gradient-to-r from-transparent via-white/65 dark:via-white/[0.14] to-transparent" />}
        </div>
        <div className="h-6 w-16 shrink-0 rounded-full bg-ink-200/60 dark:bg-ink-700/50" />
      </div>
    </div>
  );
}

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx('inline-block rounded-full border-2 border-current border-t-transparent animate-spin', className)}
      style={{ width: size, height: size }}
    />
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800', className)}
    >
      <div
        className="h-full bg-brand-500 transition-[width] duration-300 ease-out-soft"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
