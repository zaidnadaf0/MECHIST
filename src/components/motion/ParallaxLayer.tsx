import { type ReactNode, useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { usePrefersReducedMotion } from './useReducedMotion';

interface ParallaxLayerProps {
  children: ReactNode;
  speed?: number;
  pointer?: number;
  className?: string;
}

/**
 * Combined scroll + pointer parallax. `speed` is the fraction of scroll
 * distance to translate (positive = moves slower). `pointer` (0–1) is the
 * fraction of cursor offset to translate on the X axis.
 */
export function ParallaxLayer({ children, speed = 0.15, pointer = 0, className }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 80, -speed * 80]);

  const px = useMotionValue(0);
  const pys = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 20 });
  const sy = useSpring(pys, { stiffness: 150, damping: 20 });
  const tx = useTransform(sx, [-1, 1], [-pointer * 12, pointer * 12]);
  const ty = useTransform(sy, [-1, 1], [-pointer * 12, pointer * 12]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const nx = (e.clientX - cx) / (r.width / 2 || 1);
    const ny = (e.clientY - cy) / (r.height / 2 || 1);
    px.set(Math.max(-1, Math.min(1, nx)));
    pys.set(Math.max(-1, Math.min(1, ny)));
  };

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y, x: pointer ? tx : 0, translateY: ty }}
      onMouseMove={handleMouseMove}
    >
      {children}
    </motion.div>
  );
}
