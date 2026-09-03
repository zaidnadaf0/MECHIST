import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

export type Hue = 'azure' | 'aqua' | 'iris' | 'gold' | 'neutral';

const align = {
  left: 'items-start text-left',
  center: 'items-center text-center mx-auto',
} as const;

export interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  hue?: Hue;
  align?: keyof typeof align;
  className?: string;
  /** heading level for correct document outline */
  as?: 'h1' | 'h2' | 'h3';
  size?: 'lg' | 'md' | 'sm';
}

const rule: Record<Hue, string> = {
  azure: 'from-azure-500',
  aqua: 'from-aqua-500',
  iris: 'from-iris-500',
  gold: 'from-gold-400',
  neutral: 'from-line-strong',
};

const titleSize = {
  lg: 'text-display-md',
  md: 'text-display-sm',
  sm: 'text-h1',
} as const;

export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
  hue = 'azure',
  align: alignment = 'left',
  className,
  as: Tag = 'h2',
  size = 'md',
}: SectionHeadingProps) {
  return (
    <div
      className={cx(
        'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
        alignment === 'center' && 'md:flex-col md:items-center',
        className,
      )}
    >
      <div className={cx('flex max-w-2xl flex-col gap-3', align[alignment])}>
        {eyebrow && (
          <div className="flex items-center gap-3">
            <span aria-hidden className={cx('h-px w-8 bg-gradient-to-r to-transparent', rule[hue])} />
            <span className="eyebrow">{eyebrow}</span>
          </div>
        )}
        <Tag className={cx('display text-fg-app text-balance', titleSize[size])}>{title}</Tag>
        {description && <p className="text-body text-fg-muted text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/**
 * Ambient section wrapper — mesh + grid layers behind content.
 * Keeps effect markup out of every individual section file.
 */
export function SectionShell({
  id,
  children,
  className,
  mesh = true,
  grid = false,
  tone = 'app',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  mesh?: boolean;
  grid?: boolean;
  tone?: 'app' | 'raised' | 'inset';
}) {
  return (
    <section
      id={id}
      className={cx(
        'relative isolate overflow-hidden',
        tone === 'raised' && 'bg-surface-1',
        tone === 'inset' && 'bg-surface-inset',
        className,
      )}
    >
      {mesh && <span aria-hidden className="mesh-layer opacity-70" />}
      {grid && <span aria-hidden className="grid-layer" />}
      <div className="relative">{children}</div>
    </section>
  );
}
