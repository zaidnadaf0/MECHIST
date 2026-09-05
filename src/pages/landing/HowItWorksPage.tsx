/**
 * MECHIST — How It Works (public, no auth).
 * FACTS: importers App.tsx->HowItWorksPage, TopNav/Footer -> /how-it-works,
 * callers /how-it-works public route (no auth), Landing #how-it-works anchor summary,
 * API SectionShell/SectionHeading/Card/Badge/Button, PageTransition/ScrollRevealSection,
 * schema none (static journey content),
 * verbatim "where the hell is the maps option the website is not ell structured"
 *
 * Dedicated deep-dive for "What happens when you need roadside assistance?".
 * Keeps the landing anchor summary (#how-it-works) but gives the full
 * dual journey (customer 01-05 + mechanic 01-05) its own URL so TopNav/Footer
 * can link to a real page rather than an anchor.
 */
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Compass,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
  Wrench,
  Clock,
  History,
  Power,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { Badge, Button, Card, SectionHeading, SectionShell } from '@/components/ui';
import { FadeIn, PageTransition, ScrollRevealSection } from '@/components/motion';

const CUSTOMER_STEPS: { n: string; title: string; desc: string; icon: typeof MapPin }[] = [
  { n: '01', title: 'Request', desc: 'Pick the vehicle and describe the problem — category plus a few sentences in plain language.', icon: Wrench },
  { n: '02', title: 'Share location', desc: 'Grant location once. We lock your GPS fix; with permission denied we still queue your request.', icon: MapPin },
  { n: '03', title: 'Find a suitable mechanic', desc: 'We filter verified, available mechanics by specialty, vehicle type and straight-line distance within ~25 km.', icon: Compass },
  { n: '04', title: 'Track', desc: 'After accept you see who is coming, their ETA (straight-line, not road ETA) and live position on the map.', icon: Navigation },
  { n: '05', title: 'Get back on the road', desc: 'On arrival \u2192 service \u2192 completed. Receipt lands in history; you can rate the service there.', icon: CheckCircle2 },
];

const MECHANIC_STEPS: { n: string; title: string; desc: string; icon: typeof Power }[] = [
  { n: '01', title: 'Register & get verified', desc: 'Sign up as a mechanic, complete your profile (specialties, vehicle types, base location) and wait for admin approval.', icon: ShieldCheck },
  { n: '02', title: 'Go online', desc: 'Toggle Available. You appear in the public roster and the live dispatch queue.', icon: Power },
  { n: '03', title: 'Receive the offer', desc: 'Incoming requests stream live. You have two minutes to accept; declining removes it from your queue via declinedBy.', icon: Radio },
  { n: '04', title: 'Travel & update', desc: 'After accept, push your live GPS (throttled 25 m / 5 s) and move the job through on-the-way \u2192 arrived \u2192 service.', icon: Navigation },
  { n: '05', title: 'Complete & history', desc: 'Mark completed. The job lands in both your history and the customer history with real Firestore data.', icon: History },
];

