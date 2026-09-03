import { ElementType, useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface RevealTextProps {
  children: string;
  /** Reveal unit. */
  by?: 'character' | 'word' | 'line';
  /** Animation type. */
  animation?: 'slideUp' | 'fadeIn' | 'blurIn' | 'rise';
  /** Stagger between units in seconds. */
  stagger?: number;
  /** Per-unit duration in seconds. */
  duration?: number;
  /** Render element. */
  as?: ElementType;
  /** Accent class for a substring. */
  accentClassName?: string;
  accentText?: string;
  className?: string;
}

const PRESETS: Record<NonNullable<RevealTextProps['animation']>, Variants> = {
  slideUp: { hidden: { y: '110%' }, show: { y: '0%' } },
  fadeIn: { hidden: { opacity: 0 }, show: { opacity: 1 } },
  blurIn: { hidden: { opacity: 0, filter: 'blur(10px)' }, show: { opacity: 1, filter: 'blur(0px)' } },
  rise: { hidden: { opacity: 0, y: 24, filter: 'blur(8px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)' } },
};

function tokenize(s: string, by: NonNullable<RevealTextProps['by']>): string[] {
  if (by === 'word') return s.split(/(\s+)/);
  if (by === 'line') return s.split('\n');
  return Array.from(s);
}

/**
 * RevealText — SmoothUI-style reveal. Wraps each token in a clipped
 * span so it can slide/fade/blur up from a mask. Reduced-motion users
 * get the final state instantly (no per-unit motion).
 */
export function RevealText({
  children,
  by = 'word',
  animation = 'slideUp',
  stagger = 0.06,
  duration = 0.7,
  as: Tag = 'span',
  accentClassName,
  accentText,
  className,
}: RevealTextProps) {
  const reduced = useReducedMotion();
  const tokens = useMemo(() => tokenize(children, by), [children, by]);
  const baseVariants = PRESETS[animation];

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : stagger } },
  };
  const item: Variants = {
    hidden: baseVariants.hidden,
    show: {
      ...baseVariants.show,
      transition: { duration: reduced ? 0 : duration, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <Tag className={cx('inline-block', className)}>
      <motion.span
        aria-label={children}
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
        className="inline-block"
      >
        {tokens.map((t, i) => {
          const isWhitespace = by === 'character' ? /^\s+$/.test(t) : false;
          if (isWhitespace) return <span key={i}>{t}</span>;
          const accent = accentText && accentClassName && t.includes(accentText);
          const inner = accent ? <span className={accentClassName}>{t}</span> : t;
          return (
            <span key={i} className="relative inline-block overflow-hidden align-baseline">
              <motion.span variants={item} className="inline-block">
                {inner}
              </motion.span>
            </span>
          );
        })}
      </motion.span>
    </Tag>
  );
}