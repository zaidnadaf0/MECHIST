import { useId, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface AnimatedTab {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export interface AnimatedTabsProps {
  tabs: AnimatedTab[];
  initial?: string;
  className?: string;
  /** Tailwind background class for the active pill. */
  activeBg?: string;
}

/**
 * AnimatedTabs — SmoothUI-style tabs with a sliding pill behind the
 * active label. Layout is driven by framer-motion's shared layout
 * animation. Reduced-motion users get a static border marker instead
 * of a sliding pill.
 */
export function AnimatedTabs({
  tabs,
  initial,
  className,
  activeBg = 'bg-azure-500 text-white',
}: AnimatedTabsProps) {
  const reactId = useId();
  const [active, setActive] = useState<string>(initial ?? tabs[0]?.id ?? '');
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  const reduced = useReducedMotion();

  return (
    <div className={cx('w-full', className)}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="relative inline-flex items-center gap-1 rounded-full border border-line-soft bg-surface-2 p-1"
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${reactId}-panel`}
              onClick={() => setActive(t.id)}
              className={cx(
                'relative z-10 px-5 py-2 text-small font-medium rounded-full transition-colors',
                isActive && !reduced ? 'text-white' : isActive ? 'text-azure-300' : 'text-fg-muted hover:text-fg-app',
              )}
            >
              {isActive && !reduced && (
                <motion.span
                  layoutId={`${reactId}-tab-pill`}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className={cx('absolute inset-0 -z-10 rounded-full', activeBg)}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-2">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${reactId}-panel`}
        className="mt-6"
      >
        {current?.content}
      </div>
    </div>
  );
}