export function HowItWorksPage() {
  return (
    <PageTransition>
      {/* Hero */}
      <SectionShell tone="app" className="container section-sm">
        <FadeIn>
          <div className="flex flex-col gap-4">
            <span className="eyebrow inline-flex items-center gap-2"><CircleHelp size={13} className="text-azure-400" /> How it works</span>
            <h1 className="display text-display-md text-fg-app text-balance">
              What happens when you need roadside assistance?
            </h1>
            <p className="max-w-prose text-body text-fg-muted text-pretty">
              No wall of text — just the actual journey your request takes through MECHIST, and the parallel
              journey your mechanic sees. Everything below maps to a real screen you can open today.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/request"><Button variant="primary" rightIcon={<ArrowRight size={16} />}>Request assistance</Button></Link>
              <Link to="/map"><Button variant="secondary" leftIcon={<MapPin size={16} />}>Explore the map</Button></Link>
            </div>
          </div>
        </FadeIn>
      </SectionShell>

      {/* Customer journey */}
      <ScrollRevealSection className="container section-compact">
        <SectionHeading
          as="h2"
          size="sm"
          eyebrow="Customer journey"
          title="Five steps from breakdown to back on the road."
          description="Each step is a real screen in the app. Numbers, icons and a one-line explanation — no invented promises."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CUSTOMER_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.n} tone={s.n === '01' ? 'azure' : s.n === '02' ? 'aqua' : s.n === '03' ? 'iris' : s.n === '04' ? 'aqua' : 'gold'}>
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 ring-1 ring-inset ring-line-soft"><Icon size={14} className="text-fg-muted" /></span>
                  <span className="font-mono text-xs font-semibold tracking-[0.14em] text-fg-subtle">{s.n}</span>
                </div>
                <h3 className="mt-3 text-h3 text-fg-app">{s.title}</h3>
                <p className="mt-1.5 text-small text-fg-muted text-pretty">{s.desc}</p>
              </Card>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-fg-subtle">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-soft bg-surface-2 px-2.5 py-1"><Eye size={14} strokeWidth={2} /> Track at <Link to="/dashboard" className="underline decoration-line-strong underline-offset-4 hover:text-fg-app">/dashboard</Link></span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-soft bg-surface-2 px-2.5 py-1"><Clock size={14} strokeWidth={2} /> Live at <Link to="/mechanics" className="underline decoration-line-strong underline-offset-4 hover:text-fg-app">/mechanics</Link></span>
        </div>
      </ScrollRevealSection>

      {/* Mechanic journey */}
      <ScrollRevealSection className="container section-compact">
        <SectionHeading
          as="h2"
          size="sm"
          eyebrow="Mechanic journey"
          title="Five steps from sign-up to completed job."
          description="The other side of the same timeline — what a mechanic does from the moment they register."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MECHANIC_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.n} tone="aqua">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 ring-1 ring-inset ring-line-soft"><Icon size={14} className="text-fg-muted" /></span>
                  <span className="font-mono text-xs font-semibold tracking-[0.14em] text-fg-subtle">{s.n}</span>
                </div>
                <h3 className="mt-3 text-h3 text-fg-app">{s.title}</h3>
                <p className="mt-1.5 text-small text-fg-muted text-pretty">{s.desc}</p>
              </Card>
            );
          })}
        </div>
        <div className="mt-4">
          <Link to="/signup/mechanic"><Button variant="secondary" size="sm" rightIcon={<ArrowRight size={14} />}>Become a mechanic</Button></Link>
        </div>
      </ScrollRevealSection>

      {/* Location & GPS + Matching */}
      <ScrollRevealSection className="container section-compact">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card tone="aqua">
            <SectionHeading as="h2" size="sm" eyebrow="Location & GPS" title="How location works." description="Honest, no road-ETA claim." />
            <ul className="mt-4 flex flex-col gap-2 text-small text-fg-muted">
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-aqua-400" /> <span><strong className="text-fg-app">Browser geolocation</strong> — <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">useGeolocation</code> / <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">useWatchPosition</code> with permission, denied/unavailable handling and retry.</span></li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-aqua-400" /> <span><strong className="text-fg-app">Tiles</strong> — Geoapify when <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">VITE_GEOAPIFY_API_KEY</code> is set, otherwise Leaflet + OpenStreetMap. A tile failure falls back to OSM for the session.</span></li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-aqua-400" /> <span><strong className="text-fg-app">Distance</strong> — Haversine (<code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">R=6371 km</code>, straight-line). Not road distance. ETAs shown are straight-line at ~35 km/h.</span></li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-aqua-400" /> <span><strong className="text-fg-app">Privacy</strong> — your fix is shared with the assigned mechanic only after they accept.</span></li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/map"><Button variant="secondary" size="sm" leftIcon={<MapPin size={14} />}>Open live map</Button></Link>
              <Link to="/mechanics"><Button variant="ghost" size="sm">Mechanic network</Button></Link>
            </div>
          </Card>
          <Card tone="iris">
            <SectionHeading as="h2" size="sm" eyebrow="Matching" title="How the right mechanic is found." description="Capability filter, not magic — no ML claim in this release." />
            <ul className="mt-4 flex flex-col gap-2 text-small text-fg-muted">
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-iris-400" /> <span>Filters by <strong className="text-fg-app">specialty + vehicle type</strong> compatibility.</span></li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-iris-400" /> <span>Narrows to <strong className="text-fg-app">available + verified mechanics within ~25 km</strong> of your fix.</span></li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-iris-400" /> <span>Live queue: mechanics see the offer for <strong className="text-fg-app">two minutes</strong>; declining adds their id to <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">declinedBy</code> so it never reappears for them.</span></li>
              <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-iris-400" /> <span><strong className="text-fg-app">No fake assignment</strong> — if nobody matches, the request stays queued and you can track it.</span></li>
            </ul>
            <p className="mt-4 rounded-lg border border-line-soft bg-surface-2/60 px-3 py-2 font-mono text-xs text-fg-subtle">Reused: nearbyMechanics() · problemCompatibility() · watchIncoming / acceptJob / declineOffer</p>
          </Card>
        </div>
      </ScrollRevealSection>

      {/* Tracking & completion */}
      <ScrollRevealSection className="container section-compact">
        <Card tone="gold">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionHeading as="h2" size="sm" eyebrow="Tracking & completion" title="Follow the job, then archive it." />
              <ul className="mt-4 flex flex-col gap-2 text-small text-fg-muted">
                <li className="flex gap-2"><Navigation size={14} className="mt-0.5 shrink-0 text-gold-600" /> <span>On accept you land on <Link to="/dashboard" className="underline decoration-line-strong underline-offset-4 hover:text-fg-app">/track/:id</Link> — customer pin + mechanic pin + dashed line, mechanic GPS pushed throttled 25 m / 5 s.</span></li>
                <li className="flex gap-2"><Clock size={14} className="mt-0.5 shrink-0 text-gold-600" /> <span>Status moves <strong className="text-fg-app">requested → accepted → on-the-way → arrived → service → completed</strong> (cancelled is terminal). ETA is straight-line.</span></li>
                <li className="flex gap-2"><History size={14} className="mt-0.5 shrink-0 text-gold-600" /> <span>Completed and cancelled services appear in <Link to="/history" className="underline decoration-line-strong underline-offset-4 hover:text-fg-app">/history</Link> (customer) and <Link to="/mechanic/history" className="underline decoration-line-strong underline-offset-4 hover:text-fg-app">/mechanic/history</Link> (mechanic).</span></li>
              </ul>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-line-soft bg-surface-2/60 p-4">
              <span className="eyebrow">Safety</span>
              <h3 className="text-h3 text-fg-app">If you are broken down</h3>
              <ol className="flex flex-col gap-1.5 text-small text-fg-muted list-decimal list-inside">
                <li>Move to a safe spot, hazard lights on.</li>
                <li>Open MECHIST → <Link to="/request" className="underline decoration-line-strong underline-offset-4 hover:text-fg-app">Request assistance</Link>.</li>
                <li>Pick vehicle, describe the problem, confirm location.</li>
                <li>Submit — an offer is live for two minutes.</li>
                <li>Track on <Link to="/dashboard" className="underline decoration-line-strong underline-offset-4 hover:text-fg-app">/track/:id</Link> and follow status updates.</li>
              </ol>
              <p className="flex items-center gap-1.5 text-xs text-fg-subtle"><AlertTriangle size={14} strokeWidth={2} /> No repair instructions — stay safe and wait for the mechanic.</p>
            </div>
          </div>
        </Card>
      </ScrollRevealSection>

      {/* FAQ */}
      <ScrollRevealSection className="container section-compact">
        <SectionHeading as="h2" size="sm" eyebrow="FAQ" title="Real-behavior answers." description="Each answer maps to something the app actually does." />
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <Card><h3 className="text-h3 text-fg-app">What happens right after I submit?</h3><p className="mt-1.5 text-small text-fg-muted text-pretty">Your request is written to Firestore with status requested and a two-minute offer window. Mechanics with matching specialty and vehicle type within ~25 km see it live. First to accept is assigned.</p></Card>
          <Card><h3 className="text-h3 text-fg-app">How is distance calculated?</h3><p className="mt-1.5 text-small text-fg-muted text-pretty">Haversine straight-line distance (R = 6371 km). It is not road distance. ETAs shown are straight-line at ~35 km/h — traffic and roads are not factored in this release.</p></Card>
          <Card><h3 className="text-h3 text-fg-app">What if I deny location?</h3><p className="mt-1.5 text-small text-fg-muted text-pretty">The location step surfaces the denied state with a retry. You cannot submit without a fix — the dispatch filter requires coordinates. Grant location and try again.</p></Card>
          <Card><h3 className="text-h3 text-fg-app">Can I cancel?</h3><p className="mt-1.5 text-small text-fg-muted text-pretty">From the tracking page or dashboard active-request card while the request is still requested/accepted. Cancelled requests appear in history.</p></Card>
          <Card><h3 className="text-h3 text-fg-app">What if nobody accepts?</h3><p className="mt-1.5 text-small text-fg-muted text-pretty">The request stays queued. Mechanics who declined are filtered via declinedBy and will not see it again. Keep tracking; availability changes throughout the day.</p></Card>
          <Card><h3 className="text-h3 text-fg-app">Which map do I see?</h3><p className="mt-1.5 text-small text-fg-muted text-pretty">Geoapify tiles when D:\MECHIST\.env.local holds a valid VITE_GEOAPIFY_API_KEY and VITE_MAPS_PROVIDER=geoapify; otherwise Leaflet + OpenStreetMap. A Geoapify tile failure falls back to OSM for the session.</p></Card>
        </div>
      </ScrollRevealSection>

      {/* Final CTA */}
      <SectionShell tone="app" className="container section-sm">
        <FadeIn>
          <Card tone="azure" elevated className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone="azure" live>Ready when you are</Badge>
              <h2 className="mt-2 display text-h2 text-fg-app text-balance">Need roadside assistance?</h2>
              <p className="mt-1 max-w-prose text-small text-fg-muted text-pretty">Pick a vehicle, pin the location, describe the problem — we will handle the match.</p>
            </div>
            <Link to="/request" className="shrink-0"><Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>Request assistance</Button></Link>
          </Card>
        </FadeIn>
      </SectionShell>
    </PageTransition>
  );
}

export default HowItWorksPage;
