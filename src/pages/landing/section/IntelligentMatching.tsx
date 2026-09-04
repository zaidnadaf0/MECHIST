/**
 * MECHIST — Intelligent Matching.
 *
 * Realistic explainer for what the matching engine does. No
 * "neural" / "AI" claims — it filters on (specialty, vehicle type,
 * distance, live availability) and ranks by acceptance record. The
 * candidate "dossier" card is static demo data; it is NOT a real
 * customer-side result.
 */
import { useState } from 'react';
import { Cpu, MapPin, Star, Wrench, BadgeCheck, Sparkles } from 'lucide-react';
import { SectionShell, SectionHeading, Card, MetricChip } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { BlobCard } from '@/components/unlumen-ui/blob-card';

type ProblemKey = 'battery' | 'tyre' | 'engine' | 'fuel';
type VehicleKey = 'ev' | 'ice' | 'hybrid';

interface Candidate {
  name: string;
  title: string;
  callsign: string;
  distance: string;
  eta: string;
  matchPct: number;
  rating: number;
  reviews: number;
  loadout: string[];
  certifications: string[];
}

const CANDIDATES: Record<VehicleKey, Candidate> = {
  ev: {
    name: 'Aria T.',
    title: 'EV & Drivetrain Specialist',
    callsign: 'Unit Delta-04',
    distance: '2.8 km',
    eta: '7 min',
    matchPct: 98,
    rating: 4.98,
    reviews: 342,
    loadout: ['1000V insulated kit', 'LiFePO4 booster', 'CAN-bus diagnostic'],
    certifications: ['ASE Master Tech', 'EV Level 2', 'NFPA HV Safety'],
  },
  ice: {
    name: 'Diego M.',
    title: 'Senior Mechanical & Diagnostics',
    callsign: 'Unit Alpha-09',
    distance: '3.4 km',
    eta: '9 min',
    matchPct: 97,
    rating: 4.94,
    reviews: 289,
    loadout: ['3.5T hydraulic jack', 'Bead sealer & tire kit', 'Diagnostic suite'],
    certifications: ['ASE Master Certified', 'BMW Master Tech', 'I-CAR Gold Class'],
  },
  hybrid: {
    name: 'Sara L.',
    title: 'Hybrid Drivetrain Tech',
    callsign: 'Unit Echo-02',
    distance: '3.6 km',
    eta: '10 min',
    matchPct: 96,
    rating: 4.96,
    reviews: 418,
    loadout: ['Inverter diagnostic', 'Coolant flush rig', '12V LiFePO4 booster'],
    certifications: ['ASE Hybrid Cert', 'I-CAR Gold Class', 'EV Level 1'],
  },
};

const VEHICLES: { id: VehicleKey; name: string; drivetrain: string; tone: 'azure' | 'iris' | 'aqua' }[] = [
  { id: 'ev',     name: 'Tesla Model Y',         drivetrain: 'AWD Dual Motor (400V HV)', tone: 'azure' },
  { id: 'ice',    name: 'BMW 3 Series',          drivetrain: '2.0L Turbo I4',            tone: 'iris'  },
  { id: 'hybrid', name: 'Toyota Prius Prime',    drivetrain: '2.0L + e-CVT Hybrid',      tone: 'aqua'  },
];

const PROBLEMS: { id: ProblemKey; label: string }[] = [
  { id: 'battery', label: '12V / HV Battery' },
  { id: 'tyre',    label: 'Flat tyre' },
  { id: 'engine',  label: 'Engine fault' },
  { id: 'fuel',    label: 'Out of fuel' },
];

