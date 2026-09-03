import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/lib/utils';

export interface SmoothButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  /** Variant preset. */
  variant?: 'default' | 'glass' | 'soft' | 'iris';
  /** Size preset. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * SmoothButton — SmoothUI-style pill button with a soft inner light
 * band. Distinct from the in-house Button (which has the full variant
 * system); this is the "rounded-full + gentle sheen" variant used
 * inside hero cards.
 */
export const SmoothButton = forwardRef<HTMLButtonElement, SmoothButtonProps>(function SmoothButton(
  { children, variant = 'default', size = 'md', className, disabled, ...rest },
  ref,
) {
  const sizes = {
    sm: 'h-9 px-4 text-small',
    md: 'h-11 px-5 text-small',
    lg: 'h-13 px-7 text-body',
  } as const;

  const variants = {
    default: cx(
      'bg-fg-app text-surface-app',
      'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.18),0_10px_24px_-12px_rgb(0_0_0/0.55)]',
      'hover:bg-fg-app/90',
    ),
    glass: cx(
      'bg-surface-1/60 text-fg-app border border-line-soft backdrop-blur-md',
      'hover:bg-surface-1/80',
    ),
    soft: cx(
      'bg-azure-500/15 text-azure-300 border border-azure-500/30',
      'hover:bg-azure-500/25',
    ),
    iris: cx(
      'bg-gradient-to-b from-iris-500 to-iris-600 text-white',
      'shadow-[inset_0_1px_0_0_rgb(255_255_255/0.18),0_10px_24px_-12px_rgb(0_0_0/0.55)]',
      'hover:brightness-110',
    ),
  } as const;

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cx(
        'group/sbtn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden',
        'rounded-full whitespace-nowrap font-medium tracking-[-0.005em] select-none',
        'transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out-soft',
        'active:translate-y-px disabled:opacity-50 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app focus-visible:ring-azure-400',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {/* gentle inset sheen band */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-full bg-sheen opacity-60"
      />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  );
});