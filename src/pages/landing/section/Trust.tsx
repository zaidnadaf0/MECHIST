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
    t: 'Vetted mechanics',
    d: 'Every technician passes a criminal background check, motor vehicle record check, and a documented ride-along audit before they’re routed to you.',
    tag: '100% VERIFIED',
    tone: 'azure',
  },
  {
    icon: CreditCard,
    t: 'Locked-upfront pricing',
    d: 'Your repair estimate is fixed before dispatch. The final receipt cannot exceed it, and the funds are held in escrow until you mark the service complete.',
    tag: 'ZERO SURGE',
    tone: 'aqua',
  },
  {
    icon: EyeOff,
    t: 'Ephemeral location',
    d: 'We only store your GPS coordinates for the lifetime of an active request. When the service wraps, the precise trail is cryptographically expunged.',
    tag: 'PRIVACY FIRST',
    tone: 'iris',
  },
  {
    icon: Headphones,
    t: 'Human supervisors',
    d: 'When dispatch needs judgement — wrong address, parts dispute, or a non-standard repair — a senior coordinator picks up the line in under 15 seconds.',
    tag: '24/7 COMMAND',
    tone: 'gold',
  },
];

export function Trust() {
  return (
    <SectionShell id="trust" className="container section">
      <FadeIn>
        <SectionHeading
          hue="azure"
          eyebrow={<><Lock size={13} aria-hidden /> Assurance architecture & guarantees</>}
          title={<>Trust, built in <span className="text-gradient-signal">verifiable layers.</span></>}
          description="Roadside breakdowns are stressful. MECHIST removes the ambiguity with upfront locked pricing, verified technician dossiers, and explicit data handling."
          actions={
            <Badge tone="success" size="md" dot>
              $2M comprehensive policy
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
