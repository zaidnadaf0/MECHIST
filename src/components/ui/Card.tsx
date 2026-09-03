import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cx } from '@/lib/utils';

export type CardTone = 'neutral' | 'azure' | 'aqua' | 'iris' | 'gold';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** remove built-in padding */
  flush?: boolean;
  /** stronger resting shadow */
  elevated?: boolean;
  /** hover lift + accent bloom; use for anything clickable */
  interactive?: boolean;
  /** translucent blurred surface — sits over imagery / canvas layers */
  glass?: boolean;
  /** hue identity: paints the top edge and the hover bloom */
  tone?: CardTone;
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

const edge: Record<CardTone, string> = {
  neutral: 'from-transparent via-line-strong to-transparent',
  azure: 'from-transparent via-azure-500 to-transparent',
  aqua: 'from-transparent via-aqua-500 to-transparent',
  iris: 'from-transparent via-iris-500 to-transparent',
  gold: 'from-transparent via-gold-400 to-transparent',
};

const bloom: Record<CardTone, string> = {
  neutral: 'group-hover/card:shadow-cardHover',
  azure: 'group-hover/card:shadow-glow-azure',
  aqua: 'group-hover/card:shadow-glow-aqua',
  iris: 'group-hover/card:shadow-glow-iris',
  gold: 'group-hover/card:shadow-glow-gold',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    flush,
    elevated,
    interactive,
    glass,
    tone = 'neutral',
    eyebrow,
    title,
    description,
    footer,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        'group/card relative overflow-hidden rounded-xl',
        glass ? 'panel-glass' : 'panel',
        elevated && 'shadow-cardHover',
        interactive &&
          cx(
            'cursor-pointer transition-[transform,box-shadow,border-color] duration-300 ease-out-soft',
            'hover:-translate-y-1 hover:border-line-strong',
            bloom[tone],
          ),
        !flush && 'p-5 md:p-6',
        className,
      )}
      {...rest}
    >
      {tone !== 'neutral' && (
        <span
          aria-hidden
          className={cx(
            'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-70 transition-opacity duration-300 group-hover/card:opacity-100',
            edge[tone],
          )}
        />
      )}

      {(eyebrow || title || description) && (
        <div className={cx('flex flex-col gap-1.5', children || footer ? 'mb-4' : '')}>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          {title && <div className="text-h3 font-display text-fg-app">{title}</div>}
          {description && <p className="text-small text-fg-muted text-pretty">{description}</p>}
        </div>
      )}

      {children}

      {footer && <div className="mt-5 border-t border-line-soft pt-4">{footer}</div>}
    </div>
  );
});
