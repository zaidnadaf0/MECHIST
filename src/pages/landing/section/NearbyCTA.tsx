import { Link } from 'react-router-dom';
import { MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { SectionShell, SectionHeading, Card, Badge, Button } from '@/components/ui';
import { FadeIn } from '@/components/motion';

export function NearbyCTA() {
  return (
    <SectionShell id="nearby" className="container section">
      <FadeIn>
        <Card tone="aqua" elevated className="relative overflow-hidden">
          <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-aqua-500/10 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-azure-500/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <SectionHeading
                hue="aqua"
                eyebrow={<><Navigation size={13} aria-hidden /> Location discovery · no GPS on this page</>}
                title={<>Need a mechanic <span className="text-gradient-signal">nearby?</span></>}
                description="Find available mechanics around your current location. Open the live map, share your location once, and see distance-sorted mechanics near you — no account required to explore."
              />
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/map">
                  <Button variant="primary" size="lg" leftIcon={<MapPin size={18} aria-hidden />}>
                    Find Mechanics Near Me
                  </Button>
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-line-soft bg-surface-2/70 px-3 py-1.5 text-xs font-mono text-fg-muted">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-aqua-500" />
                  straight-line distance · Geoapify → OSM fallback
                </span>
              </div>
              <p className="mt-3 max-w-prose text-xs text-fg-subtle">
                Your location is requested only when you open the map and tap <span className="font-medium text-fg-muted">Use My Location</span>. Background tracking stays off unless you enable <em>Track My Location</em>.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="grid gap-3 rounded-xl border border-line-soft bg-surface-2/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">On the map</span>
                  <Badge tone="aqua" size="sm">live</Badge>
                </div>
                <ul className="grid gap-2 text-small text-fg-muted">
                  <li className="flex items-center gap-2"><MapPin size={14} className="text-aqua-400" /> You are here — distinct marker</li>
                  <li className="flex items-center gap-2"><Navigation size={14} className="text-azure-400" /> Recenter &amp; Track My Location</li>
                  <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-success-500" /> Works without GPS — Bengaluru overview</li>
                </ul>
                <div className="flex gap-2 pt-2">
                  <Link to="/map" className="flex-1">
                    <Button variant="secondary" size="md" fullWidth leftIcon={<MapPin size={16} />}>
                      Open live map
                    </Button>
                  </Link>
                  <Link to="/mechanics">
                    <Button variant="ghost" size="md">Directory</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </FadeIn>
    </SectionShell>
  );
}
