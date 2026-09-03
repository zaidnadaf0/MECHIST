/**
 * MECHIST — Realtime Assistance.
 *
 * Explains what a customer actually sees from "accepted" through
 * "completed". Uses the canonical `RequestTimeline` so this section
 * is one more place that agrees with the customer's tracking page.
 */
import { useState } from 'react';
import { Activity, Clock, MapPin, Signal, Truck, Lock } from 'lucide-react';
import { SectionShell, SectionHeading, Card, Badge, RequestTimeline } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { Particles } from '@/components/magicui';
import { STATUS_META, type CanonicalStatus } from '@/lib/requestStatus';

const STAGES: { status: CanonicalStatus; blurb: string }[] = [
  { status: 'requested',  blurb: 'You shared your location and what went wrong. Nearby mechanics with the right tools see your request immediately.' },
  { status: 'accepted',   blurb: 'A vetted technician accepts. Their name, vehicle, and equipment payload appear on your screen.' },
  { status: 'on-the-way', blurb: 'Live map shows bearing, speed, and corridor ETA. The estimate updates with traffic; the bill never does.' },
  { status: 'arrived',    blurb: 'The mechanic is on site. You see a safety perimeter and the diagnostic they are running.' },
  { status: 'service',    blurb: 'The repair is in progress. You receive a one-line status on every step change.' },
  { status: 'completed',  blurb: 'Service complete. You review the itemised receipt, rate the experience, and the invoice is archived.' },
];

export function RealtimeAssistance() {
  const [idx, setIdx] = useState(2); // default to "on the way" — the most informative frame
  const stage = STAGES[idx];
  const meta = STATUS_META[stage.status];

  return (
    <SectionShell id="realtime" className="container section relative isolate">
      {/* Network graph — a slow, calm connection-cloud behind the stage
          inspector. Sits at z-0 with no pointer events. */}
      <Particles
        count={45}
        color="rgb(34 199 194)"
        lineColor="rgba(34 199 194, 0.16)"
        connectRadius={110}
        className="z-0 opacity-70"
      />
      <FadeIn>
        <SectionHeading
          hue="aqua"
          eyebrow={<><Signal size={13} aria-hidden /> Live tracking · request telemetry</>}
          title={<>Live status from the moment you <span className="text-gradient-signal">tap dispatch.</span></>}
          description="No hold music. No vague “someone is on the way”. The same canonical six-step timeline powers your customer page and the mechanic portal — so what you see is what they see."
          actions={
            <Badge tone="aqua" size="md" live>live feed</Badge>
          }
        />
      </FadeIn>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        {/* Clickable stage list */}
        <div className="lg:col-span-7 space-y-2">
          {STAGES.map((st, i) => {
            const m = STATUS_META[st.status];
            const isSelected = idx === i;
            const StepIcon = m.icon;
            return (
              <button
                key={st.status}
                type="button"
                onClick={() => setIdx(i)}
                aria-pressed={isSelected}
                className={[
                  'w-full rounded-xl border p-4 text-left transition-colors',
                  isSelected
                    ? 'border-aqua-500/50 bg-surface-2/95 shadow-card'
                    : 'border-line-soft bg-surface-1/80 hover:border-aqua-500/30',
                ].join(' ')}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                      isSelected
                        ? 'bg-aqua-500/15 text-aqua-300 ring-aqua-500/30'
                        : 'bg-surface-app text-fg-muted ring-line-soft',
                    ].join(' ')}
                  >
                    <StepIcon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-subtle">
                        Stage {i + 1} of 6
                      </span>
                      <span className="font-mono text-[11px] text-fg-subtle">{m.label}</span>
                    </div>
                    <p className="mt-1 text-small text-fg-muted line-clamp-2">{st.blurb}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active stage inspector + telemetry HUD */}
        <div className="lg:col-span-5">
          <FadeIn delay={0.1}>
            <Card elevated className="flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-line-soft pb-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-aqua-500/10 text-aqua-300 ring-1 ring-inset ring-aqua-500/30">
                      <Activity size={16} />
                    </span>
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-aqua-300">
                        Now
                      </div>
                      <div className="text-xs text-fg-muted">{meta.label}</div>
                    </div>
                  </div>
                  <Badge tone={meta.tone as never} size="sm" live dot>
                    streaming
                  </Badge>
                </div>

                <h3 className="display mt-5 text-h2 font-bold text-fg-app text-pretty">
                  {meta.label}
                </h3>
                <p className="mt-2 text-body text-fg-muted text-pretty">{stage.blurb}</p>
              </div>

              <div className="mt-6 space-y-2.5 font-mono text-xs">
                <div className="eyebrow text-fg-subtle">Live telemetry</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-line-soft bg-surface-2/60 p-3">
                    <div className="text-[10px] uppercase text-fg-subtle">Transit velocity</div>
                    <div className="mt-0.5 inline-flex items-center gap-1.5 text-small font-bold text-fg-app">
                      <Truck size={13} className="text-aqua-400" /> 52 km/h
                    </div>
                  </div>
                  <div className="rounded-lg border border-line-soft bg-surface-2/60 p-3">
                    <div className="text-[10px] uppercase text-fg-subtle">Bearing</div>
                    <div className="mt-0.5 inline-flex items-center gap-1.5 text-small font-bold text-gold-400">
                      <MapPin size={13} /> 042° NE
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-line-soft bg-surface-2/60 p-3">
                  <div className="text-[10px] uppercase text-fg-subtle">Estimated arrival</div>
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-small font-bold text-fg-app">
                    <Clock size={13} className="text-aqua-400" /> 6.5 min
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-line-soft pt-4 text-xs font-mono text-fg-subtle">
                <Lock size={13} className="text-azure-400" />
                End-to-end encrypted telemetry
              </div>
            </Card>
          </FadeIn>
        </div>
      </div>

      {/* Full timeline — proves the same component powers the customer page */}
      <div className="mt-10">
        <RequestTimeline status={stage.status} />
      </div>
    </SectionShell>
  );
}
