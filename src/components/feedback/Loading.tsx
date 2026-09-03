import { type HTMLAttributes } from 'react';
import { cx } from '@/lib/utils';

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cx(
        'rounded-md bg-ink-200/60 dark:bg-ink-700/60',
        'bg-[length:400px_100%] bg-no-repeat',
        'animate-shimmer',
        'bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent',
        className,
      )}
      {...rest}
    />
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
