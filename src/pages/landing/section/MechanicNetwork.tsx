/**
 * MECHIST — Mechanic Network.
 *
 * Public directory of vetted mechanics. Static roster is fine for a
 * landing page; live data lives in Firestore for the customer flow.
 * Uses the new `MetricChip` primitive for the specialty/loadout
 * tags and the new problem glyphs as category markers.
 */
import { useState } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { SectionShell, SectionHeading, Card, Badge, Button, MetricChip } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { Meteors } from '@/components/magicui';
import { STATUS_META } from '@/lib/requestStatus';
import { BatteryGlyph, TyreGlyph, EngineGlyph, TruckGlyph } from '@/components/illustrations/Illustrations';
import type { ReactNode } from 'react';

export interface MechanicUnit {
  id: string;
  callsign: string;
  name: string;
  category: 'EV' | 'Tyres' | 'Diagnostics' | 'Tow';
  distanceKm: number;
  etaMin: number;
  rating: number;
  jobsCompleted: number;
  specialty: string;
  available: boolean;
  statusText: string;
  loadout: string[];
  vehicle: string;
}

const MECHANIC_ROSTER: MechanicUnit[] = [
  {
    id: 'm1', callsign: 'Unit Delta-04', name: 'Aria T.',
    category: 'EV', distanceKm: 2.4, etaMin: 6, rating: 4.98, jobsCompleted: 342,
    specialty: 'High-voltage EV & battery diagnostics',
    available: true, statusText: 'patrolling sector 4',
    loadout: ['1000V insulated kit', 'LiFePO4 booster', 'CAN scanner'],
    vehicle: 'Custom EV ops rig',
  },
  {
    id: 'm2', callsign: 'Unit Alpha-09', name: 'Diego M.',
    category: 'Tyres', distanceKm: 3.8, etaMin: 9, rating: 4.94, jobsCompleted: 289,
    specialty: 'Bead repair & 3.5T hydraulic lift',
    available: true, statusText: 'standby at junction 12',
    loadout: ['3.5T hydraulic jack', 'Pneumatic impact', 'Runflat kit'],
    vehicle: 'Service truck',
  },
  {
    id: 'm3', callsign: 'Unit Echo-02', name: 'Sara L.',
    category: 'Tow', distanceKm: 5.1, etaMin: 13, rating: 4.96, jobsCompleted: 418,
    specialty: 'Flatbed recovery & low-clearance tow',
    available: false, statusText: 'clearing in ~8 min',
    loadout: ['Hydraulic tilt bed', 'Soft snatch straps', 'Winch system'],
    vehicle: 'Low-profile flatbed',
  },
  {
    id: 'm4', callsign: 'Unit Bravo-07', name: 'Idris B.',
    category: 'Diagnostics', distanceKm: 4.2, etaMin: 11, rating: 4.89, jobsCompleted: 215,
    specialty: 'ECU reflash, sensor faults, ignition bypass',
    available: true, statusText: 'patrolling sector 2',
    loadout: ['Diagnostic suite', 'Oscilloscope', 'Fuel rail tester'],
    vehicle: 'Tech-lab van',
  },
  {
    id: 'm5', callsign: 'Unit Sierra-11', name: 'Lena P.',
    category: 'EV', distanceKm: 6.4, etaMin: 15, rating: 4.92, jobsCompleted: 194,
    specialty: 'Inverter diagnostics & thermal loop flushes',
    available: true, statusText: 'standby sector 7',
    loadout: ['Megohmmeter', 'Thermal imaging cam', 'HV safety box'],
    vehicle: 'Mobile support',
  },
  {
    id: 'm6', callsign: 'Unit Tango-05', name: 'Theo R.',
    category: 'Tyres', distanceKm: 7.2, etaMin: 17, rating: 4.87, jobsCompleted: 310,
    specialty: 'Commercial & light-truck tire swaps',
    available: false, statusText: 'clearing in ~14 min',
    loadout: ['Heavy torque multiplier', 'Bead sealer', 'Dual compressor'],
    vehicle: 'Dual-wheel service unit',
  },
];

