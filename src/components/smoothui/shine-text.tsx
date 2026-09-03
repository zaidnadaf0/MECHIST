import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface ShineTextProps {
  children: string;
  /** Gradient stops for the masked sheen. */
  from?: string;
  via?: string;
  to?: string;
  /** Sweep cycle in seconds. */
  duration?: number;
  className?: string;
}

/**
 * ShineText — SmoothUI-style text with a travelling sheen sweep. Uses
 * a CSS mask on a translucent gradient that slides across the text.
 * Reduced-motion users get the static gradient.
 */
export function ShineText({
  children,
  from = 'rgb(34 89 195)',
  via = 'rgb(255 255 255)',
  to = 'rgb(15 176 174)',
  duration = 3.2,
  className,
}: ShineTextProps) {
  const reduced = useReducedMotion();

  return (
    <span className={cx('relative inline-block', className)}>
      <span className="text-gradient-signal">{children}</span>
      {!reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none"
          style={{
            backgroundImage: `linear-gradient(110deg, ${from} 0%, ${via} 50%, ${to} 100%)`,
            backgroundSize: '220% 100%',
            backgroundRepeat: 'no-repeat',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
            mixBlendMode: 'screen',
          }}
          initial={{ backgroundPosition: '120% 50%' }}
          animate={{ backgroundPosition: '-120% 50%' }}
          transition={{
            duration,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          {children}
        </motion.span>
      )}
    </span>
  );
}