import { type ReactNode, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from './useReducedMotion';

interface MagnetProps {
  children: ReactNode;
  strength?: number;
  range?: number;
  className?: string;
}

/**
 * Subtle magnetic wrapper. On hover, the inner element follows the cursor
 * by `strength` * delta from centre. Disabled when prefers-reduced-motion.
 */
export function Magnet({ children, strength = 0.25, range = 80, className }: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 20 });
  const sy = useSpring(y, { stiffness: 250, damping: 20 });

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > range) { x.set(0); y.set(0); return; }
      x.set(dx * strength);
      y.set(dy * strength);
    };
    const onLeave = () => { x.set(0); y.set(0); };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [range, strength, x, y, reduced]);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div ref={ref} className={className} style={{ x: sx, y: sy }}>
      {children}
    </motion.div>
  );
}

/** A small intensity-from-cursor transform helper for layered parallax. */
export function pointerIntensity(mx: ReturnType<typeof useMotionValue<number>>, strength = 0.1) {
  return useTransform(mx, [-1, 1], [-strength, strength]);
}
