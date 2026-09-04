import type { LucideIcon } from 'lucide-react';
import { BadgeCheck, Clock, MapPinned, Users } from 'lucide-react';
import { Counter } from '@/components/ui';
import type { Hue } from '@/components/ui';

type Metric = {
  icon: LucideIcon;
  hue: Hue;
  value: number;
  suffix?: string;
  label: string;
  sub: string;
};

const METRICS: Metric[] = [
  { icon: Clock, hue: 'azure', value: 8, suffix: ' min', label: 'median eta', sub: 'request → on-site' },
  { icon: Users, hue: 'aqua', value: 1240, suffix: '+', label: 'vetted mechanics', sub: 'on the network' },
  { icon: BadgeCheck, hue: 'iris', value: 98, suffix: '%', label: 'job completion', sub: 'without escalation' },
  { icon: MapPinned, hue: 'gold', value: 14, label: 'cities live', sub: 'more in onboarding' },
];

const dot: Record<Hue, string> = {
  azure: 'text-azure-500',
  aqua: 'text-aqua-500',
  iris: 'text-iris-500',
  gold: 'text-gold-500',
  neutral: 'text-fg-subtle',
};
/**
 * Illustrative metrics band — representative targets, not live telemetry.
 * Deliberately *not* four cards — one panel divided by
 * 1px rules, so the first viewport ends on structure rather than more boxes.
 */
export function HeroMetrics() {
  return (
    <div className="panel overflow-hidden rounded-xl">
      <p className="sr-only">Representative service targets — not live platform telemetry.</p>
      <div className="grid divide-y divide-line-soft sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {METRICS.map(({ icon: Icon, hue, value, suffix, label, sub }, i) => (
          <div
            key={label}
            className={[
              'relative px-5 py-6 md:px-6',
              i > 0 && 'sm:border-l sm:border-line-soft',
              i === 2 && 'border-t border-line-soft sm:border-t-0 lg:border-t-0',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="flex items-center gap-2">
              <Icon size={14} className={dot[hue]} />
              <span className="eyebrow">{label}</span>
            </div>
            <div className="stat-num mt-3 text-display-sm font-semibold text-fg-app">
              <Counter to={value} suffix={suffix} />
            </div>
            <div className="mt-1 text-small text-fg-subtle">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

