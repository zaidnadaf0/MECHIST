import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface SparklesTextProps {
  children: string;
  /** Color of the sparkle dots. */
  color?: string;
  /** Number of sparkles. */
  count?: number;
  className?: string;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

function buildSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const x = (seed / 233280) * 100;
    const seed2 = (i * 6151 + 32749) % 233280;
    const y = (seed2 / 233280) * 100;
    return {
      id: i,
      x,
      y,
      size: 2 + ((i * 7) % 5),
      delay: (i * 0.31) % 2.4,
      duration: 1.6 + ((i * 13) % 18) / 10,
    };
  });
}

function SparkleDot({ s, color }: { s: Sparkle; color: string }) {
  return (
    <motion.span
      aria-hidden
      className="absolute"
      style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
      initial={{ opacity: 0, scale: 0.2, rotate: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0.2, 1, 0.2], rotate: [0, 90, 180] }}
      transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 10 10" width="100%" height="100%">
        <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill={color} />
      </svg>
    </motion.span>
  );
}

/**
 * SparklesText — Magic-UI-style inline text with little twinkles
 * positioned over the characters. Reduced-motion users get the static
 * gradient text only.
 */
export function SparklesText({
  children,
  color = 'rgb(34 199 194)',
  count = 12,
  className,
}: SparklesTextProps) {
  const reduced = useReducedMotion();
  const [sparkles, setSparkles] = useState<Sparkle[]>(() => buildSparkles(count));

  useEffect(() => {
    if (!reduced) setSparkles(buildSparkles(count));
  }, [count, reduced]);

  return (
    <span className={cx('relative inline-block', className)}>
      <span className="relative z-10 text-gradient-signal">{children}</span>
      {!reduced && (
        <span aria-hidden className="pointer-events-none absolute inset-0 z-0">
          {sparkles.map((s) => (
            <SparkleDot key={s.id} s={s} color={color} />
          ))}
        </span>
      )}
    </span>
  );
}
