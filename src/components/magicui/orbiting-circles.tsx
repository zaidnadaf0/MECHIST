import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface OrbitingCirclesProps {
  children: ReactNode;
  /** Outer radius in px. */
  radius?: number;
  /** Seconds for one revolution. */
  duration?: number;
  /** Reverse direction. */
  reverse?: boolean;
  /** Delay before starting in seconds. */
  delay?: number;
  className?: string;
  /** The orbit is centered inside its own absolutely-positioned wrapper. */
  childrenClassName?: string;
}

/**
 * OrbitingCircles — Magic-UI-style child element revolving around a
 * center point. Reduced-motion users see the child rendered static at
 * its initial angle.
 */
export function OrbitingCircles({
  children,
  radius = 180,
  duration = 24,
  reverse = false,
  delay = 0,
  className,
  childrenClassName,
}: OrbitingCirclesProps) {
  const reduced = useReducedMotion();
  return (
    <div
      className={cx('pointer-events-none absolute', className)}
      style={{ width: radius * 2, height: radius * 2 }}
    >
      {!reduced ? (
        <motion.div
          className="absolute inset-0"
          initial={{ rotate: 0 }}
          animate={{ rotate: reverse ? -360 : 360 }}
          transition={{ duration, ease: 'linear', repeat: Infinity, delay }}
        >
          <div
            className={cx('absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2', childrenClassName)}
          >
            {children}
          </div>
        </motion.div>
      ) : (
        <div
          className={cx('absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2', childrenClassName)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
