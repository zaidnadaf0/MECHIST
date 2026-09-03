import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface ShimmerButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  /** Two-stop background gradient. */
  from?: string;
  to?: string;
  /** Sweep color (the bright sheen). */
  shimmerColor?: string;
  /** Sweep duration in seconds. */
  duration?: number;
  /** Border-radius in px. */
  radius?: number;
  className?: string;
}

/**
 * ShimmerButton — Magic-UI-style CTA with a travelling sheen.
 * Implementation: a wide skewed gradient that slides across the
 * button on a loop. The button itself is the user's own element so
 * accessibility / focus behaviour match the in-house Button.
 */
export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(function ShimmerButton(
  {
    children,
    from = 'rgb(34 89 195)',
    to = 'rgb(34 199 194)',
    shimmerColor = 'rgba(255,255,255,0.45)',
    duration = 2.4,
    radius = 12,
    className,
    disabled,
    ...rest
  },
  ref,
) {
  const reduced = useReducedMotion();
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cx(
        'group/btn relative isolate inline-flex items-center justify-center overflow-hidden',
        'px-6 py-3 text-body font-medium text-white',
        'transition-[transform,box-shadow] duration-200 ease-out',
        'hover:-translate-y-px active:translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app focus-visible:ring-aqua-300',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      style={{
        background: `linear-gradient(120deg, ${from}, ${to})`,
        borderRadius: `${radius}px`,
      }}
      {...rest}
    >
      <motion.span
        aria-hidden
        className="absolute inset-y-0 -left-1/2 w-1/2"
        style={{
          background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
          transform: 'skewX(-20deg)',
        }}
        animate={reduced ? {} : { x: ['-50%', '350%'] }}
        transition={reduced ? undefined : { duration, ease: 'easeInOut', repeat: Infinity }}
      />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
});
