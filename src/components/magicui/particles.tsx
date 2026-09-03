import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface ParticlesProps {
  /** Number of particles. */
  count?: number;
  /** Color of the particles. */
  color?: string;
  /** Connection line color. */
  lineColor?: string;
  /** Maximum distance for drawing a connection line. */
  connectRadius?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

/**
 * Particles — Magic-UI-style network graph rendered to a 2D canvas.
 * Particles drift, bounce off the edges, and connect to nearby
 * neighbours with thin lines. Reduced-motion users get a single
 * still frame (the first paint) — no drift, no connecting animation.
 */
export function Particles({
  count = 60,
  color = 'rgb(34 199 194)',
  lineColor = 'rgba(34 199 194, 0.18)',
  connectRadius = 110,
  className,
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const seed = (i: number) => ((i * 2654435761) % 4294967296) / 4294967296;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
      x: seed(i * 2),
      y: seed(i * 2 + 1),
      vx: (seed(i * 2 + 2) - 0.5) * 0.0006,
      vy: (seed(i * 2 + 3) - 0.5) * 0.0006,
      r: 0.8 + seed(i * 2 + 4) * 1.4,
    }));

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!reducedRef.current) {
        for (const p of particles) {
          p.x += p.vx * dt * dpr;
          p.y += p.vy * dt * dpr;
          if (p.x < 0 || p.x > 1) p.vx = -p.vx;
          if (p.y < 0 || p.y > 1) p.vy = -p.vy;
        }
      }

      const connectPx = (connectRadius / 600) * Math.max(w, h);
      ctx.lineWidth = 1 * dpr;
      ctx.strokeStyle = lineColor;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]!;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]!;
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const d = Math.hypot(dx, dy);
          if (d < connectPx) {
            ctx.globalAlpha = 1 - d / connectPx;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = color;
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [count, color, lineColor, connectRadius]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cx('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  );
}
