import Lottie from 'lottie-react';
import { usePrefersReducedMotion } from '@/components/motion';
import { radar, pulse, tick, orbit, type LottieAnim } from './animations';

export type LottieKind = 'radar' | 'pulse' | 'tick' | 'orbit';

const ANIMS: Record<LottieKind, LottieAnim> = { radar, pulse, tick, orbit };

/**
 * Drop-in Lottie icon. Renders one of our hand-authored animations inline
 * (no network fetch). Respects prefers-reduced-motion by freezing on first frame.
 */
export function LottieIcon({
  kind,
  size = 28,
  className,
  loop = true,
}: {
  kind: LottieKind;
  size?: number;
  className?: string;
  loop?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <span
      aria-hidden
      className={className}
      style={{ display: 'inline-block', width: size, height: size, lineHeight: 0 }}
    >
      <Lottie
        animationData={ANIMS[kind]}
        loop={loop && !reduced}
        autoplay={!reduced}
        style={{ width: size, height: size }}
      />
    </span>
  );
}
