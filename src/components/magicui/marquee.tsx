import { type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface MarqueeProps {
  children: ReactNode;
  /** Seconds for one full pass. */
  duration?: number;
  /** Pause on hover. */
  pauseOnHover?: boolean;
  /** Reverse direction. */
  reverse?: boolean;
  className?: string;
  /** Internal gap in px. */
  gap?: number;
}

/**
 * Marquee — Magic-UI-style horizontal infinite scroll. The content is
 * duplicated so the wrap-around is invisible. Reduced-motion users
 * see the static content rendered once.
 */
export function Marquee({
  children,
  duration = 32,
  pauseOnHover = true,
  reverse = false,
  className,
  gap = 32,
}: MarqueeProps) {
  const reduced = useReducedMotion();
  const trackStyle: CSSProperties = { gap, willChange: 'transform' };

  return (
    <div
      role="marquee"
      aria-label="Live marquee"
      className={cx(
        'group/marquee relative flex w-full overflow-hidden',
        pauseOnHover && '[&:hover_.marquee-track]:[animation-play-state:paused]',
        className,
      )}
    >
      {reduced ? (
        <div className="flex shrink-0 items-center" style={trackStyle}>
          {children}
        </div>
      ) : (
        <motion.div
          className="marquee-track flex shrink-0 items-center"
          style={trackStyle}
          animate={{ x: reverse ? ['0%', '50%'] : ['0%', '-50%'] }}
          transition={{ duration, ease: 'linear', repeat: Infinity }}
        >
          {children}
          {children}
          {children}
          {children}
        </motion.div>
      )}
    </div>
  );
}
