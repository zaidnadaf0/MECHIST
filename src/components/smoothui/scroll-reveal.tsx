import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

export interface ScrollRevealProps {
  children: ReactNode;
  /** Animation type. */
  animation?: 'fadeUp' | 'fadeIn' | 'slideRight' | 'zoom';
  /** Delay before the entrance fires (seconds). */
  delay?: number;
  /** Per-item duration in seconds. */
  duration?: number;
  /** Element to render. Defaults to div. */
  as?: 'div' | 'section' | 'article' | 'span';
  className?: string;
  /** Trigger margin — passed straight through to framer-motion. */
  margin?: string;
}

const PRESETS: Record<NonNullable<ScrollRevealProps['animation']>, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -28 },
    show: { opacity: 1, x: 0 },
  },
  zoom: {
    hidden: { opacity: 0, scale: 0.94 },
    show: { opacity: 1, scale: 1 },
  },
};

/**
 * ScrollReveal — SmoothUI-style viewport wrapper. Plays its entrance
 * once when the element enters the viewport. Honors
 * prefers-reduced-motion (snaps to final state).
 */
export function ScrollReveal({
  children,
  animation = 'fadeUp',
  delay = 0,
  duration = 0.7,
  as = 'div',
  className,
  margin = '-60px',
}: ScrollRevealProps) {
  const reduced = useReducedMotion();
  const base = PRESETS[animation];
  const Tag = motion[as];

  return (
    <Tag
      className={cx(className)}
      variants={{
        hidden: base.hidden,
        show: {
          ...base.show,
          transition: {
            duration: reduced ? 0 : duration,
            delay: reduced ? 0 : delay,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin }}
    >
      {children}
    </Tag>
  );
}