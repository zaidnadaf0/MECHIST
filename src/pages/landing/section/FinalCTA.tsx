/**
 * MECHIST — Final CTA.
 *
 * Single full-width call to action. Keeps a real-time band on the
 * top (units online / cities / etc) so the page doesn't end on a
 * "now hire us" cliché, and uses the new `Card` + `SectionShell` to
 * match the rest of the system.
 */
import { ArrowRight, MapPin } from 'lucide-react';
import { SectionShell, Card, Badge } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { Marquee, ShimmerButton } from '@/components/magicui';

const READOUTS: { k: string; v: string; u?: string; tone?: 'aqua' | 'gold' | 'success' }[] = [
  { k: 'median response', v: '< 8', u: 'min' },
  { k: 'covered metros', v: '14', u: 'cities' },
  { k: 'insurance backing', v: '$2M', u: 'comprehensive' },
  { k: 'surge multiplier', v: '0.00x', u: 'guaranteed', tone: 'success' },
];

/** Live-cities marquee content — duplicated by the component for the
 *  seamless wrap, so we keep this list small and on-brand. */
const MARQUEE_CITIES = [
  'New York', 'Chicago', 'Austin', 'Los Angeles', 'Seattle', 'Miami',
  'Boston', 'Denver', 'Atlanta', 'Phoenix', 'Portland', 'Dallas',
];

export function FinalCTA() {
  return (
    <SectionShell id="cta" className="container section">
      <FadeIn>
        {/* Live-cities marquee — sits above the CTA card so the page
            ends on a pulse of motion before the user signs up. */}
        <div className="mb-6 -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-fg-subtle">
            // live dispatch · 14 metros
          </div>
          <Marquee duration={36} gap={32} className="text-small text-fg-muted">
            {MARQUEE_CITIES.map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-2 rounded-full border border-line-soft bg-surface-1/80 px-3 py-1 font-mono text-[11px] text-fg-muted"
              >
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-aqua-500" />
                {city}
                <span className="text-fg-subtle">· online</span>
              </span>
            ))}
          </Marquee>
        </div>

        <Card elevated className="relative overflow-hidden p-8 sm:p-12 lg:p-16">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-azure-500/12 blur-3xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-aqua-500/8 blur-3xl"
          />

          <div className="relative z-10 max-w-3xl">
            <Badge tone="azure" size="md" live>
              dispatch corridor ready · 1,240 mechanics active
            </Badge>

            <h2 className="display mt-5 text-display-xl text-fg-app text-balance">
              Need assistance right now?{' '}
              <span className="text-gradient-signal">MECHIST is on standby.</span>
            </h2>

            <p className="mt-4 max-w-2xl text-body-lg text-fg-muted text-pretty">
              No account creation required for emergency dispatch. Pull coordinates, lock a verified
              technician in under 8 minutes, and follow their arrival step-by-step.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ShimmerButton
                onClick={() => { window.location.href = '/request'; }}
                aria-label="Request emergency assistance"
              >
                Request emergency assistance
                <ArrowRight size={18} aria-hidden />
              </ShimmerButton>
              <a href="#network" className="inline-block">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector('#network')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-line-soft bg-surface-1 px-5 py-3 text-body font-medium text-fg-app transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app"
                >
                  <MapPin size={18} />
                  Explore active roster
                </button>
              </a>
              <span className="text-small text-fg-subtle font-mono">
                Average ETA:{' '}
                <strong className="text-aqua-400 font-semibold">7.8 min</strong> · 100% free
                dispatch quote
              </span>
            </div>
          </div>

          <div className="relative z-10 mt-12 grid grid-cols-2 gap-4 border-t border-line-soft pt-6 font-mono text-xs sm:grid-cols-4">
            {READOUTS.map((r) => (
              <div key={r.k}>
                <div className="text-[10px] uppercase text-fg-subtle">{r.k}</div>
                <div
                  className={[
                    'mt-0.5 font-bold',
                    r.tone === 'success' ? 'text-success-500' : 'text-fg-app',
                  ].join(' ')}
                >
                  {r.v}
                  {r.u && <span className="ml-1 font-normal text-fg-subtle">{r.u}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </FadeIn>
    </SectionShell>
  );
}
