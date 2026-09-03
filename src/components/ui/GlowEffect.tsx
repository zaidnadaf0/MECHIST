import { useEffect, useRef } from 'react';
import { cx } from '@/lib/utils';

/**
 * GlowEffect — slow rotating conic gradient behind a card border.
 *
 * The implementation is a `<div>` with a CSS conic-gradient that
 * rotates. Respects `prefers-reduced-motion` by halting rotation.
 * Used by the Unlumen `BlobCard` to produce the luminous "live
 * border" look.
 */

export interface GlowEffectProps {
  /** Stops in the conic gradient. */
  colors?: string[];
  mode?: 'rotate' | 'pulse' | 'colorShift';
  /** Tailwind-style blur intensity. */
  blur?: 'soft' | 'medium' | 'strong' | 'strongest';
  /** Seconds for one full revolution (rotate mode) or full pulse. */
  duration?: number;
  scale?: number;
  className?: string;
}

const BLUR_PX: Record<NonNullable<GlowEffectProps['blur']>, number> = {
  soft: 8,
  medium: 16,
  strong: 32,
  strongest: 64,
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function GlowEffect({
  colors = ['#3DA9FC', '#22C7C2', '#8E7BF7', '#3DA9FC'],
  mode = 'rotate',
  blur = 'medium',
  duration = 5,
  scale = 1,
  className,
}: GlowEffectProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const el = ref.current;
    if (!el) return;

    const conic = `conic-gradient(from 0deg, ${colors.join(', ')})`;
    el.style.background = conic;
    if (!reduced && mode === 'rotate') {
      el.style.animation = `glow-rotate ${duration}s linear infinite`;
    } else if (!reduced && mode === 'pulse') {
      el.style.animation = `glow-pulse ${duration}s ease-in-out infinite`;
    }
  }, [colors, mode, duration]);

  const blurPx = BLUR_PX[blur];

  return (
    <div
      aria-hidden
      className={cx('pointer-events-none h-full w-full', className)}
      style={{
        transform: `scale(${scale})`,
        filter: `blur(${blurPx}px)`,
        willChange: 'transform, opacity',
      }}
    >
      <div
        ref={ref}
        className="h-full w-full rounded-[inherit] opacity-80"
        style={{ transformOrigin: 'center' }}
      />
      <style>{`
        @keyframes glow-rotate { to { transform: rotate(360deg); } }
        @keyframes glow-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}