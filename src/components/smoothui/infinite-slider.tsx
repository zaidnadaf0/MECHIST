import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface InfiniteSliderProps {
  children: ReactNode;
  /** Approximate seconds per 100px of content. */
  speed?: number;
  /** Render the row twice so the loop has no seam. */
  duplicate?: boolean;
  /** Reverse direction. */
  reverse?: boolean;
  /** Pause on hover. */
  pauseOnHover?: boolean;
  className?: string;
}

/**
 * InfiniteSlider — SmoothUI-style infinitely scrolling row. The
 * content is duplicated in the DOM so the animation can loop
 * seamlessly. Hover pauses the animation. Reduced-motion users get a
 * static horizontal-scroll row.
 */
export function InfiniteSlider({
  children,
  speed = 28,
  duplicate = true,
  reverse = false,
  pauseOnHover = true,
  className,
}: InfiniteSliderProps) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (!trackRef.current) return;
    const el = trackRef.current.children[0] as HTMLElement | undefined;
    if (!el) return;
    setTrackWidth(el.scrollWidth);
  }, [children]);

  if (reduced) {
    return (
      <div className={cx('flex overflow-x-auto', className)}>
        <div className="flex shrink-0">{children}</div>
      </div>
    );
  }

  const duration = Math.max(8, (trackWidth / 100) * speed);

  return (
    <div
      className={cx('group relative w-full overflow-hidden', className)}
      onMouseEnter={(e) => {
        if (!pauseOnHover) return;
        const t = e.currentTarget.querySelector<HTMLElement>('[data-infinite-track]');
        if (t) t.style.animationPlayState = 'paused';
      }}
      onMouseLeave={(e) => {
        if (!pauseOnHover) return;
        const t = e.currentTarget.querySelector<HTMLElement>('[data-infinite-track]');
        if (t) t.style.animationPlayState = 'running';
      }}
    >
      <motion.div
        ref={trackRef}
        data-infinite-track
        className="flex w-max"
        animate={{ x: reverse ? ['0%', '50%'] : ['0%', '-50%'] }}
        transition={{ duration, ease: 'linear', repeat: Infinity }}
      >
        <div className="flex shrink-0">{children}</div>
        {duplicate && <div className="flex shrink-0" aria-hidden>{children}</div>}
      </motion.div>
    </div>
  );
}