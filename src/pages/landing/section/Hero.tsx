/**
 * MECHIST — Hero (rebuilt with the Magic UI stack).
 *
 * Layout: split — copy on the left, an instrumented "dispatch stage" on
 * the right. The stage is a 2D panel that composes an AnimatedGridPattern
 * background, a slowly rotating Globe, two OrbitingCircles of mechanic
 * and city nodes, and a HeroVideoDialog trigger for the product preview.
 *
 * The right-hand stage is wrapped in an ErrorBoundary so a failing
 * globe/orbit can never blank the page — the boundary's default panel
 * shows a "view live dispatch on the map" link plus the same readouts.
 * `HeroStageFallback` is exported as a sibling for any future call-site
 * that prefers a richer fallback than the in-house boundary's default.
 *
 * Components used (all hand-rolled, see src/components/magicui/):
 *   - AnimatedGridPattern  — background
 *   - BlurFade             — entrance
 *   - TextAnimate          — headline per-word blur-in
 *   - SparklesText         — accent on the gradient phrase
 *   - ShimmerButton        — primary CTA
 *   - Globe                — backdrop
 *   - OrbitingCircles      — two layers of mechanic / city nodes
 *   - HeroVideoDialog      — preview
 */
import { useMemo, type ReactNode, Suspense, lazy } from 'react';
import {
  ArrowRight,
  Battery,
  Car,
  Clock,
  LogOut,
  MapPin,
  ShieldCheck,
  UserCog,
  Wrench,
  Wrench as WrenchIcon,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, Badge, Button } from '@/components/ui';
import { ErrorBoundary, Skeleton } from '@/components/feedback';
import {
  BlurFade,
  HeroVideoDialog,
  ShimmerButton,
  TextAnimate,
} from '@/components/magicui';
import { useAuth } from '@/app/AuthProvider';

// Lazy-load heavy Three.js/animation components
const Globe = lazy(() => import('@/components/magicui/globe').then((m) => ({ default: m.Globe })));
const OrbitingCircles = lazy(() => import('@/components/magicui/orbiting-circles').then((m) => ({ default: m.OrbitingCircles })));
const AnimatedGridPattern = lazy(() => import('@/components/magicui/animated-grid-pattern').then((m) => ({ default: m.AnimatedGridPattern })));

/* -------------------------------------------------------------------------- */
/* Static data                                                                */
/* -------------------------------------------------------------------------- */

/** Illustrative preview targets — not live telemetry. Live counts are on /map and /mechanics. */
const STATUS: { k: string; v: string }[] = [
  { k: 'dispatch', v: 'nominal' },
  { k: 'units online', v: '1,240' },
  { k: 'cities', v: '14' },
  { k: 'median eta', v: '8 min' },
];

const READOUTS: { k: string; v: string; u?: string }[] = [
  { k: 'distance', v: '3.2', u: 'km' },
  { k: 'eta', v: '8', u: 'min' },
  { k: 'dispatch fee', v: '$0' },
];

const ASSURANCES: { icon: LucideIcon; hue: string; t: string }[] = [
  { icon: ShieldCheck, hue: 'text-azure-500', t: 'Vetted & background-checked mechanics' },
  { icon: Clock,       hue: 'text-aqua-500',  t: 'Live ETA from accept to arrival' },
  { icon: Wrench,      hue: 'text-gold-500',  t: 'Pay only when the service completes' },
];

/* Inner orbit — 3 mechanic disciplines (single icon each, evenly spaced). */
const INNER_NODES: { icon: LucideIcon; tone: string }[] = [
  { icon: WrenchIcon, tone: 'bg-azure-500/15 text-azure-300 ring-azure-500/40' },
  { icon: Battery,    tone: 'bg-aqua-500/15  text-aqua-300  ring-aqua-500/40'  },
  { icon: Car,        tone: 'bg-iris-500/15  text-iris-300  ring-iris-500/40'  },
];

