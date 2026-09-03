/**
 * MECHIST — bespoke inline SVG illustrations for the new UI.
 *
 * Per the brief, visual media should be curated and purposeful — no
 * generic stock. Each component is a self-contained SVG that fills its
 * container, uses currentColor / design-system tints, and supports
 * `prefers-reduced-motion` via CSS-only animations (so users with the
 * preference set still see the static composition).
 *
 * Conventions:
 *   - Every SVG sets `role="img"` and a meaningful `<title>` for SR.
 *   - `preserveAspectRatio="xMidYMid meet"` so they crop gracefully.
 *   - Animations are CSS keyframes inside the SVG's <style> block.
 *     No JS timers.
 *   - Sizing: pass `className` from the consumer (typically `h-full w-full`).
 */
import type { CSSProperties } from 'react';
import { cx } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

const STROKE = 1.5;

/* ------------------------------------------------------------------ */
/* Hero scene — vehicle + mechanic nodes + connection lines            */
/*                                                                    */
/* Used by Landing hero and the matching scene. 3D version is the     */
/* hero scene in `components/hero/HeroScene.tsx`; this is the lighter  */
/* CSS/SVG variant for sub-heroes, banners, and mobile.                */
/* ------------------------------------------------------------------ */

export function HeroSceneArt({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-labelledby="hero-scene-title"
      viewBox="0 0 800 560"
      preserveAspectRatio="xMidYMid meet"
      className={cx('h-full w-full text-fg-app', className)}
    >
      <title id="hero-scene-title">A vehicle surrounded by a network of nearby mechanics.</title>
      <defs>
        <linearGradient id="heroRoad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.02" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgb(59 125 255)" stopOpacity="0.45" />
          <stop offset="60%" stopColor="rgb(59 125 255)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="rgb(59 125 255)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="heroPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgb(117 84 245)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(117 84 245)" stopOpacity="0" />
        </radialGradient>
        <pattern id="heroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
        <style>{`
          @keyframes hero-ping {
            0% { r: 4; opacity: 0.9; }
            100% { r: 36; opacity: 0; }
          }
          @keyframes hero-pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.9; }
          }
          @keyframes hero-route {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -120; }
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-anim { animation: none !important; }
          }
        `}</style>
      </defs>

      {/* Road + grid */}
      <rect width="800" height="560" fill="url(#heroRoad)" />
      <rect width="800" height="560" fill="url(#heroGrid)" />

      {/* Center halo behind the car */}
      <circle cx="400" cy="320" r="220" fill="url(#heroGlow)" />

      {/* Concentric distance rings */}
      <g fill="none" stroke="currentColor" strokeOpacity="0.18">
        <circle cx="400" cy="320" r="120" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="400" cy="320" r="190" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="400" cy="320" r="260" strokeWidth="1" strokeDasharray="2 6" />
      </g>

      {/* Connection lines from center to mechanic nodes */}
      <g fill="none" stroke="rgb(59 125 255)" strokeWidth="1.4" strokeOpacity="0.55">
        <path d="M 400 320 L 160 160" strokeDasharray="6 6" />
        <path d="M 400 320 L 660 130" strokeDasharray="6 6" />
        <path d="M 400 320 L 700 360" strokeDasharray="6 6" />
        <path d="M 400 320 L 130 420" strokeDasharray="6 6" />
        <path d="M 400 320 L 540 480" strokeDasharray="6 6" />
      </g>

      {/* The vehicle */}
      <g transform="translate(310 290)">
        <rect x="0" y="22" width="180" height="46" rx="10" fill="rgb(20 26 38)" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
        <path d="M 14 22 L 32 4 L 148 4 L 166 22 Z" fill="rgb(28 36 52)" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
        <rect x="36" y="8" width="48" height="14" rx="2" fill="rgb(59 125 255)" fillOpacity="0.18" />
        <rect x="96" y="8" width="48" height="14" rx="2" fill="rgb(59 125 255)" fillOpacity="0.18" />
        <circle cx="36" cy="68" r="12" fill="rgb(10 14 22)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="144" cy="68" r="12" fill="rgb(10 14 22)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="36" cy="68" r="4" fill="rgb(255 255 255)" fillOpacity="0.18" />
        <circle cx="144" cy="68" r="4" fill="rgb(255 255 255)" fillOpacity="0.18" />
        {/* Headlight beam */}
        <path d="M 180 36 L 240 24 L 240 48 Z" fill="url(#heroPulse)" opacity="0.7" />
        <rect x="180" y="34" width="6" height="4" rx="1.5" fill="rgb(59 125 255)" />
      </g>

      {/* Mechanic nodes */}
      <g>
        {[
          { x: 160, y: 160, hue: 'rgb(117 84 245)' },
          { x: 660, y: 130, hue: 'rgb(15 176 174)' },
          { x: 700, y: 360, hue: 'rgb(15 176 174)' },
          { x: 130, y: 420, hue: 'rgb(242 174 42)' },
          { x: 540, y: 480, hue: 'rgb(117 84 245)' },
        ].map((n, i) => (
          <g key={i} transform={`translate(${n.x} ${n.y})`}>
            <circle r="20" fill={n.hue} fillOpacity="0.12" className="hero-anim" style={{ animation: 'hero-ping 2.8s ease-out infinite', transformOrigin: 'center' }} />
            <circle r="8" fill={n.hue} fillOpacity="0.95" />
            <circle r="3" fill="white" />
          </g>
        ))}
      </g>

      {/* Coordinates label */}
      <g transform="translate(560 60)" fill="currentColor" fillOpacity="0.55" fontFamily="JetBrains Mono, monospace" fontSize="11">
        <text x="0" y="0">33.6844° N</text>
        <text x="0" y="14">73.0479° E</text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Match diagram — customer node, mechanic candidates, distance rings  */
/* ------------------------------------------------------------------ */

export function MatchDiagramArt({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-labelledby="match-diagram-title"
      viewBox="0 0 720 460"
      preserveAspectRatio="xMidYMid meet"
      className={cx('h-full w-full text-fg-app', className)}
    >
      <title id="match-diagram-title">Customer location with candidate mechanics within service radius.</title>
      <defs>
        <radialGradient id="matchGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgb(15 176 174)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(15 176 174)" stopOpacity="0" />
        </radialGradient>
        <style>{`
          @keyframes match-ring {
            0% { r: 8; opacity: 0.7; }
            100% { r: 90; opacity: 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            .match-anim { animation: none !important; }
          }
        `}</style>
      </defs>

      <circle cx="360" cy="230" r="170" fill="url(#matchGlow)" />

      <g fill="none" stroke="rgb(15 176 174)" strokeOpacity="0.25">
        <circle cx="360" cy="230" r="60" strokeDasharray="3 6" />
        <circle cx="360" cy="230" r="110" strokeDasharray="3 6" />
        <circle cx="360" cy="230" r="160" strokeDasharray="3 6" />
      </g>

      {/* Distance labels */}
      <g fill="currentColor" fillOpacity="0.45" fontFamily="JetBrains Mono, monospace" fontSize="10">
        <text x="430" y="175">1 km</text>
        <text x="480" y="125">3 km</text>
        <text x="530" y="80">5 km</text>
      </g>

      {/* Connection lines */}
      <g fill="none" stroke="rgb(15 176 174)" strokeWidth="1.2" strokeOpacity="0.6">
        <path d="M 360 230 L 220 130" />
        <path d="M 360 230 L 540 110" />
        <path d="M 360 230 L 600 290" />
        <path d="M 360 230 L 460 380" />
        <path d="M 360 230 L 200 360" />
      </g>

      {/* Customer node (center) */}
      <g transform="translate(360 230)">
        <circle r="20" fill="rgb(59 125 255)" fillOpacity="0.18" />
        <circle r="9" fill="rgb(59 125 255)" />
        <circle r="3.2" fill="white" />
      </g>

      {/* Mechanic nodes */}
      {[
        { x: 220, y: 130, color: 'rgb(117 84 245)', pulse: true },
        { x: 540, y: 110, color: 'rgb(15 176 174)' },
        { x: 600, y: 290, color: 'rgb(15 176 174)' },
        { x: 460, y: 380, color: 'rgb(117 84 245)' },
        { x: 200, y: 360, color: 'rgb(242 174 42)' },
      ].map((n, i) => (
        <g key={i} transform={`translate(${n.x} ${n.y})`}>
          {n.pulse && (
            <circle r="8" fill={n.color} fillOpacity="0.4" className="match-anim" style={{ animation: 'match-ring 2.4s ease-out infinite' }} />
          )}
          <circle r="7" fill={n.color} />
          <circle r="2.5" fill="white" />
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Lifecycle ribbon — Find → Match → Dispatch → Track → Resolve        */
/* ------------------------------------------------------------------ */

export function LifecycleArt({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      role="img"
      aria-labelledby="lifecycle-title"
      viewBox="0 0 900 220"
      preserveAspectRatio="xMidYMid meet"
      className={cx('h-full w-full text-fg-app', className)}
      style={style}
    >
      <title id="lifecycle-title">The MECHIST lifecycle: Find, Match, Dispatch, Track, Resolve.</title>
      <defs>
        <linearGradient id="lcLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgb(59 125 255)" />
          <stop offset="50%" stopColor="rgb(117 84 245)" />
          <stop offset="100%" stopColor="rgb(15 176 174)" />
        </linearGradient>
      </defs>

      {/* Base line */}
      <path d="M 60 110 C 200 60, 280 160, 420 110 S 640 60, 780 110" stroke="url(#lcLine)" strokeWidth="2" fill="none" strokeOpacity="0.6" />

      {/* Steps */}
      {[
        { x: 80,   label: 'Find',     sub: 'Locate',       color: 'rgb(59 125 255)' },
        { x: 250,  label: 'Match',    sub: 'Rank',         color: 'rgb(117 84 245)' },
        { x: 450,  label: 'Dispatch', sub: 'Connect',      color: 'rgb(15 176 174)' },
        { x: 640,  label: 'Track',    sub: 'Live ETA',     color: 'rgb(15 176 174)' },
        { x: 820,  label: 'Resolve',  sub: 'Complete',     color: 'rgb(22 169 113)' },
      ].map((s, i) => (
        <g key={i} transform={`translate(${s.x} 110)`}>
          <circle r="10" fill={s.color} />
          <circle r="16" fill={s.color} fillOpacity="0.18" />
          <text x="0" y="-22" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700" fill="currentColor">
            {s.label}
          </text>
          <text x="0" y="34" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="currentColor" fillOpacity="0.55">
            {s.sub}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Problem category icons (line-style, two-tone)                       */
/* ------------------------------------------------------------------ */

export interface ProblemGlyphProps {
  className?: string;
  /** Foreground tint — defaults to currentColor */
  tone?: string;
}

export function BatteryGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Battery" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <rect x="6" y="18" width="46" height="32" rx="6" fill="none" stroke={tone} strokeWidth={STROKE} />
      <rect x="54" y="26" width="6" height="16" rx="2" fill={tone} />
      <rect x="12" y="24" width="14" height="20" rx="2" fill={tone} fillOpacity="0.35" />
      <rect x="28" y="24" width="8" height="20" rx="2" fill={tone} fillOpacity="0.7" />
    </svg>
  );
}

export function TyreGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Flat tyre" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <circle cx="32" cy="32" r="22" fill="none" stroke={tone} strokeWidth={STROKE} />
      <circle cx="32" cy="32" r="10" fill="none" stroke={tone} strokeWidth={STROKE} />
      <path d="M 32 10 L 32 22 M 32 42 L 32 54 M 10 32 L 22 32 M 42 32 L 54 32" stroke={tone} strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M 14 14 L 22 22 M 50 14 L 42 22" stroke={tone} strokeOpacity="0.6" strokeWidth={STROKE} strokeLinecap="round" />
    </svg>
  );
}

export function EngineGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Engine" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <rect x="8" y="20" width="40" height="24" rx="4" fill="none" stroke={tone} strokeWidth={STROKE} />
      <rect x="48" y="26" width="8" height="12" rx="2" fill={tone} fillOpacity="0.35" />
      <path d="M 18 20 L 18 14 L 26 14 L 26 20" fill="none" stroke={tone} strokeWidth={STROKE} />
      <path d="M 32 20 L 32 14 L 40 14 L 40 20" fill="none" stroke={tone} strokeWidth={STROKE} />
      <circle cx="20" cy="32" r="3" fill={tone} />
      <circle cx="36" cy="32" r="3" fill={tone} />
    </svg>
  );
}

export function FuelGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Fuel" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <rect x="12" y="10" width="22" height="44" rx="4" fill="none" stroke={tone} strokeWidth={STROKE} />
      <rect x="34" y="22" width="12" height="22" rx="3" fill="none" stroke={tone} strokeWidth={STROKE} />
      <path d="M 34 30 L 40 30 L 40 36" stroke={tone} strokeWidth={STROKE} fill="none" />
      <rect x="16" y="16" width="14" height="6" rx="1" fill={tone} fillOpacity="0.35" />
      <path d="M 12 44 L 34 44" stroke={tone} strokeWidth={STROKE} />
    </svg>
  );
}

export function OverheatGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Overheating" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <path d="M 22 8 C 22 18, 10 22, 10 32 C 10 42, 18 50, 30 50 C 36 50, 40 46, 40 40 C 40 34, 44 32, 44 26" fill="none" stroke={tone} strokeWidth={STROKE} strokeLinecap="round" />
      <path d="M 22 8 C 22 18, 10 22, 10 32 C 10 42, 18 50, 30 50 C 36 50, 40 46, 40 40 C 40 34, 44 32, 44 26" fill={tone} fillOpacity="0.12" />
      <path d="M 32 4 L 36 14 L 28 14 Z" fill={tone} />
    </svg>
  );
}

export function ElectricalGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Electrical" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <path d="M 34 4 L 14 36 L 28 36 L 24 60 L 50 26 L 36 26 Z" fill="none" stroke={tone} strokeWidth={STROKE} strokeLinejoin="round" />
      <path d="M 34 4 L 14 36 L 28 36 L 24 60 L 50 26 L 36 26 Z" fill={tone} fillOpacity="0.18" />
    </svg>
  );
}

