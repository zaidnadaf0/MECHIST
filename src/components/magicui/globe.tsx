import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils';

export interface GlobeProps {
  /** Radius in px (canvas drawing radius; CSS scales the wrapper). */
  radius?: number;
  /** Color of the dot lattice. */
  color?: string;
  /** Color of the inner landmass fill. */
  landColor?: string;
  /** Background transparent. */
  className?: string;
  /** Rotation speed, radians per second. */
  spinSpeed?: number;
  /** Show connecting arcs. */
  arcs?: boolean;
  arcColor?: string;
}

interface Dot { lat: number; lon: number; }

const LANDMASS: Dot[] = [
  { lat: 49, lon: -95 }, { lat: 45, lon: -100 }, { lat: 35, lon: -98 },
  { lat: 33, lon: -90 }, { lat: 30, lon: -85 }, { lat: 40, lon: -75 },
  { lat: 47, lon: -122 }, { lat: 32, lon: -117 }, { lat: 19, lon: -99 },
  { lat: -8, lon: -60 }, { lat: -23, lon: -46 }, { lat: -34, lon: -58 },
  { lat: -33, lon: -70 }, { lat: 4, lon: -72 },
  { lat: 51, lon: 0 }, { lat: 52, lon: 13 }, { lat: 48, lon: 2 },
  { lat: 41, lon: 12 }, { lat: 40, lon: -3 }, { lat: 55, lon: 37 },
  { lat: 60, lon: 25 },
  { lat: 31, lon: 32 }, { lat: 9, lon: 38 }, { lat: -1, lon: 36 },
  { lat: -26, lon: 28 }, { lat: -33, lon: 18 },
  { lat: 28, lon: 77 }, { lat: 39, lon: 116 }, { lat: 35, lon: 139 },
  { lat: 13, lon: 100 }, { lat: 1, lon: 103 }, { lat: 55, lon: 60 },
  { lat: -34, lon: 151 }, { lat: -23, lon: 133 }, { lat: -37, lon: 145 },
];

const ARCS: Array<{ from: Dot; to: Dot }> = [
  { from: { lat: 40, lon: -74 }, to: { lat: 51, lon: 0 } },
  { from: { lat: 35, lon: 139 }, to: { lat: 32, lon: -117 } },
  { from: { lat: 28, lon: 77 }, to: { lat: 48, lon: 2 } },
  { from: { lat: -33, lon: 151 }, to: { lat: 32, lon: -117 } },
  { from: { lat: -23, lon: -46 }, to: { lat: 41, lon: 12 } },
];

function project(d: Dot, radius: number, rot: number) {
  const lon = ((d.lon + rot) * Math.PI) / 180;
  const lat = (d.lat * Math.PI) / 180;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = -Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  return { x: x * radius, y: y * radius, z };
}

function arcPath(a: Dot, b: Dot, radius: number, rot: number) {
  const steps = 28;
  const pts: Array<{ x: number; y: number; z: number }> = [];
  const lonA = (a.lon + rot) * Math.PI / 180;
  const latA = a.lat * Math.PI / 180;
  const lonB = (b.lon + rot) * Math.PI / 180;
  const latB = b.lat * Math.PI / 180;
  const ax = Math.cos(latA) * Math.cos(lonA);
  const ay = Math.cos(latA) * Math.sin(lonA);
  const az = Math.sin(latA);
  const bx = Math.cos(latB) * Math.cos(lonB);
  const by = Math.cos(latB) * Math.sin(lonB);
  const bz = Math.sin(latB);
  const dot = ax * bx + ay * by + az * bz;
  const omega = Math.acos(Math.min(1, Math.max(-1, dot)));
  const sinO = Math.sin(omega) || 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k1 = Math.sin((1 - t) * omega) / sinO;
    const k2 = Math.sin(t * omega) / sinO;
    const x = ax * k1 + bx * k2;
    const y = ay * k1 + by * k2;
    const z = az * k1 + bz * k2;
    pts.push({ x: x * radius, y: -z * radius, z: y });
  }
  return pts.filter((p) => p.z > 0).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`);
}

/**
 * Globe — Magic-UI-style SVG globe with a lat/lon dot lattice, an
 * optional landmass highlight, and rotating arc connections. The
 * whole sphere spins slowly. Reduced-motion users get the first
 * frame only.
 */
export function Globe({
  radius = 140,
  color = 'rgb(34 199 194)',
  landColor = 'rgba(59 125 255, 0.6)',
  className,
  spinSpeed = 0.06,
  arcs = true,
  arcColor = 'rgba(255,255,255,0.55)',
}: GlobeProps) {
  const reduced = useReducedMotion();
  const id = useId();
  const ref = useRef<SVGSVGElement | null>(null);
  const [rot, setRot] = useState(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const loop = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setRot((r) => (r + spinSpeed * dt * 180 / Math.PI) % 360);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, spinSpeed]);

  const lattice: Dot[] = [];
  for (let lat = -75; lat <= 75; lat += 12) {
    for (let lon = -180; lon < 180; lon += 12) {
      lattice.push({ lat, lon });
    }
  }

  return (
    <svg
      ref={ref}
      viewBox={`${-radius - 8} ${-radius - 8} ${(radius + 8) * 2} ${(radius + 8) * 2}`}
      className={cx('block', className)}
      aria-label="Animated globe"
      role="img"
    >
      <defs>
        <radialGradient id={`globe-shadow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <circle cx="0" cy="0" r={radius} fill={`url(#globe-shadow-${id})`} />
      <circle cx="0" cy="0" r={radius} fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="0.6" />

      {lattice.map((d, i) => {
        const p = project(d, radius, rot);
        if (p.z <= 0) return null;
        const alpha = 0.18 + 0.6 * p.z;
        return <circle key={i} cx={p.x} cy={p.y} r={0.9} fill={color} opacity={alpha} />;
      })}

      {LANDMASS.map((d, i) => {
        const p = project(d, radius, rot);
        if (p.z <= 0) return null;
        return (
          <circle
            key={`lm-${i}`}
            cx={p.x}
            cy={p.y}
            r={2.6}
            fill={landColor}
            opacity={0.55 * p.z}
          />
        );
      })}

      {arcs && ARCS.map((a, i) => {
        const pts = arcPath(a.from, a.to, radius, rot);
        if (pts.length < 2) return null;
        return (
          <polyline
            key={`arc-${i}`}
            points={pts.join(' ')}
            fill="none"
            stroke={arcColor}
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      })}
    </svg>
  );
}