/* Outer orbit — 6 city dots representing live dispatch coverage. */
const OUTER_CITIES = ['NYC', 'CHI', 'AUS', 'LAX', 'SEA', 'MIA'] as const;

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function Hero() {
  const { user, signOut, role } = useAuth();
  const isSignedIn = Boolean(user);
  const roleLabel = role === 'customer' ? 'Customer' : role === 'mechanic' ? 'Mechanic' : role === 'admin' ? 'Admin' : 'User';

  return (
    <section className="relative isolate overflow-hidden">
      <span aria-hidden className="mesh-layer opacity-80" />
      <span aria-hidden className="grid-layer" />

      <StatusBar />

      <div className="container relative pb-section-sm pt-12 md:pt-16">
        <div className="grid items-center gap-gutter lg:grid-cols-12">
          {/* Left: copy */}
          <div className="lg:col-span-6">
            <BlurFade inView={false}>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="azure" className="h-7 pl-1.5 pr-3">
                  <span aria-hidden className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-azure-500 shadow-[0_0_0_3px_rgb(59_125_255/0.18)]" />
                  Roadside help, when you need it
                </Badge>
                <span className="eyebrow">24/7 live dispatch</span>
              </div>
            </BlurFade>

            <h1 className="display mt-6 text-display-xl text-fg-app text-balance">
              <TextAnimate
                by="word"
                animation="blurIn"
                duration={0.55}
                stagger={0.06}
                className="text-fg-app"
              >
                The road doesn’t wait. Neither do we.
              </TextAnimate>
            </h1>

            <BlurFade inView={false} delay={0.45}>
              <p className="mt-6 max-w-xl text-body-lg text-fg-muted text-pretty">
                Share your location, get matched with nearby mechanics, and follow
                every status update from request to resolution — one calm interface
                built for the moment everything goes sideways.
              </p>
            </BlurFade>

            <BlurFade inView={false} delay={0.6}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <ShimmerButton
                  onClick={() => { window.location.href = '/request'; }}
                  aria-label="Request assistance"
                >
                  Request assistance
                  <ArrowRight size={18} aria-hidden />
                </ShimmerButton>
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<MapPin size={18} />}
                  onClick={() => { window.location.href = '/mechanics'; }}
                >
                  Find a mechanic
                </Button>
                <span className="text-small text-fg-subtle">
                  No app to download · transparent per-job pricing
                </span>
              </div>
            </BlurFade>

            {/* Switch account / Sign out for signed-in users */}
            {isSignedIn && (
              <BlurFade inView={false} delay={0.78}>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="text-small text-fg-muted">
                    Signed in as <span className="font-medium text-fg-app">{roleLabel}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<UserCog size={16} />}
                    onClick={() => { signOut(); window.location.href = '/login'; }}
                  >
                    Switch account
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<LogOut size={16} />}
                    onClick={() => { signOut(); window.location.href = '/'; }}
                  >
                    Sign out
                  </Button>
                </div>
              </BlurFade>
            )}

            <BlurFade inView={false} delay={0.72}>
              <ul className="mt-9 grid max-w-xl gap-px overflow-hidden rounded-lg border border-line-soft bg-hair/[0.08]">
                {ASSURANCES.map(({ icon: Icon, hue, t }) => (
                  <li
                    key={t}
                    className="flex items-center gap-3 bg-surface-app/75 px-4 py-3 text-small text-fg-muted"
                  >
                    <Icon size={15} className={hue} />
                    {t}
                  </li>
                ))}
              </ul>
            </BlurFade>
          </div>

          {/* Right: dispatch stage (wrapped so a failing globe/orbit
              never blanks the page; the boundary's default panel is
              what the user actually sees in that case). */}
          <div className="lg:col-span-6">
            <ErrorBoundary label="Dispatch stage">
              <Stage />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Status strip (unchanged)                                                   */
/* -------------------------------------------------------------------------- */

