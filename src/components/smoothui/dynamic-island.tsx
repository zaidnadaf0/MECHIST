import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface DynamicIslandActivity {
  id: string;
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}

export interface DynamicIslandProps {
  activities: DynamicIslandActivity[];
  /** Display duration per activity in ms. */
  hold?: number;
  className?: string;
}

/**
 * DynamicIsland — SmoothUI-style compact status capsule. Cycles
 * through the supplied activities, expanding between a small dot and
 * a wide pill. Honors prefers-reduced-motion (snaps between states).
 */
export function DynamicIsland({
  activities,
  hold = 2400,
  className,
}: DynamicIslandProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (activities.length < 2 || reduced) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % activities.length);
    }, hold);
    return () => window.clearInterval(id);
  }, [activities.length, hold, reduced]);

  if (activities.length === 0) return null;
  const a = activities[index];

  return (
    <div
      className={cx(
        'pointer-events-auto inline-flex items-center justify-center',
        'rounded-full bg-ink-900 text-ink-50 shadow-[0_18px_45px_-18px_rgb(0_0_0/0.55)]',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={a.id}
          initial={reduced ? { opacity: 1 } : { width: 28, opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { width: 'auto', opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { width: 28, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2 overflow-hidden rounded-full px-3 py-2"
        >
          {a.icon && <span className="grid h-5 w-5 shrink-0 place-items-center text-aqua-300">{a.icon}</span>}
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[0.78rem] font-semibold tracking-[0.02em]">{a.title}</span>
            {a.subtitle && (
              <span className="truncate text-[0.68rem] text-ink-300">{a.subtitle}</span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}