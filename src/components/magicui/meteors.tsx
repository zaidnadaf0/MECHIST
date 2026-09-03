import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface MeteorsProps {
  /** Number of meteors. */
  count?: number;
  /** Tail length in px. */
  length?: number;
  /** Animation duration range, seconds. */
  minDuration?: number;
  maxDuration?: number;
  /** Color of the head. */
  color?: string;
  className?: string;
}

interface Meteor {
  id: number;
  top: number;
  left: number;
  delay: number;
  duration: number;
}

function buildMeteors(count: number): Meteor[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 7589 + 31417) % 233280;
    const top = (seed / 233280) * 100;
    const seed2 = (i * 4931 + 27901) % 233280;
    const left = (seed2 / 233280) * 100;
    return {
      id: i,
      top,
      left,
      delay: (i * 0.43) % 1.2,
      duration: 2.0 + ((i * 11) % 30) / 10,
    };
  });
}

/**
 * Meteors — Magic-UI-style diagonal streaks that fall from the top of
 * the container. Used as a "data raining" background behind the live
 * network section. Reduced-motion users get a static star field.
 */
export function Meteors({
  count = 24,
  length = 120,
  minDuration = 2.5,
  maxDuration = 6,
  color = 'rgb(34 199 194)',
  className,
}: MeteorsProps) {
  const reduced = useReducedMotion();
  const [meteors, setMeteors] = useState<Meteor[]>(() => buildMeteors(count));

  useEffect(() => {
    if (!reduced) setMeteors(buildMeteors(count));
  }, [count, reduced]);

  return (
    <div
      aria-hidden
      className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {meteors.map((m) => {
        const dur = minDuration + ((m.id * 13) % 100) / 100 * (maxDuration - minDuration);
        return (
          <span
            key={m.id}
            className="absolute"
            style={{
              top: `${m.top}%`,
              left: `${m.left}%`,
              width: `${length}px`,
              height: '1.4px',
              background: `linear-gradient(90deg, transparent, ${color})`,
              transform: 'rotate(215deg)',
              transformOrigin: 'left center',
              opacity: reduced ? 0.4 : 0.8,
            }}
          >
            {!reduced && (
              <motion.span
                className="block h-full w-full"
                style={{ background: `linear-gradient(90deg, transparent, ${color})` }}
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: [0, 1, 0], x: [0, length, length] }}
                transition={{ duration: dur, delay: m.delay, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
