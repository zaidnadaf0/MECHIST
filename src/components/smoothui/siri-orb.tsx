import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface SiriOrbProps {
  size?: number;
  /** Two CSS colors — orb blends between them. */
  colors?: [string, string];
  className?: string;
}

/**
 * SiriOrb — SmoothUI-style reactive orb. Two radial blobs orbiting a
 * central glow. Used as the ambient identity marker (e.g. AI assist
 * pulses in the landing page). Reduced-motion users see a static glow.
 */
export function SiriOrb({ size = 88, colors = ['rgb(59 125 255)', 'rgb(15 176 174)'], className }: SiriOrbProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(0);

  // Subtle reactive pulse — driven by a 1Hz timer so it always animates
  // but doesn't feel restless. Replaced with a static glow under
  // prefers-reduced-motion.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let start = performance.now();
    const tick = (t: number) => {
      setPulse(((t - start) % 2400) / 2400);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const glowScale = 0.85 + 0.15 * Math.sin(pulse * Math.PI * 2);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cx('relative isolate', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${colors[1]}, ${colors[0]} 65%, transparent 80%)`,
          filter: 'blur(14px)',
          opacity: 0.55,
          transform: `scale(${glowScale})`,
        }}
      />
      <motion.div
        className="absolute inset-2 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, ${colors[0]}, ${colors[1]}, ${colors[0]})`,
          mixBlendMode: 'screen',
        }}
        animate={reduced ? {} : { rotate: 360 }}
        transition={reduced ? undefined : { duration: 12, ease: 'linear', repeat: Infinity }}
      />
      <div
        className="absolute inset-4 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.85), transparent 65%)`,
          filter: 'blur(2px)',
        }}
      />
    </div>
  );
}