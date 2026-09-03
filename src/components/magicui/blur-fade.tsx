import { forwardRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface BlurFadeProps {
  children: ReactNode;
  /** Delay in seconds. */
  delay?: number;
  /** Animate Y offset in px. */
  y?: number;
  /** Duration in seconds. */
  duration?: number;
  /** In-view trigger. Pass false to play on mount. */
  inView?: boolean;
  className?: string;
}

/**
 * BlurFade — Magic-UI-style intro. Fades in with a small Y-translate
 * and blur dissolve. Reduced-motion users get a plain opacity fade.
 */
export const BlurFade = forwardRef<HTMLDivElement, BlurFadeProps>(function BlurFade(
  { children, delay = 0, y = 12, duration = 0.5, inView = true, className },
  ref,
) {
  const reduced = useReducedMotion();
  const initial = reduced ? { opacity: 0 } : { opacity: 0, y, filter: 'blur(8px)' };
  const animate = reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' };
  const transition = { duration, delay, ease: [0.21, 0.5, 0.4, 1] as [number, number, number, number] };

  if (inView) {
    return (
      <motion.div
        ref={ref}
        initial={initial}
        whileInView={animate}
        viewport={{ once: true, margin: '-40px' }}
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
});
