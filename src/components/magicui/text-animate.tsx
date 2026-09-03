import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ElementType } from 'react';
import { cx } from '@/lib/utils';

export interface TextAnimateProps {
  children: string;
  /** Animation per character. */
  by?: 'character' | 'word' | 'line';
  animation?: 'fadeUp' | 'fadeIn' | 'blurIn' | 'slideUp' | 'scale';
  /** Seconds. */
  duration?: number;
  /** Stagger between units in seconds. */
  stagger?: number;
  /** Element to render. */
  as?: ElementType;
  className?: string;
  /** Color tint to apply to a specific token. */
  accentClassName?: string;
  /** Substring to render with accentClassName. */
  accentText?: string;
}

const PRESETS: Record<NonNullable<TextAnimateProps['animation']>, Variants> = {
  fadeUp: { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } },
  fadeIn: { hidden: { opacity: 0 }, show: { opacity: 1 } },
  blurIn: { hidden: { opacity: 0, filter: 'blur(10px)' }, show: { opacity: 1, filter: 'blur(0px)' } },
  slideUp: { hidden: { y: '100%' }, show: { y: '0%' } },
  scale: { hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1 } },
};

function tokenize(s: string, by: NonNullable<TextAnimateProps['by']>): string[] {
  if (by === 'word') return s.split(/(\s+)/);
  if (by === 'line') return s.split('\n');
  return Array.from(s);
}

/**
 * TextAnimate — Magic-UI-style per-character entrance. Animates each
 * unit of the text in sequence. Reduced-motion users get the final
 * state instantly (no per-unit motion).
 */
export function TextAnimate({
  children,
  by = 'word',
  animation = 'fadeUp',
  duration = 0.5,
  stagger = 0.04,
  as: Tag = 'span',
  className,
  accentClassName,
  accentText,
}: TextAnimateProps) {
  const reduced = useReducedMotion();
  const tokens = tokenize(children, by);
  const variants = PRESETS[animation];
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : stagger } },
  };
  const item: Variants = {
    hidden: variants.hidden,
    show: {
      ...variants.show,
      transition: { duration: reduced ? 0 : duration, ease: [0.21, 0.5, 0.4, 1] },
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
          return (
            <motion.span
              key={i}
              variants={item}
              className={cx('inline-block', by === 'line' && 'block')}
            >
              {accent ? <span className={accentClassName}>{t}</span> : t}
            </motion.span>
          );
        })}
      </motion.span>
    </Tag>
  );
}
