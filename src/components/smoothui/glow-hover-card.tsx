import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface GlowHoverCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Glow color — defaults to aqua. */
  glowColor?: string;
  className?: string;
}

/**
 * GlowHoverCard — SmoothUI-style card that lights up under the
 * cursor. The radial glow follows pointer position; springy values
 * smooth the motion. Reduced-motion users get a static border
 * highlight only.
 */
export const GlowHoverCard = forwardRef<HTMLDivElement, GlowHoverCardProps>(function GlowHoverCard(
  { children, glowColor = 'rgba(34, 199, 194, 0.35)', className, style, ...rest },
  ref,
) {
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const sx = useSpring(mx, { stiffness: 200, damping: 20 });
  const sy = useSpring(my, { stiffness: 200, damping: 20 });
  const bgX = useTransform(sx, (v) => `${v}%`);
  const bgY = useTransform(sy, (v) => `${v}%`);
  const reduced = useReducedMotion();

  return (
    <div
      ref={ref}
      className={cx(
        'relative isolate overflow-hidden rounded-2xl border border-line-soft bg-surface-1',
        'transition-[border-color,box-shadow] duration-200 ease-out',
        'hover:border-line-strong hover:shadow-card',
        className,
      )}
      onMouseMove={(e) => {
        if (reduced) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        mx.set(((e.clientX - rect.left) / rect.width) * 100);
        my.set(((e.clientY - rect.top) / rect.height) * 100);
      }}
      {...rest}
    >
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity"
          style={{
            background: `radial-gradient(220px circle at ${bgX.get()} ${bgY.get()}, ${glowColor}, transparent 60%)`,
            ...style,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
});