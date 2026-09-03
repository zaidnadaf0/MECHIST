/**
 * MECHIST — Location coverage.
 *
 * Honest description of how the geo layer works. Uses the new SVG
 * art (no fake Leaflet map), and the live radar is replaced with
 * the bespoke MatchDiagramArt so we don't ship an interactive
 * three.js map on a marketing page.
 */
import { useState } from 'react';
import { Compass, MapPin, Navigation, Shield } from 'lucide-react';
import { SectionShell, SectionHeading, Card, Badge, Button } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { MatchDiagramArt } from '@/components/illustrations/Illustrations';

interface City {
  id: string;
  name: string;
  units: number;
  medianEta: string;
  coords: string;
  cx: number; // percentage 0..100
  cy: number;
}

const CITIES: City[] = [
  { id: 'lhr', name: 'Lahore',         units: 320, medianEta: '7 min',  coords: '31.5204° N, 74.3587° E',  cx: 56, cy: 44 },
  { id: 'khi', name: 'Karachi',        units: 280, medianEta: '9 min',  coords: '24.8607° N, 67.0011° E',  cx: 38, cy: 76 },
  { id: 'isb', name: 'Islamabad',      units: 180, medianEta: '8 min',  coords: '33.6844° N, 73.0479° E',  cx: 55, cy: 26 },
  { id: 'fsd', name: 'Faisalabad',     units:  90, medianEta: '10 min', coords: '31.4504° N, 73.1350° E',  cx: 52, cy: 40 },
  { id: 'mux', name: 'Multan',         units:  60, medianEta: '11 min', coords: '30.1575° N, 71.5249° E',  cx: 47, cy: 56 },
  { id: 'pwr', name: 'Peshawar',       units:  70, medianEta: '9 min',  coords: '34.0150° N, 71.5249° E',  cx: 48, cy: 18 },
  { id: 'qta', name: 'Quetta',         units:  40, medianEta: '13 min', coords: '30.1798° N, 66.9750° E',  cx: 28, cy: 56 },
  { id: 'hyd', name: 'Hyderabad (S)',  units:  55, medianEta: '10 min', coords: '25.3960° N, 68.3578° E',  cx: 42, cy: 82 },
];

export function LocationSection() {
  const [active, setActive] = useState<City | null>(null);
  const focused = active ?? CITIES[0];

  return (
    <SectionShell id="coverage" className="container section">
      <FadeIn>
        <SectionHeading
          hue="azure"
          eyebrow={<><Navigation size={13} aria-hidden /> Coverage · 14 metros · onboarding</>}
          title={<>We work precisely where <span className="text-gradient-signal">you’re stranded.</span></>}
          description="GPS coordinate lock from your browser — no app required. The platform retains your last known satellite fix so it can still reach you in cellular dead zones."
        />
      </FadeIn>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        {/* Left: city inspector */}
        <div className="lg:col-span-5">
          <Card elevated className="h-full">
            <div className="flex items-center justify-between border-b border-line-soft pb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-azure-500/10 text-azure-300 ring-1 ring-inset ring-azure-500/20">
                  <Compass size={16} />
                </span>
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-azure-300">
                    Active city
                  </div>
                  <div className="text-xs text-fg-muted">tap any node</div>
                </div>
              </div>
              <Badge tone="azure" size="sm" live>live</Badge>
            </div>

            <h3 className="display mt-5 text-h2 font-bold text-fg-app">{focused.name}</h3>
            <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">{focused.coords}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-line-soft bg-surface-2/60 p-3 font-mono text-xs">
              <div>
                <div className="text-[10px] text-fg-subtle">UNITS ONLINE</div>
                <div className="mt-0.5 text-small font-semibold text-fg-app">{focused.units}</div>
              </div>
              <div>
                <div className="text-[10px] text-fg-subtle">MEDIAN ETA</div>
                <div className="mt-0.5 text-small font-semibold text-aqua-400">{focused.medianEta}</div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-small text-fg-muted">
              <Shield size={14} className="text-azure-400" />
              Background tracking is off. Coordinates are purged when the service completes.
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-line-soft pt-4">
              <Button variant="primary" size="md" leftIcon={<MapPin size={16} />}>
                Request assistance
              </Button>
              <Button variant="secondary" size="md" onClick={() => setActive(null)}>
                Reset map
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: SVG coverage canvas */}
        <div className="lg:col-span-7">
          <Card className="relative h-[440px] overflow-hidden p-0">
            <MatchDiagramArt className="absolute inset-0 h-full w-full" />

            {/* city pins overlay */}
            <div className="absolute inset-0">
              {CITIES.map((c) => {
                const isActive = focused.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActive(c)}
                    aria-label={c.name}
                    style={{ left: `${c.cx}%`, top: `${c.cy}%` }}
                    className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                  >
                    <span
                      aria-hidden
                      className={[
                        'absolute inset-0 -m-2 rounded-full',
                        isActive ? 'animate-ping2 bg-azure-500/40' : 'bg-transparent',
                      ].join(' ')}
                    />
                    <span
                      className={[
                        'relative grid h-7 w-7 place-items-center rounded-full border text-white shadow-md transition-transform group-hover:scale-110',
                        isActive
                          ? 'border-aqua-400 bg-azure-600 ring-4 ring-aqua-400/30'
                          : 'border-azure-400/50 bg-[#0a121e] text-azure-300',
                      ].join(' ')}
                    >
                      <MapPin size={12} />
                    </span>
                    <span
                      className={[
                        'absolute left-1/2 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[10px] backdrop-blur',
                        isActive
                          ? 'border-aqua-400/50 bg-surface-app/95 text-aqua-300 opacity-100'
                          : 'border-line-soft bg-surface-app/70 text-fg-muted opacity-80 group-hover:opacity-100',
                      ].join(' ')}
                    >
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-line-soft bg-surface-app/80 px-2.5 py-1 font-mono text-[11px] text-fg-muted backdrop-blur">
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-aqua-500" />
              live coverage · 14 metros
            </div>
          </Card>
        </div>
      </div>
    </SectionShell>
  );
}
