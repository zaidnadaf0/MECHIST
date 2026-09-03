/**
 * MECHIST — Problem categories.
 *
 * Visual taxonomy of what MECHIST actually dispatches. Each tile
 * uses the bespoke SVG problem glyph so the section is icon-honest
 * and language-neutral.
 */
import { SectionShell, SectionHeading, MetricChip, Card } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import {
  BatteryGlyph,
  TyreGlyph,
  EngineGlyph,
  FuelGlyph,
  OverheatGlyph,
  ElectricalGlyph,
  AccidentGlyph,
  OtherGlyph,
} from '@/components/illustrations/Illustrations';
import type { ReactNode } from 'react';

interface Problem {
  id: string;
  label: string;
  blurb: string;
  Glyph: (p: { className?: string; tone?: string }) => ReactNode;
  tone: 'azure' | 'aqua' | 'iris' | 'gold' | 'success' | 'warning' | 'danger' | 'neutral';
  typical: string;
}

const PROBLEMS: Problem[] = [
  { id: 'battery',    label: '12V / HV Battery',  blurb: 'Jump-start, replacement, or high-voltage isolation.', Glyph: BatteryGlyph,   tone: 'gold',    typical: '~ 20 min on site' },
  { id: 'tyre',       label: 'Flat tyre',         blurb: 'Bead repair, swap with spare, or runflat re-inflate.', Glyph: TyreGlyph,      tone: 'azure',   typical: '~ 25 min on site' },
  { id: 'engine',     label: 'Engine fault',      blurb: 'Diagnostic scan, sensor bypass, ignition repair.',   Glyph: EngineGlyph,    tone: 'iris',    typical: '~ 35 min on site' },
  { id: 'fuel',       label: 'Out of fuel',       blurb: 'Diesel or petrol top-up delivered to your tank.',     Glyph: FuelGlyph,      tone: 'aqua',    typical: '~ 15 min on site' },
  { id: 'overheat',   label: 'Overheating',       blurb: 'Coolant top-up, leak isolation, fan diagnostics.',    Glyph: OverheatGlyph,  tone: 'warning', typical: '~ 30 min on site' },
  { id: 'electrical', label: 'Electrical',        blurb: 'Battery, alternator, or wiring fault isolation.',     Glyph: ElectricalGlyph, tone: 'gold',   typical: '~ 30 min on site' },
  { id: 'accident',   label: 'Accident',          blurb: 'Safety perimeter, scene report, recovery dispatch.',  Glyph: AccidentGlyph,  tone: 'danger',  typical: 'Recovery coordinated' },
  { id: 'other',      label: 'Other',             blurb: 'Lockout, key, tow, or anything in between.',          Glyph: OtherGlyph,     tone: 'neutral', typical: 'Quote on request' },
];

export function Problems() {
  return (
    <SectionShell id="problems" className="container section">
      <FadeIn>
        <SectionHeading
          hue="iris"
          eyebrow={<><span aria-hidden>·</span> Categories · 8 supported incident types</>}
          title={<>Whatever the road does to you, <span className="text-gradient-signal">we cover it.</span></>}
          description="Pick the closest match when you request help. The matching engine narrows the roster to the mechanics who carry the right tools for that specific failure mode."
        />
      </FadeIn>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PROBLEMS.map((p, i) => {
          const G = p.Glyph;
          return (
            <FadeIn key={p.id} delay={i * 0.04}>
              <Card interactive className="h-full p-5">
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-lg bg-surface-2 ring-1 ring-inset ring-line-soft">
                    <G className="h-7 w-7" tone="rgb(59 125 255)" />
                  </span>
                  <MetricChip size="sm" tone={p.tone} label={p.typical} />
                </div>
                <h3 className="display mt-4 text-h3 font-semibold text-fg-app">{p.label}</h3>
                <p className="mt-1.5 text-small text-fg-muted text-pretty">{p.blurb}</p>
              </Card>
            </FadeIn>
          );
        })}
      </div>
    </SectionShell>
  );
}