function StatusBar() {
  return (
    <div className="relative border-b border-line-soft bg-surface-app/60 backdrop-blur">
      <div className="container no-scrollbar flex items-center gap-5 overflow-x-auto py-2.5">
        <Badge tone="aqua" size="sm" live>preview</Badge>
        {STATUS.map((s) => (
          <span key={s.k} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <span className="eyebrow">{s.k}</span>
            <span className="stat-num text-xs text-fg-app">{s.v}</span>
          </span>
        ))}
        <span className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          <span className="eyebrow">last sync</span>
          <span className="stat-num text-xs text-fg-app">illustrative</span>
        </span>
      </div>
      <span className="sr-only">Status readouts are illustrative preview targets, not live telemetry. Live data is on the map and dashboards.</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage — panel chrome + globe + orbits + video trigger                      */
/* -------------------------------------------------------------------------- */

function Stage() {
  return (
    <div className="panel overflow-hidden rounded-2xl shadow-pop">
      {/* titlebar */}
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-aqua-500 shadow-[0_0_0_3px_rgb(15_176_174/0.18)]" />
          <span className="eyebrow">dispatch · sector 04</span>
        </div>
        <Badge tone="aqua" size="sm" live>streaming</Badge>
      </div>

      {/* viewport: grid + globe + orbits + video trigger */}
      <div className="relative isolate aspect-[16/11] overflow-hidden bg-surface-inset">
        <Suspense fallback={<div className="absolute inset-0 z-0 grid place-items-center"><Skeleton className="h-32 w-32" /></div>}>
          <AnimatedGridPattern
            size={36}
            innerStop={20}
            outerStop={100}
            opacity={0.35}
            highlightSpan={2}
            strokeColor="rgb(34 199 194)"
            highlightColor="rgb(59 125 255)"
            className="z-0"
          />
        </Suspense>
        {/* Soft radial highlight behind the globe so it reads as the focal point. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 50%, rgb(59 125 255 / 0.15), transparent 70%)',
          }}
        />

        <Orbits />

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-surface-1 via-transparent to-transparent opacity-80"
        />
        <span aria-hidden className="pointer-events-none absolute left-4 top-4 z-20 h-5 w-5 border-l border-t border-white/25" />
        <span aria-hidden className="pointer-events-none absolute right-4 top-4 z-20 h-5 w-5 border-r border-t border-white/25" />
        <span aria-hidden className="pointer-events-none absolute inset-x-4 top-1/2 z-20 h-px bg-white/10" />
      </div>

      {/* assigned unit */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name="Aria T." />
          <div className="min-w-0">
            <div className="truncate text-small font-medium text-fg-app">Aria T. · assigned</div>
            <div className="truncate text-xs text-fg-subtle">Tyres · Battery · Diagnostics</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="gold" size="sm">★ 4.9 (210)</Badge>
          <Badge tone="success" size="sm" dot>available</Badge>
        </div>
      </div>

      {/* readouts */}
      <div className="grid grid-cols-3 divide-x divide-line-soft border-t border-line-soft bg-surface-2/40">
        {READOUTS.map((r) => (
          <div key={r.k} className="px-4 py-3">
            <div className="eyebrow">{r.k}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="stat-num text-h2 font-semibold text-fg-app">{r.v}</span>
              {r.u && <span className="font-mono text-xs text-fg-subtle">{r.u}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Orbits — globe center + inner icon ring + outer city ring                  */
/* -------------------------------------------------------------------------- */

function Orbits() {
  // Pre-compute a stable, evenly-spaced list of city dots so the outer
  // orbit looks consistent across re-renders (no SSR hydration jitter).
  const outerDots = useMemo(
    () =>
      OUTER_CITIES.map((label, i) => ({
        label,
        // Stagger the reverse duration per node for a calmer feel.
        duration: 38 + i * 1.5,
        delay: -i * 4,
        // Alternate direction so the inner and outer rings counter-rotate.
        reverse: i % 2 === 1,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div className="relative" style={{ width: 360, height: 360 }}>
        {/* Globe backdrop */}
        <div className="absolute inset-0 grid place-items-center">
          <Suspense fallback={<div className="absolute inset-0 grid place-items-center"><Skeleton className="h-64 w-64 rounded-full" /></div>}>
            <Globe radius={150} color="rgb(34 199 194)" landColor="rgba(59, 125, 255, 0.55)" />
          </Suspense>
        </div>

        {/* Inner orbit — mechanic disciplines */}
        <Suspense fallback={<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><Skeleton className="h-11 w-11" /></div>}>
          <OrbitingCircles
            radius={120}
            duration={22}
            className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <OrbitChipStack nodes={INNER_NODES} />
          </OrbitingCircles>
        </Suspense>

        {/* Outer orbit — city dots */}
        {outerDots.map((city) => (
          <Suspense key={city.label} fallback={<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><Skeleton className="h-7 w-7" /></div>}>
            <OrbitingCircles
              radius={170}
              duration={city.duration}
              reverse={city.reverse}
              delay={city.delay}
              className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <CityDot label={city.label} />
            </OrbitingCircles>
          </Suspense>
        ))}

        {/* Center video trigger */}
        <HeroVideoDialog
          videoSrc="/preview.mp4"
          posterSrc="/preview-poster.jpg"
          title="See RoadAssisst in action"
          className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 h-20 w-20"
        >
          <CenterTrigger />
        </HeroVideoDialog>
      </div>
    </div>
  );
}

/**
 * Renders the three inner orbit nodes stacked at the top of the orbit.
 * The orbit motion translates the parent; each chip is laid out as a
 * horizontal row so they appear evenly along the ring.
 */
function OrbitChipStack({ nodes }: { nodes: { icon: LucideIcon; tone: string }[] }) {
  return (
    <div className="flex items-center gap-3">
      {nodes.map(({ icon: Icon, tone }, i) => (
        <div
          key={i}
          className={`grid h-11 w-11 place-items-center rounded-full bg-surface-1/95 shadow-pop ring-2 ${tone}`}
          aria-hidden
        >
          <Icon size={18} />
        </div>
      ))}
    </div>
  );
}

function CityDot({ label }: { label: string }) {
  return (
    <div
      className="grid h-7 w-7 place-items-center rounded-full bg-surface-1/95 text-[10px] font-semibold uppercase tracking-wider text-fg-app ring-1 ring-aqua-500/40 shadow-pop"
      aria-label={`Live in ${label}`}
    >
      {label.slice(0, 3)}
    </div>
  );
}

function CenterTrigger() {
  return (
    <div className="grid h-20 w-20 place-items-center rounded-full bg-surface-1/95 text-ink-900 shadow-pop ring-1 ring-line-soft">
      <span aria-hidden className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
        ▶ play
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Fallback panel for the right-hand stage. Exported as a sibling so a future */
/* call-site that wants a richer fallback than the in-house boundary's default */
/* can opt into it.                                                           */
/* -------------------------------------------------------------------------- */

export function HeroStageFallback(): ReactNode {
  return (
    <div className="panel overflow-hidden rounded-2xl border border-line-soft bg-surface-1 shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-aqua-500" />
          <span className="eyebrow">dispatch · sector 04</span>
        </div>
        <Badge tone="aqua" size="sm" live>streaming</Badge>
      </div>
      <div className="aspect-[16/11] grid place-items-center p-6 text-center">
        <div>
          <div className="text-small font-medium text-fg-app">Live dispatch map</div>
          <p className="mt-1 max-w-xs text-xs text-fg-muted">
            The animated dispatch stage failed to render. You can still track this
            request on the live map once you sign in.
          </p>
          <a
            href="/dashboard"
            className="mt-4 inline-block text-xs font-medium text-azure-500 underline-offset-2 hover:underline"
          >
            Open live map →
          </a>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-line-soft border-t border-line-soft bg-surface-2/40">
        {READOUTS.map((r) => (
          <div key={r.k} className="px-4 py-3">
            <div className="eyebrow">{r.k}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="stat-num text-h2 font-semibold text-fg-app">{r.v}</span>
              {r.u && <span className="font-mono text-xs text-fg-subtle">{r.u}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
