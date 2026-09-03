import { type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/lib/utils';

type Tone =
  | 'neutral'
  | 'brand'   // alias of azure — kept for existing markup
  | 'azure'
  | 'aqua'
  | 'iris'
  | 'gold'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

type Size = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
  icon?: ReactNode;
  /** leading status dot, pulses when `live` */
  dot?: boolean;
  live?: boolean;
  /** hairline outline instead of a tinted fill */
  outline?: boolean;
}

const fill: Record<Tone, string> = {
  neutral: 'bg-hair/[0.07] text-fg-muted ring-1 ring-inset ring-line-soft',
  brand: 'bg-azure-500/12 text-azure-600 ring-1 ring-inset ring-azure-500/25 dark:text-azure-300',
  azure: 'bg-azure-500/12 text-azure-600 ring-1 ring-inset ring-azure-500/25 dark:text-azure-300',
  info: 'bg-azure-500/12 text-azure-600 ring-1 ring-inset ring-azure-500/25 dark:text-azure-300',
  aqua: 'bg-aqua-500/12 text-aqua-700 ring-1 ring-inset ring-aqua-500/25 dark:text-aqua-300',
  iris: 'bg-iris-500/12 text-iris-600 ring-1 ring-inset ring-iris-500/25 dark:text-iris-300',
  gold: 'bg-gold-400/14 text-gold-700 ring-1 ring-inset ring-gold-400/30 dark:text-gold-300',
  success: 'bg-success-500/12 text-success-700 ring-1 ring-inset ring-success-500/25 dark:text-success-300',
  warning: 'bg-warning-500/12 text-warning-700 ring-1 ring-inset ring-warning-500/25 dark:text-warning-300',
  danger: 'bg-danger-500/12 text-danger-700 ring-1 ring-inset ring-danger-500/25 dark:text-danger-300',
};

const dotColor: Record<Tone, string> = {
  neutral: 'bg-fg-subtle',
  brand: 'bg-azure-500',
  azure: 'bg-azure-500',
  info: 'bg-azure-500',
  aqua: 'bg-aqua-500',
  iris: 'bg-iris-500',
  gold: 'bg-gold-400',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
};

const sizes: Record<Size, string> = {
  sm: 'h-5 px-2 text-[11px]',
  md: 'h-6 px-2.5 text-xs',
};

export function Badge({
  tone = 'neutral',
  size = 'md',
  icon,
  dot,
  live,
  outline,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full font-mono font-medium leading-none tracking-[0.02em] whitespace-nowrap',
        outline ? 'bg-transparent text-fg-muted ring-1 ring-inset ring-line-strong' : fill[tone],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {(dot || live) && (
        <span aria-hidden className="relative flex h-1.5 w-1.5 shrink-0">
          {live && (
            <span className={cx('absolute inset-0 rounded-full animate-ping2', dotColor[tone])} />
          )}
          <span className={cx('relative h-1.5 w-1.5 rounded-full', dotColor[tone])} />
        </span>
      )}
      {icon}
      {children}
    </span>
  );
}