const CATEGORIES = [
  { id: 'all',         label: 'All' },
  { id: 'EV',          label: 'High-voltage EV' },
  { id: 'Tyres',       label: 'Tyres & suspension' },
  { id: 'Diagnostics', label: 'Diagnostics' },
  { id: 'Tow',         label: 'Recovery & tow' },
];

const CATEGORY_GLYPH: Record<MechanicUnit['category'], (p: { className?: string; tone?: string }) => ReactNode> = {
  EV:          BatteryGlyph,
  Tyres:       TyreGlyph,
  Diagnostics: EngineGlyph,
  Tow:         TruckGlyph,
};

export function MechanicNetwork() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const filtered =
    selectedCategory === 'all'
      ? MECHANIC_ROSTER
      : MECHANIC_ROSTER.filter((m) => m.category === selectedCategory);

  return (
    <SectionShell id="network" className="container section relative isolate">
      {/* Diagonal meteor streaks — a subtle "data rain" over the roster
          background. Sits behind the grid via z-0 + pointer-events-none. */}
      <Meteors
        count={26}
        length={140}
        color="rgb(34 199 194)"
        className="z-0 opacity-70"
      />
      <FadeIn>
        <SectionHeading
          hue="aqua"
          eyebrow={<>Vetted roster · real-time availability</>}
          title={<>Mechanics with the right tools, <span className="text-gradient-signal">ready to roll.</span></>}
          description="Every technician is background-checked, insured up to $2M, and carries specialised equipment for modern electric and combustion drivetrains."
          actions={
            <a href="/mechanics" className="inline-flex">
              <Button variant="secondary" size="md">View full directory</Button>
            </a>
          }
        />
      </FadeIn>

      {/* category filter pills */}
      <div className="mt-8 flex flex-wrap items-center gap-2 rounded-xl border border-line-soft bg-surface-2/70 p-1.5 backdrop-blur-sm">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              aria-pressed={isActive}
              className={[
                'rounded-lg px-3 py-1.5 font-mono text-xs transition-colors',
                isActive
                  ? 'bg-azure-500 text-white shadow-sm font-semibold'
                  : 'text-fg-muted hover:bg-surface-app/60 hover:text-fg-app',
              ].join(' ')}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m, i) => {
          const Glyph = CATEGORY_GLYPH[m.category];
          return (
            <FadeIn key={m.id} delay={i * 0.04}>
              <Card interactive className="flex h-full flex-col justify-between p-5">
                <div>
                  <div className="flex items-center justify-between border-b border-line-soft pb-3">
                    <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-azure-300">
                      {m.callsign}
                    </span>
                    <Badge tone={m.available ? 'success' : 'neutral'} size="sm" dot>
                      {m.available ? STATUS_META.accepted.label : 'on job'}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-start gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 ring-1 ring-inset ring-line-soft">
                      <Glyph className="h-6 w-6" tone="rgb(59 125 255)" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="display text-h3 font-semibold text-fg-app">{m.name}</h3>
                      <p className="font-mono text-[11px] text-fg-subtle">{m.vehicle}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold text-fg-app">★ {m.rating.toFixed(2)}</div>
                      <div className="font-mono text-[10px] text-fg-subtle">{m.jobsCompleted} jobs</div>
                    </div>
                  </div>

                  <p className="mt-3 text-small text-fg-muted text-pretty">{m.specialty}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.loadout.map((item) => (
                      <MetricChip key={item} size="sm" tone="neutral" label={item} />
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-line-soft pt-4 font-mono text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-fg-subtle">
                      <MapPin size={12} className="text-azure-400" /> {m.distanceKm.toFixed(1)} km
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-aqua-400">
                      <Clock size={12} /> ETA {m.etaMin} min
                    </div>
                  </div>
                  <Button
                    variant={m.available ? 'primary' : 'secondary'}
                    size="sm"
                    disabled={!m.available}
                  >
                    {m.available ? 'Request' : 'Busy'}
                  </Button>
                </div>
              </Card>
            </FadeIn>
          );
        })}
      </div>
    </SectionShell>
  );
}