export function AccidentGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Accident" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <path d="M 32 6 L 58 50 L 6 50 Z" fill="none" stroke={tone} strokeWidth={STROKE} strokeLinejoin="round" />
      <path d="M 32 22 L 32 36" stroke={tone} strokeWidth={STROKE} strokeLinecap="round" />
      <circle cx="32" cy="44" r="2.5" fill={tone} />
    </svg>
  );
}

export function OtherGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Other" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <circle cx="32" cy="32" r="22" fill="none" stroke={tone} strokeWidth={STROKE} />
      <path d="M 22 28 C 22 22, 28 20, 32 24 C 36 28, 42 24, 42 32 C 42 40, 32 40, 32 40" fill="none" stroke={tone} strokeWidth={STROKE} strokeLinecap="round" />
      <circle cx="32" cy="44" r="2.2" fill={tone} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Vehicle type icons                                                  */
/* ------------------------------------------------------------------ */

export function CarGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Car" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <rect x="6" y="28" width="52" height="20" rx="4" fill="none" stroke={tone} strokeWidth={STROKE} />
      <path d="M 14 28 L 20 18 L 44 18 L 50 28" fill="none" stroke={tone} strokeWidth={STROKE} />
      <circle cx="18" cy="48" r="5" fill="none" stroke={tone} strokeWidth={STROKE} />
      <circle cx="46" cy="48" r="5" fill="none" stroke={tone} strokeWidth={STROKE} />
    </svg>
  );
}

