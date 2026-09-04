/**
 * MECHIST — Trust & Safety.
 *
 * Pillar grid. The product is regulated in the financial sense (escrow
 * + privacy), so the four pillars focus on what the user can verify
 * without inventing telemetry they cannot see.
 */
import { SectionShell, SectionHeading, Card, Badge } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { ShieldCheck, CreditCard, EyeOff, Headphones, Lock, CheckCircle2 } from 'lucide-react';

interface Pillar {
  icon: typeof ShieldCheck;
  t: string;
  d: string;
  tag: string;
  tone: 'azure' | 'aqua' | 'iris' | 'gold';
}

const PILLARS: Pillar[] = [
  {
    icon: ShieldCheck,
    t: 'Mechanic review',
    d: 'Mechanics submit specialties, vehicle types and base location; admin approval is required before they appear in the public directory or dispatch queue.',
    tag: 'REVIEWED',
    tone: 'azure',
  },
  {
    icon: CreditCard,
    t: 'Pay on completion',
    d: 'Requesting is free. You confirm the service on the tracking page and the record is archived in history — no hidden fees are invented here.',
    tag: 'ON COMPLETION',
    tone: 'aqua',
  },
  {
    icon: EyeOff,
    t: 'Location on request',
    d: 'Your GPS fix is shared with the assigned mechanic only after they accept the job. No background tracking is left running after completion.',
    tag: 'REQUEST-ONLY',
    tone: 'iris',
  },
  {
    icon: Headphones,
    t: 'Status you can follow',
    d: 'Every request moves through requested → accepted → on-the-way → arrived → service → completed so you always know where things stand.',
    tag: 'TRACKED',
    tone: 'gold',
  },
];

export function Trust() {
  return (
    <SectionShell id="trust" className="container section">
      <FadeIn>
        <SectionHeading
          hue="azure"
          eyebrow={<><Lock size={13} aria-hidden /> Assurance & how the app works</>}
          title={<>Trust, built in <span className="text-gradient-signal">verifiable layers.</span></>}
          description="What MECHIST actually does with your request, location and mechanic assignment — no invented guarantees, just the real behavior you can verify in the app."
          actions={
            <Badge tone="neutral" size="md">
              illustrated · live on /map &amp; /mechanics
            </Badge>
          }
        />
      </FadeIn>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p, i) => {
          const Icon = p.icon;
          return (
            <FadeIn key={p.t} delay={i * 0.05}>
              <Card interactive className="flex h-full flex-col justify-between p-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-line-soft bg-surface-2 text-azure-400">
                      <Icon size={20} />
                    </span>
                    <Badge tone={p.tone} size="sm">{p.tag}</Badge>
                  </div>
                  <h3 className="display mt-5 text-h3 font-semibold text-fg-app">{p.t}</h3>
                  <p className="mt-2 text-small text-fg-muted leading-relaxed">{p.d}</p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 border-t border-line-soft pt-4 font-mono text-[11px] text-fg-subtle">
                  <CheckCircle2 size={13} className="text-success-500" />
                  <span>Verified standard</span>
                </div>
              </Card>
            </FadeIn>
          );
        })}
      </div>
    </SectionShell>
  );
}
