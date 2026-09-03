import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from './useReducedMotion';

type Lift = 'none' | 'sm' | 'md' | 'lg';

interface MotionCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'ref'> {
  children: ReactNode;
  lift?: Lift;
  className?: string;
}

const liftMap: Record<Lift, { y: number; shadow: string }> = {
  none: { y: 0, shadow: '0 1px 2px rgba(11,13,16,0.04)' },
  sm:   { y: -2, shadow: '0 1px 2px rgba(11,13,16,0.05), 0 10px 26px rgba(11,13,16,0.07)' },
  md:   { y: -4, shadow: '0 1px 2px rgba(11,13,16,0.05), 0 16px 36px rgba(11,13,16,0.10)' },
  lg:   { y: -8, shadow: '0 1px 2px rgba(11,13,16,0.05), 0 24px 50px rgba(11,13,16,0.12)' },
};

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(function MotionCard(
  { children, lift = 'sm', className, ...rest },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const target = liftMap[lift];
  if (reduced) {
    return <div ref={ref} className={'card-base ' + (className ?? '')} {...rest}>{children}</div>;
  }
  return (
    <motion.div
      ref={ref}
      className={'card-base ' + (className ?? '')}
      whileHover={lift === 'none' ? undefined : { y: target.y, boxShadow: target.shadow }}
      transition={{ type: 'spring', stiffness: 250, damping: 24 }}
      {...(rest as Omit<HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragEnd' | 'onDragStart'>)}
    >
      {children}
    </motion.div>
  );
});
