/**
 * MECHIST — How It Works.
 *
 * Six-step horizontal timeline with an inspector panel showing the
 * active step. Stays honest about the flow: find → understand →
 * match → dispatch → track → resolve — no AI, no neural network.
 */
import { useState } from 'react';
import { CheckCircle2, MapPin, Cpu, Radio, ShieldCheck, Receipt, type LucideIcon } from 'lucide-react';
import { SectionShell, SectionHeading, Card, Badge, Button } from '@/components/ui';
import { StatusPill } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { LifecycleArt } from '@/components/illustrations/Illustrations';
import type { CanonicalStatus } from '@/lib/requestStatus';

interface Step {
  n: string;
  icon: LucideIcon;
  t: string;
  d: string;
  /** maps to the canonical status pill so the section agrees with the rest of the UI */
  status: CanonicalStatus;
  bullets: string[];
}

const STEPS: Step[] = [
  {
    n: '01',
    icon: MapPin,
    t: 'Share your location',
    d: 'Grant location once; we lock your GPS fix and fall back to the last known fix when offline. Used only to find mechanics near you.',
    status: 'requested',
    bullets: ['One-tap geolocation', 'Offline-safe last known fix', 'Shared only after accept'],
  },
  {
    n: '02',
    icon: Cpu,
    t: 'Match the right unit',
    d: 'Specialty, vehicle type, straight-line distance (~25 km) and availability narrow the roster to mechanics who can actually help.',
    status: 'accepted',
    bullets: ['Specialty & vehicle compatibility', 'Straight-line distance ~25 km', 'Availability now'],
  },
  {
    n: '03',
    icon: Radio,
    t: 'Dispatch & assignment',
    d: 'The matching mechanic accepts; you see their profile and can follow the status from your dashboard and tracking page.',
    status: 'on-the-way',
    bullets: ['Mechanic profile visible', 'Status updates live', 'ETA is straight-line estimate'],
  },
  {
    n: '04',
    icon: ShieldCheck,
    t: 'Track the approach',
    d: 'Follow on the map and timeline from on-the-way through arrived. Live tabs stay in sync with the mechanic portal.',
    status: 'arrived',
    bullets: ['Live map + timeline', 'On-the-way → arrived', 'Straight-line ETA, not road ETA'],
  },
  {
    n: '05',
    icon: Receipt,
    t: 'Service in progress',
    d: 'Mechanic marks service; you see the update on your tracking page until completion.',
    status: 'service',
    bullets: ['Status: service', 'Track until completed', 'Record archived to history'],
  },
  {
    n: '06',
    icon: CheckCircle2,
    t: 'Completed & history',
    d: 'Job is marked completed and lands in history for both sides. Mechanic GPS updates are throttled 25 m / 5 s.',
    status: 'completed',
    bullets: ['Completed → history', 'Receipt in History', 'Throttled GPS 25 m / 5 s'],
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const current = STEPS[active];
  const Icon = current.icon;

  return (
    <SectionShell id="how-it-works" className="container section">
      <FadeIn>
        <SectionHeading
          hue="azure"
          eyebrow={<><span aria-hidden>·</span> How MECHIST works · 6-step recovery</>}
          title={<>Six steps. <span className="text-gradient-signal">One calm interface.</span></>}
          description="From a flat tyre to a finished invoice, the same six stages drive every request. Tap a step to inspect what happens."
          actions={
            <a href="/request" className="inline-flex">
              <Button variant="primary" size="md" rightIcon={<CheckCircle2 size={16} />}>
                Try it now
              </Button>
            </a>
          }
        />
      </FadeIn>

      <div className="mt-10">
        <LifecycleArt className="h-24 w-full md:h-32" />
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-12">
        {/* Step selectors */}
        <div className="lg:col-span-7 grid gap-2.5 sm:grid-cols-2">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isSelected = active === i;
            return (
              <FadeIn key={s.n} delay={i * 0.04}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-pressed={isSelected}
                  className={[
                    'group relative w-full overflow-hidden rounded-xl border p-4 text-left transition-colors',
                    isSelected
                      ? 'border-azure-500/60 bg-surface-2/95 shadow-card'
                      : 'border-line-soft bg-surface-1/80 hover:border-azure-500/30 hover:bg-surface-2/60',
                  ].join(' ')}
                >
                  {isSelected && (
                    <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-azure-400 via-iris-400 to-aqua-400" />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={[
                        'flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset',
                        isSelected
                          ? 'bg-azure-500/15 text-azure-300 ring-azure-500/30'
                          : 'bg-surface-app text-fg-muted ring-line-soft group-hover:text-azure-300',
                      ].join(' ')}>
                        <StepIcon size={16} />
                      </span>
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-subtle">
                        Phase {s.n}
                      </span>
                    </div>
                    <StatusPill status={s.status} size="sm" />
                  </div>
                  <h3 className="display mt-3 text-h3 font-semibold text-fg-app text-pretty">
                    {s.t}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-small text-fg-muted">{s.d}</p>
                </button>
              </FadeIn>
            );
          })}
        </div>

        {/* Step inspector */}
        <div className="lg:col-span-5">
          <FadeIn delay={0.15}>
            <Card elevated className="h-full">
              <div className="flex items-center justify-between border-b border-line-soft pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-azure-500/10 text-azure-300 ring-1 ring-inset ring-azure-500/20">
                    <Icon size={16} />
                  </span>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-azure-300">
                      Phase {current.n} of 06
                    </div>
                    <div className="text-xs text-fg-muted">Live inspector</div>
                  </div>
                </div>
                <Badge tone="azure" size="sm" live>
                  step {current.n}
                </Badge>
              </div>

              <h3 className="display mt-5 text-h2 font-semibold text-fg-app text-pretty">
                {current.t}
              </h3>
              <p className="mt-2.5 text-body text-fg-muted text-pretty">{current.d}</p>

              <ul className="mt-6 flex flex-col gap-2">
                {current.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-center gap-2.5 rounded-lg border border-line-soft/80 bg-surface-app/70 px-3.5 py-2 text-small text-fg-app"
                  >
                    <CheckCircle2 size={15} className="shrink-0 text-aqua-400" />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex items-center justify-between border-t border-line-soft pt-4">
                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActive(idx)}
                      aria-label={`Jump to phase ${idx + 1}`}
                      className={[
                        'h-1.5 rounded-full transition-all duration-300',
                        idx === active ? 'w-7 bg-azure-400' : 'w-2 bg-line-soft hover:bg-fg-muted',
                      ].join(' ')}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setActive((p) => (p + 1) % STEPS.length)}
                  className="inline-flex items-center gap-1.5 text-small font-semibold text-azure-300 transition-colors hover:text-azure-200"
                >
                  <span>{active === STEPS.length - 1 ? 'Back to phase 01' : 'Next phase'}</span>
                  <span aria-hidden>→</span>
                </button>
              </div>
            </Card>
          </FadeIn>
        </div>
      </div>
    </SectionShell>
  );
}
