import { forwardRef, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface MagneticButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  /** How far the button travels toward the cursor in px. */
  strength?: number;
  className?: string;
}

/**
 * MagneticButton — SmoothUI-style magnetic pull. The inner content
 * drifts toward the cursor while it's nearby, then springs back when
 * the cursor leaves. Honors prefers-reduced-motion (no spring, no pull).
 */
export const MagneticButton = forwardRef<HTMLButtonElement, MagneticButtonProps>(function MagneticButton(
  { children, strength = 18, className, disabled, onMouseMove, onMouseLeave, ...rest },
  ref,
) {
  const inner = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });
  const tx = useTransform(sx, (v) => `${v}px`);
  const ty = useTransform(sy, (v) => `${v}px`);
  const reduced = useReducedMotion();

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cx(
        'group/mag relative isolate inline-flex items-center justify-center gap-2 overflow-hidden',
        'rounded-lg bg-gradient-to-b from-azure-500 to-azure-600 px-6 py-3',
        'text-body font-medium text-white shadow-[0_10px_24px_-12px_rgb(0_0_0/0.5)]',
        'transition-[transform,box-shadow] duration-200 ease-out',
        'hover:-translate-y-px active:translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app focus-visible:ring-aqua-300',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      onMouseMove={(e) => {
        if (reduced) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        x.set((dx / rect.width) * strength);
        y.set((dy / rect.height) * strength);
        onMouseMove?.(e);
      }}
      onMouseLeave={(e) => {
        x.set(0);
        y.set(0);
        onMouseLeave?.(e);
      }}
      {...rest}
    >
      <motion.span
        ref={inner}
        style={{ x: reduced ? 0 : tx, y: reduced ? 0 : ty }}
        className="relative inline-flex items-center gap-2"
      >
        {children}
      </motion.span>
    </button>
  );
});