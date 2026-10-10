import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/lib/utils';

type Variant =
  | 'primary'   // azure — the single most important action on screen
  | 'secondary' // surface + hairline
  | 'tertiary'  // quiet fill on hover
  | 'ghost'     // text only
  | 'accent'    // gold — roadside / urgent
  | 'live'      // aqua — realtime actions (accept job, start tracking)
  | 'iris'      // violet — intelligence / admin actions
  | 'success'   // green — accept / confirm-positive
  | 'danger';

type Size = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const base = cx(
  'group/btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden',
  'font-medium tracking-[-0.01em] rounded-lg whitespace-nowrap select-none',
  'transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out-soft',
  'active:translate-y-px disabled:opacity-45 disabled:pointer-events-none',
);

/** solid hued buttons share one recipe so the family stays consistent */
const solid = (from: string, to: string, ring: string, fg = 'text-white') =>
  cx(
    fg,
    `bg-gradient-to-b ${from} ${to}`,
    'shadow-[0_1px_0_0_rgb(255_255_255/0.18)_inset,0_10px_24px_-12px_rgb(0_0_0/0.5)]',
    'hover:brightness-[1.07] hover:-translate-y-px',
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app ${ring}`,
  );

const variants: Record<Variant, string> = {
  primary: solid('from-ember-600', 'to-ember-700', 'focus-visible:ring-ember-500'),
  live: solid('from-aqua-500', 'to-aqua-600', 'focus-visible:ring-aqua-400'),
  iris: solid('from-iris-500', 'to-iris-600', 'focus-visible:ring-iris-400'),
  accent: solid('from-gold-400', 'to-gold-500', 'focus-visible:ring-gold-300', 'text-ink-900'),
  success: solid('from-success-500', 'to-success-600', 'focus-visible:ring-success-400', 'text-ink-950'),
  danger: solid('from-danger-500', 'to-danger-600', 'focus-visible:ring-danger-400'),
  secondary: cx(
    'bg-surface-2 text-fg-app border border-line-soft',
    'hover:bg-surface-3 hover:border-line-strong hover:-translate-y-px',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure-400/70',
  ),
  tertiary: cx(
    'bg-hair/[0.04] text-fg-app border border-transparent',
    'hover:bg-hair/[0.09] hover:border-line-soft',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure-400/60',
  ),
  ghost: cx(
    'bg-transparent text-fg-muted',
    'hover:text-fg-app hover:bg-hair/[0.06]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure-400/60',
  ),
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-small',
  md: 'h-11 px-5 text-small',
  lg: 'h-13 px-6 text-body',
  xl: 'h-14 px-7 text-body-lg',
};

const glossy = new Set<Variant>(['primary', 'live', 'iris', 'accent', 'success', 'danger']);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      data-loading={loading ? '' : undefined}
      className={cx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {/* travelling sheen on hover — restrained, only on solid variants */}
      {glossy.has(variant) && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 translate-x-[-130%] bg-sheen opacity-0 transition-[transform,opacity] duration-700 ease-out-soft group-hover/btn:translate-x-[130%] group-hover/btn:opacity-100"
        />
      )}
      {loading ? (
        <span aria-hidden className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        leftIcon
      )}
      <span className={cx('inline-flex items-center', loading && 'opacity-70')}>{children}</span>
      {!loading && rightIcon && (
        <span className="inline-flex transition-transform duration-200 ease-out-soft group-hover/btn:translate-x-0.5">
          {rightIcon}
        </span>
      )}
    </button>
  );
});
