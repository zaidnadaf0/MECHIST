import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/components/motion';

/**
 * ParticleWave — ambient dotted undulating mesh (user video reference:
 * black loop, white dotted diamond terrain with expanding ripples).
 *
 * Canvas 2D port of RoadAssistBACKUP's `assets/js/bg-wave.js` — no new
 * dependencies, no backend change. Mounted on public routes UNDER the
 * existing Lightning WebGL layer (which is translucent), portals untouched
 * so dispatch/map UIs stay at full fps. Static single frame when
 * prefers-reduced-motion is set.
 */
export function ParticleWave() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let t = Math.random() * 10;
    let last = performance.now();
    let W = window.innerWidth;
    let H = window.innerHeight;

    const isDark = () =>
      document.documentElement.classList.contains('dark');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const field = (u: number, v: number, time: number) => {
      const dist = Math.sqrt(u * u + v * v);
      const w = Math.sin(u * 3.1 + time * 0.9) * Math.cos(v * 2.7 - time * 0.7);
      const ripple = Math.sin(dist * 9.0 - time * 2.4) * Math.exp(-dist * 2.1);
      const bump = Math.exp(-dist * dist * 3.2) * Math.sin(time * 0.8) * 0.6;
      return w * 0.55 + ripple * 1.15 + bump;
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, W, H);
      const dark = isDark();
      const cx = W * 0.5;
      const cy = H * 0.34;
      const scale = Math.min(W, H) * 0.46;
      const cols = Math.max(36, Math.min(104, Math.floor(W / 22)));
      const rows = Math.max(22, Math.min(56, Math.floor(H / 26)));
      const dot = dark ? '255,255,255' : '16,20,28';
      const warm = dark ? '255,138,42' : '188,122,12';

      for (let j = 0; j <= rows; j++) {
        const v = (j / rows) * 2 - 1;
        for (let i = 0; i <= cols; i++) {
          const u = (i / cols) * 2 - 1;
          const dist = Math.sqrt(u * u + v * v);
          if (dist > 1.15) continue;
          const z = field(u, v, time);
          const mask = Math.max(0, 1 - Math.pow(dist / 1.15, 2.4));
          const x = cx + u * scale * 1.55;
          const y = cy + v * scale * 0.52 - z * scale * 0.16;
          const depth = 0.35 + 0.65 * ((z + 1.7) / 3.4);
          const a = (dark ? 0.5 : 0.22) * mask * depth;
          if (a < 0.02) continue;
          const r = (dark ? 1.5 : 1.3) * (0.7 + depth * 0.6);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 6.2832);
          ctx.fillStyle =
            z > 0.95
              ? `rgba(${warm},${Math.min(0.95, a + 0.25).toFixed(3)})`
              : `rgba(${dot},${a.toFixed(3)})`;
          ctx.fill();
        }
      }
    };

    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    draw(t);
    if (reduce) return () => window.removeEventListener('resize', onResize);

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      t += dt * 0.9;
      if (!document.hidden) draw(t);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduce) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduce]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-80 [mask-image:linear-gradient(180deg,#000_0%,#000_46%,transparent_86%)]"
    />
  );
}