export function IntelligentMatching() {
  const [vehicle, setVehicle] = useState<VehicleKey>('ev');
  const [problem, setProblem] = useState<ProblemKey>('battery');

  const candidate = CANDIDATES[vehicle];
  const reasons =
    vehicle === 'ev'
      ? ['High-voltage certified', 'Specialty matches', 'Straight-line distance']
      : vehicle === 'hybrid'
        ? ['Hybrid certified', 'Specialty matches', 'Vehicle supported']
        : ['Specialty matches', 'Vehicle supported', 'Straight-line ETA'];

  return (
    <SectionShell id="matching" className="container section">
      <FadeIn>
        <SectionHeading
          hue="iris"
          eyebrow={<><Cpu size={13} aria-hidden /> Matching · illustrative preview</>}
          title={<>The right mechanic for the <span className="text-gradient-signal">exact failure mode.</span></>}
          description="Below is an illustrative preview of how filtering works. Live matching uses the same filters on real mechanics and shows straight-line estimates."
        />
      </FadeIn>
      <p className="sr-only">Candidate dossier below is illustrative preview data, not a live assignment. Live availability, distance and ETA are on /map and /mechanics.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        {/* Selectors + diagram */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-azure-300">1 · Vehicle & drivetrain</span>
              <span className="font-mono text-[11px] text-fg-subtle">3 presets</span>
            </div>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {VEHICLES.map((v) => {
                const selected = vehicle === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicle(v.id)}
                    aria-pressed={selected}
                    className={[
                      'text-left rounded-xl border p-3.5 transition-colors',
                      selected
                        ? 'border-azure-500/60 bg-azure-500/10 text-fg-app'
                        : 'border-line-soft bg-surface-2/60 text-fg-muted hover:border-azure-500/30 hover:text-fg-app',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-small">{v.name}</span>
                      <MetricChip size="sm" tone={v.tone} label={v.id.toUpperCase()} />
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-fg-subtle">{v.drivetrain}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-iris-300">2 · Problem category</span>
              <span className="font-mono text-[11px] text-fg-subtle">8 supported</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {PROBLEMS.map((p) => {
                const selected = problem === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProblem(p.id)}
                    aria-pressed={selected}
                    className={[
                      'rounded-xl border p-3 text-left transition-colors',
                      selected
                        ? 'border-iris-500/60 bg-iris-500/10 text-fg-app'
                        : 'border-line-soft bg-surface-2/60 text-fg-muted hover:border-iris-500/30 hover:text-fg-app',
                    ].join(' ')}
                  >
                    <span className="font-medium text-small">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Search radius diagram — wrapped in an Unlumen BlobCard so
              the static illustration becomes a fluid, glowing artifact
              with a small summary chip floating in its header. The
              BlobCard owns its own animation, so the rest of the
              section stays calm. */}
          <Card className="overflow-hidden p-0">
            <BlobCard
              headerHeight={288}
              lightColors={['#3b7dff', '#0fb0ae', '#5f3fdb', '#22c7c2']}
              darkColors={['#1d4ed8', '#0f766e', '#4338ca', '#0e7490']}
              glowColors={['#9ab4ff', '#a7f3d0', '#c4b5fd', '#67e8f9', '#9ab4ff']}
              header={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-md border border-line-soft bg-surface-app/70 px-2.5 py-1 font-mono text-[11px] text-fg-muted backdrop-blur">
                    <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-aqua-500" />
                    search radius · 5 km
                  </div>
                  <span className="rounded-md border border-azure-500/30 bg-surface-app/70 px-2.5 py-1 font-mono text-[11px] text-azure-300 backdrop-blur">
                    {CANDIDATES[vehicle].matchPct}% match
                  </span>
                </div>
              }
            >
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-fg-subtle">live filter pipeline</span>
                  <span className="font-mono text-[10px] text-fg-subtle">ranking v2.4</span>
                </div>
                <ul className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-fg-muted">
                  {['specialty', 'vehicle', 'distance', 'availability', 'loadout', 'rating'].map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-aqua-500/80" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-fg-subtle">
                  Roster narrowed to {CANDIDATES[vehicle].callsign} after multi-factor filter.
                </p>
              </div>
            </BlobCard>
          </Card>
        </div>

        {/* Candidate dossier */}
        <div className="lg:col-span-5">
          <FadeIn delay={0.1}>
            <Card elevated className="h-full">
              <div className="flex items-center justify-between border-b border-line-soft pb-4">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-success-500" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
                    Top candidate
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-azure-500/30 bg-azure-500/10 px-2.5 py-1 font-mono text-xs text-azure-300">
                  <Sparkles size={12} />
                  <span>{candidate.matchPct}% match</span>
                </div>
              </div>

              <h3 className="display mt-5 text-h2 font-bold text-fg-app">{candidate.name}</h3>
              <p className="mt-0.5 text-small text-fg-muted">
                {candidate.title} · {candidate.callsign}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-line-soft bg-surface-2/60 p-3 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-fg-subtle">DISTANCE</div>
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-small font-semibold text-fg-app">
                    <MapPin size={13} className="text-azure-400" /> {candidate.distance}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-fg-subtle">ETA</div>
                  <div className="mt-0.5 text-small font-semibold text-aqua-400">{candidate.eta}</div>
                </div>
                <div>
                  <div className="text-[10px] text-fg-subtle">RATING</div>
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-small font-semibold text-fg-app">
                    <Star size={13} className="text-gold-400" /> {candidate.rating} ({candidate.reviews})
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-fg-subtle">VERIFIED</div>
                  <div className="mt-0.5 inline-flex items-center gap-1.5 text-small font-semibold text-fg-app">
                    <BadgeCheck size={13} className="text-success-500" /> background-checked
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="eyebrow text-fg-subtle">Equipment payload</div>
                <ul className="mt-2 space-y-1.5">
                  {candidate.loadout.map((eq) => (
                    <li
                      key={eq}
                      className="flex items-center gap-2 rounded border border-line-soft bg-surface-app/80 px-2.5 py-1.5 text-xs font-mono text-fg-app"
                    >
                      <Wrench size={12} className="shrink-0 text-azure-400" />
                      {eq}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <div className="eyebrow text-fg-subtle">Certifications</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {candidate.certifications.map((c) => (
                    <span
                      key={c}
                      className="rounded border border-iris-500/25 bg-iris-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-iris-300"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="eyebrow text-fg-subtle">Why this mechanic</div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {reasons.map((r) => (
                    <MetricChip key={r} size="sm" tone="success" icon={BadgeCheck} label={r} />
                  ))}
                </ul>
              </div>
            </Card>
          </FadeIn>
        </div>
      </div>
    </SectionShell>
  );
}
