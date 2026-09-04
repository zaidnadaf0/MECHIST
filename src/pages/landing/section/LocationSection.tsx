/**
 * MECHIST — Location coverage.
 *
 * Honest description of how the geo layer works. Uses the new SVG
 * art (no fake Leaflet map), and the live radar is replaced with
 * the bespoke MatchDiagramArt so we don't ship an interactive
 * three.js map on a marketing page.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  { id: 'kor', name: 'Koramangala',    units: 320, medianEta: '7 min',  coords: '12.9352° N, 77.6245° E',  cx: 52, cy: 58 },
  { id: 'wht', name: 'Whitefield',     units: 280, medianEta: '9 min',  coords: '12.9698° N, 77.7500° E',  cx: 74, cy: 48 },
  { id: 'ec',  name: 'Electronic City',units: 180, medianEta: '8 min',  coords: '12.8456° N, 77.6603° E',  cx: 56, cy: 78 },
  { id: 'ind', name: 'Indiranagar',    units:  90, medianEta: '10 min', coords: '12.9784° N, 77.6408° E',  cx: 54, cy: 42 },
  { id: 'yel', name: 'Yelahanka',      units:  70, medianEta: '9 min',  coords: '13.1007° N, 77.5963° E',  cx: 48, cy: 18 },
  { id: 'jay', name: 'Jayanagar',      units:  60, medianEta: '11 min', coords: '12.9279° N, 77.6271° E',  cx: 52, cy: 62 },
  { id: 'heb', name: 'Hebbal',         units:  40, medianEta: '13 min', coords: '13.0358° N, 77.5970° E',  cx: 49, cy: 28 },
  { id: 'mar', name: 'Marathahalli',   units:  55, medianEta: '10 min', coords: '12.9591° N, 77.6974° E',  cx: 64, cy: 50 },
];

export function LocationSection() {
  const [active, setActive] = useState<City | null>(null);
  const focused = active ?? CITIES[0];

  return (
    <SectionShell id="coverage" className="container section">
      <FadeIn>
        <SectionHeading
          hue="azure"
          eyebrow={<><Navigation size={13} aria-hidden /> Coverage · illustrative network preview</>}
          title={<>We work precisely where <span className="text-gradient-signal">you’re stranded.</span></>}
          description="GPS coordinate lock from your browser — no app required. The platform retains your last known satellite fix so it can still reach you in cellular dead zones. Below is an illustrative preview; the live network is on the map."
        />
      </FadeIn>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/map"><Button variant="primary" size="md" leftIcon={<MapPin size={16} />}>Explore the live map</Button></Link>
        <Link to="/mechanics"><Button variant="secondary" size="md">Browse mechanics</Button></Link>
      </div>

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
                    Illustrative city
                  </div>
                  <div className="text-xs text-fg-muted">representative figures</div>
                </div>
              </div>
              <Badge tone="neutral" size="sm">preview</Badge>
            </div>

            <h3 className="display mt-5 text-h2 font-bold text-fg-app">{focused.name}</h3>
            <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">{focused.coords}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-line-soft bg-surface-2/60 p-3 font-mono text-xs">
              <div>
                <div className="text-[10px] text-fg-subtle">ILLUSTRATIVE UNITS</div>
                <div className="mt-0.5 text-small font-semibold text-fg-app">{focused.units} · example</div>
              </div>
              <div>
                <div className="text-[10px] text-fg-subtle">ILLUSTRATIVE ETA</div>
                <div className="mt-0.5 text-small font-semibold text-aqua-400">{focused.medianEta} · example</div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-fg-subtle">Live counts are shown on the map and mechanic directory — not here.</p>

            <div className="mt-6 flex items-center gap-2 text-small text-fg-muted">
              <Shield size={14} className="text-azure-400" />
              Background tracking is off. Coordinates are purged when the service completes.
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-line-soft pt-4">
              <Link to="/map"><Button variant="primary" size="md" leftIcon={<MapPin size={16} />}>Open the live map</Button></Link>
              <Button variant="secondary" size="md" onClick={() => setActive(null)}>
                Reset preview
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
              illustrative preview · live data on /map
            </div>
          </Card>
        </div>
      </div>
    </SectionShell>
  );
}
