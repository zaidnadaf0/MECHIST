import { useEffect, useMemo, useRef } from 'react';
import { cx } from '@/lib/utils';

/**
 * FluidBlobs — animated organic blobs that morph and drift.
 *
 * MECHIST-tuned: by default the blobs are cool azure/aqua (premium
 * automotive palette) rather than the pink palette the original Unlumen
 * scaffold shipped. Caller can override via `lightColors` / `darkColors`.
 *
 * Each blob is a separate `<path>` whose `d` attribute is interpolated
 * between several baked-in keyframes; a single rAF loop drives all
 * blobs. Respects `prefers-reduced-motion` (freezes on first frame).
 */

export interface BlobOrigin {
  /** 0–100 (% of viewport width). */
  x: number;
  /** 0–100 (% of viewport height). */
  y: number;
}

export interface FluidBlobsProps {
  lightColors?: string[];
  darkColors?: string[];
  origins?: BlobOrigin[];
  /** Padding around blob area so blobs can drift out of viewport edges. */
  margin?: number;
  /** SVG feGaussianBlur stdDeviation. */
  blur?: number;
  className?: string;
}

const DEFAULT_LIGHT = ['#3DA9FC', '#22C7C2', '#5A8DEE', '#8E7BF7'];
const DEFAULT_DARK = ['#1A2B6B', '#0E2E48', '#1B3A6B', '#221C5A'];

const KEYFRAMES = [
  'M44.5,-58.3C56.6,-49.4,64.2,-32.7,67.5,-15.3C70.7,2.1,69.6,20.2,61.7,33.7C53.7,47.2,38.9,56.1,22.7,62.1C6.5,68.1,-11.1,71.2,-26.4,66.1C-41.7,61.1,-54.7,47.8,-62.1,32.2C-69.5,16.6,-71.3,-1.4,-66.3,-17.1C-61.3,-32.8,-49.5,-46.3,-35.4,-55.4C-21.2,-64.5,-4.8,-69.3,10.7,-69.4C26.2,-69.6,32.4,-57.2,44.5,-58.3Z',
  'M40.6,-54.5C52.5,-44.6,61.9,-32.7,65.1,-18.7C68.3,-4.7,65.4,11.5,58.4,24.7C51.4,37.9,40.3,48.1,26.8,55.4C13.3,62.7,-2.6,67.1,-17.4,64.1C-32.2,61,-46,50.6,-55.4,36.9C-64.9,23.2,-70.1,6.4,-67.9,-9C-65.7,-24.3,-56.2,-38.2,-43.7,-48.5C-31.3,-58.7,-15.6,-65.4,0.4,-66C16.4,-66.6,28.7,-58.4,40.6,-54.5Z',
  'M42.7,-56.1C54.7,-46.1,63.4,-32.6,66.6,-17.7C69.8,-2.7,67.6,13.7,60.2,26.7C52.9,39.6,40.4,49.2,25.9,57C11.3,64.9,-5.3,71.1,-21.6,69.4C-37.9,67.7,-53.9,58.1,-62.5,44.4C-71.1,30.7,-72.4,13,-69.3,-3.4C-66.2,-19.7,-58.7,-34.8,-47.4,-46.5C-36.1,-58.2,-21.1,-66.6,-4.6,-66.6C11.9,-66.6,30.7,-56.1,42.7,-56.1Z',
  'M38.8,-51.4C50.1,-41.3,58.5,-28.7,62.2,-14.3C65.9,0.1,65,16.4,58,29.3C51,42.2,38.1,51.6,23.4,57.4C8.7,63.2,-7.9,65.4,-22.7,61.3C-37.5,57.3,-50.6,47,-58.8,33.4C-67.1,19.7,-70.6,2.7,-67.4,-12.7C-64.1,-28.2,-54.1,-42.1,-41.4,-52.5C-28.7,-63,-14.4,-69.9,0.6,-70.6C15.6,-71.3,27.5,-61.5,38.8,-51.4Z',
];

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FluidBlobs({
  lightColors = DEFAULT_LIGHT,
  darkColors = DEFAULT_DARK,
  origins = [
    { x: 50, y: -55 },
    { x: 50, y: -25 },
    { x: 50, y: -25 },
    { x: 50, y: -25 },
  ],
  margin = 60,
  blur = 50,
  className,
}: FluidBlobsProps) {
  const refs = useRef<Array<SVGPathElement | null>>([]);
  const rafRef = useRef<number | null>(null);

  const palette = useMemo(() => {
    const dark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
    return dark ? darkColors : lightColors;
  }, [lightColors, darkColors]);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    if (reduced) return;

    let frame = 0;
    const tick = () => {
      frame = (frame + 1) % (KEYFRAMES.length * 60);
      refs.current.forEach((el, i) => {
        if (!el) return;
        const phase = (i + Math.floor(frame / 60)) % KEYFRAMES.length;
        el.setAttribute('d', KEYFRAMES[phase]!);
        el.style.opacity = String(0.55 + 0.25 * Math.sin((frame + i * 30) * 0.012));
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <svg
      role="img"
      aria-label="Animated background"
      viewBox="-100 -100 200 200"
      preserveAspectRatio="xMidYMid slice"
      className={cx('absolute inset-0 h-full w-full', className)}
      style={{ filter: `blur(${blur}px)` }}
    >
      <defs>
        <radialGradient id="fb-gradient-0" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette[0]} stopOpacity="0.95" />
          <stop offset="100%" stopColor={palette[0]} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fb-gradient-1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette[1]} stopOpacity="0.85" />
          <stop offset="100%" stopColor={palette[1]} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fb-gradient-2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette[2]} stopOpacity="0.9" />
          <stop offset="100%" stopColor={palette[2]} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fb-gradient-3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette[3] ?? palette[0]} stopOpacity="0.8" />
          <stop offset="100%" stopColor={palette[3] ?? palette[0]} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g transform={`translate(0 ${margin / 4})`}>
        {origins.map((o, i) => (
          <g key={i} transform={`translate(${o.x - 100} ${o.y}) scale(${1 + i * 0.05})`}>
            <path
              ref={(el) => {
                refs.current[i] = el;
              }}
              fill={`url(#fb-gradient-${i % 4})`}
              d={KEYFRAMES[0]}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}