import { useId } from 'react';
import { cx } from '@/lib/utils';

export interface AnimatedGridPatternProps {
  /** Width/height of one cell in pixels. */
  size?: number;
  /** Stops for the radial mask, 0–100. */
  innerStop?: number;
  outerStop?: number;
  /** Overall opacity 0–1. */
  opacity?: number;
  /** Distance between highlight points, cells. */
  highlightSpan?: number;
  /** Stroke / dot color. */
  strokeColor?: string;
  highlightColor?: string;
  className?: string;
}

/**
 * AnimatedGridPattern — Magic-UI-style grid that fades out radially
 * from one or more points. A subtle highlight pulse travels across the
 * grid to give the impression of "live" infrastructure. Reduced-motion
 * users get the static grid only (the SMIL `<animate>` still runs but
 * the radial mask and opacity are the main readable signal).
 */
export function AnimatedGridPattern({
  size = 40,
  innerStop = 0,
  outerStop = 80,
  opacity = 0.18,
  highlightSpan = 3,
  strokeColor = 'currentColor',
  highlightColor = 'rgb(59 125 255)',
  className,
}: AnimatedGridPatternProps) {
  const reactId = useId();
  const maskId = `agp-mask-${reactId}`;
  const hlId = `agp-hl-${reactId}`;

  return (
    <svg
      aria-hidden
      className={cx('pointer-events-none absolute inset-0 h-full w-full', className)}
      style={{ opacity }}
    >
      <defs>
        <radialGradient id={maskId} cx="50%" cy="50%" r="50%">
          <stop offset={`${innerStop}%`} stopColor="white" stopOpacity="1" />
          <stop offset={`${outerStop}%`} stopColor="white" stopOpacity="0" />
        </radialGradient>
        <pattern id={hlId} width={size} height={size} patternUnits="userSpaceOnUse">
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.6"
          />
          <circle
            cx={highlightSpan * size}
            cy={highlightSpan * size}
            r="1.6"
            fill={highlightColor}
          >
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur="3.5s"
              repeatCount="indefinite"
            />
          </circle>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${hlId})`} mask={`url(#${maskId})`} />
    </svg>
  );
}