export function BikeGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Bike" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <circle cx="14" cy="44" r="8" fill="none" stroke={tone} strokeWidth={STROKE} />
      <circle cx="50" cy="44" r="8" fill="none" stroke={tone} strokeWidth={STROKE} />
      <path d="M 14 44 L 26 20 L 42 20 L 50 44" fill="none" stroke={tone} strokeWidth={STROKE} strokeLinejoin="round" />
      <path d="M 26 20 L 38 20 L 42 28" fill="none" stroke={tone} strokeWidth={STROKE} />
      <circle cx="42" cy="28" r="2.5" fill={tone} />
    </svg>
  );
}

export function VanGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Van" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <rect x="4" y="22" width="56" height="24" rx="3" fill="none" stroke={tone} strokeWidth={STROKE} />
      <path d="M 40 22 L 40 12 L 54 12 L 56 22" fill="none" stroke={tone} strokeWidth={STROKE} />
      <rect x="42" y="14" width="10" height="6" fill={tone} fillOpacity="0.35" />
      <circle cx="16" cy="48" r="5" fill="none" stroke={tone} strokeWidth={STROKE} />
      <circle cx="48" cy="48" r="5" fill="none" stroke={tone} strokeWidth={STROKE} />
    </svg>
  );
}

export function TruckGlyph({ className, tone = 'currentColor' }: ProblemGlyphProps) {
  return (
    <svg role="img" aria-label="Truck" viewBox="0 0 64 64" className={cx('h-full w-full', className)}>
      <rect x="4" y="22" width="32" height="22" rx="3" fill="none" stroke={tone} strokeWidth={STROKE} />
      <path d="M 36 28 L 36 22 L 50 22 L 58 30 L 58 44 L 36 44" fill="none" stroke={tone} strokeWidth={STROKE} />
      <circle cx="14" cy="48" r="5" fill="none" stroke={tone} strokeWidth={STROKE} />
      <circle cx="48" cy="48" r="5" fill="none" stroke={tone} strokeWidth={STROKE} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Logo glyph — used inside the shell and footers                      */
/* ------------------------------------------------------------------ */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="MECHIST mark"
      viewBox="0 0 32 32"
      className={cx('h-full w-full', className)}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(59 125 255)" />
          <stop offset="60%" stopColor="rgb(117 84 245)" />
          <stop offset="100%" stopColor="rgb(15 176 174)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="7" fill="url(#logoGrad)" />
      <path d="M 11 9 L 16 18 L 21 9 L 21 23 L 18.5 23 L 18.5 15 L 16 19.5 L 13.5 15 L 13.5 23 L 11 23 Z" fill="white" />
    </svg>
  );
}