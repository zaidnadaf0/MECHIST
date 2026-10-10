/**
 * Public sign-in entry. The platform has three distinct portals and the
 * brief requires a clear role-selection step before any credentials are
 * captured. The three tiles route to:
 *   - Customer  → /login/customer   (sign in)  or  /signup/customer
 *   - Mechanic  → /login/mechanic   (sign in)  or  /signup/mechanic
 *   - Admin     → /admin/login      (sign in, no public signup)
 *
 * Mechanics go through a separate application flow because the data
 * model needs garage, address, specialisation, vehicle types, etc.
 * Admins are not self-provisioned — the custom claim is set out of band.
 */
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Car, Gauge, Radio, ShieldCheck, Sparkles, Star, Wrench, type LucideIcon,
} from 'lucide-react';
import { Badge, Button, Card, IconTile } from '@/components/ui';
import { FadeIn, PageTransition } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { enterDemo } from '@/lib/demo';

type Hue = 'azure' | 'aqua' | 'iris' | 'gold';

interface RoleCard {
  id: 'customer' | 'mechanic' | 'admin';
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  ctaHref: string;
  signupHref?: string;
  signupLabel?: string;
  icon: LucideIcon;
  hue: Hue;
  edge: 'azure' | 'aqua' | 'iris';
}

const ROLES: RoleCard[] = [
  {
    id: 'customer',
    eyebrow: 'For drivers',
    title: 'Customer',
    body: 'Request roadside assistance, follow your mechanic live, and keep your vehicles in one place.',
    cta: 'Sign in as customer',
    ctaHref: '/login/customer',
    signupHref: '/signup/customer',
    signupLabel: 'Create a customer account',
    icon: Car,
    hue: 'azure',
    edge: 'azure',
  },
  {
    id: 'mechanic',
    eyebrow: 'For providers',
    title: 'Mechanic',
    body: 'Pick up nearby jobs, run them to completion, and grow your garage\'s book of business.',
    cta: 'Sign in as mechanic',
    ctaHref: '/login/mechanic',
    signupHref: '/signup/mechanic',
    signupLabel: 'Apply to the mechanic network',
    icon: Wrench,
    hue: 'aqua',
    edge: 'aqua',
  },
  {
    id: 'admin',
    eyebrow: 'For staff',
    title: 'Admin',
    body: 'Manage the RoadAssisst network: review mechanic applications, oversee requests, and keep the network healthy.',
    cta: 'Open staff sign-in',
    ctaHref: '/admin/login',
    icon: Gauge,
    hue: 'iris',
    edge: 'iris',
  },
];

const PROOF: { icon: LucideIcon; hue: Hue; title: string; body: string }[] = [
  {
    icon: ShieldCheck, hue: 'azure',
    title: 'Verified mechanics',
    body: 'Every mechanic on the network is document-verified and admin-approved before they can accept a job.',
  },
  {
    icon: Radio, hue: 'aqua',
    title: 'Live dispatch across India',
    body: 'Follow your mechanic on the map with a real-time ETA from the second they accept.',
  },
  {
    icon: Star, hue: 'gold',
    title: 'Rated roadside help',
    body: 'Customer ratings feed the matching engine, so the best mechanics in your city get sent out more.',
  },
];

export function AuthPage() {
  const { user, role, configured, signOut } = useAuth();
  const navigate = useNavigate();
  const noRole = new URLSearchParams(window.location.search).get('norole') === '1';

  // Signed-in users can still VIEW this page (role tiles, signup links).
  // Instead of auto-redirecting away, show an inline "already signed in"
  // banner with explicit actions. Route guards remain authoritative.
  const signedIn = Boolean(user) && role !== null && role !== 'unknown';
  const portalFor = (r: typeof role): string =>
    r === 'admin' ? '/admin' : r === 'mechanic' ? '/mechanic' : '/dashboard';

  return (
    <PageTransition>
      <div className="relative isolate overflow-hidden">
        <span aria-hidden className="mesh-layer opacity-80" />
        <span aria-hidden className="grid-layer opacity-60" />

        <div className="container section-sm">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
            <FadeIn>
              <div className="flex flex-col items-center gap-3 text-center">
                <IconTile icon={<Sparkles className="h-5 w-5" />} hue="azure" />
                <div className="flex flex-col items-center gap-2">
                  <div className="eyebrow">Sign in to RoadAssisst</div>
                  <h1 className="display text-display-sm text-fg-app text-balance">
                    Choose how you're using <span className="text-gradient-signal">RoadAssisst</span>
                  </h1>
                </div>
                <p className="max-w-xl text-body text-fg-muted text-pretty">
                  Customer, mechanic, and admin each get a purpose-built portal. Pick the one
                  that matches your account so we can route you to the right place.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone={configured ? 'success' : 'warning'} dot>
                    {configured ? 'Firebase connected' : 'Firebase not configured'}
                  </Badge>
                </div>
              </div>
            </FadeIn>

            {!configured && (
              <FadeIn>
                <p className="rounded-lg border border-warning-500/30 bg-warning-500/10 p-3 text-center text-small text-warning-700 dark:text-warning-300">
                  Add your Firebase keys to <code className="font-mono">.env.local</code> and
                  restart <code className="font-mono">npm run dev</code> to enable real sign-in.
                </p>
              </FadeIn>
            )}

            {(noRole || (user && role === null)) && (
              <FadeIn>
                <div className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-5 text-center">
                  <div className="text-body font-medium text-fg-app">This sign-in has no RoadAssisst profile yet</div>
                  <p className="mx-auto mt-1 max-w-xl text-small text-fg-muted">
                    {user?.email ? <>{user.email} is authenticated, but there is no <code className="font-mono">users/{user.uid}</code> doc with a role. </> : null}
                    BACKUP demo emails do not exist in this Firestore project — create a real account below, then sign in through the matching portal. Admins need a custom claim (see below).
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Button variant="primary" size="sm" onClick={() => navigate('/signup/customer')}>Create customer account</Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/signup/mechanic')}>Apply as mechanic</Button>
                    <Button variant="ghost" size="sm" onClick={() => void signOut()}>Sign out</Button>
                  </div>
                  <p className="mt-3 text-xs text-fg-subtle">
                    Staff: <code className="font-mono">node scripts/setAdminClaim.mjs --uid &lt;UID&gt;</code> with <code className="font-mono">GOOGLE_APPLICATION_CREDENTIALS</code> set, then sign out/in again. Mechanics appear in the queue only after admin approval + availability on.
                  </p>
                </div>
              </FadeIn>
            )}

            {signedIn && (
              <FadeIn>
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-line-soft bg-surface-1/70 px-5 py-4 text-center">
                  <span className="text-small text-fg-muted">
                    Signed in as <span className="font-medium text-fg-app">{user?.email}</span>
                    {` (${role})`}.
                  </span>
                  <Button variant="primary" size="sm" onClick={() => navigate(portalFor(role))}>
                    Go to my portal
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                    Sign out
                  </Button>
                </div>
              </FadeIn>
            )}

            <div className="grid items-stretch gap-5 md:grid-cols-3" data-testid="role-grid">
              {ROLES.map((r, i) => (
                <FadeIn key={r.id} delay={0.04 * (i + 1)}>
                  <RoleTile role={r} />
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={0.16}>
              <div className="rounded-xl border border-dashed border-line-soft bg-surface-1/60 p-5 text-center">
                <div className="eyebrow">No backend yet? Preview with sample data</div>
                <p className="mx-auto mt-1 max-w-xl text-small text-fg-muted">
                  BACKUP-style demo: instant dashboards with clearly-labeled sample data in this browser only. Nothing is real until Firestore exists.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => enterDemo('customer')}>Preview customer</Button>
                  <Button variant="secondary" size="sm" onClick={() => enterDemo('mechanic')}>Preview mechanic</Button>
                  <Button variant="secondary" size="sm" onClick={() => enterDemo('admin')}>Preview admin</Button>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.18}>
              <div className="flex flex-col gap-5 rounded-xl border border-line-soft bg-surface-1/60 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="h-px w-8 bg-gradient-to-r from-azure-500 to-transparent" />
                  <span className="eyebrow">Why a separate flow per role</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {PROOF.map((p) => (
                    <div key={p.title} className="flex items-start gap-3">
                      <IconTile icon={<p.icon className="h-4 w-4" />} hue={p.hue} size="sm" />
                      <div className="min-w-0">
                        <div className="text-small font-medium text-fg-app">{p.title}</div>
                        <p className="mt-0.5 text-xs text-fg-muted text-pretty">{p.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <p className="text-center text-xs text-fg-subtle">
              Need to browse first?{' '}
              <Link to="/" className="link-quiet">
                Back to the home page
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function RoleTile({ role }: { role: RoleCard }) {
  const Icon = role.icon;
  const navigate = useNavigate();
  return (
    <Card
      tone={role.edge}
      elevated
      interactive
      className="flex h-full flex-col gap-5"
      data-testid={`role-${role.id}`}
    >
      <div className="flex items-center justify-between">
        <IconTile icon={<Icon className="h-5 w-5" />} hue={role.hue} />
        <Badge tone="neutral" size="sm">{role.eyebrow}</Badge>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="display text-h2 text-fg-app">{role.title}</h2>
        <p className="text-small text-fg-muted text-pretty">{role.body}</p>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button
          variant={role.id === 'admin' ? 'iris' : role.id === 'mechanic' ? 'live' : 'primary'}
          size="md"
          fullWidth
          rightIcon={<ArrowRight className="h-4 w-4" />}
          onClick={() => navigate(role.ctaHref)}
        >
          {role.cta}
        </Button>
        {role.signupHref && role.signupLabel ? (
          <Link
            to={role.signupHref}
            className="text-center text-xs text-fg-muted hover:text-fg-app"
            data-testid={`role-${role.id}-signup`}
          >
            {role.signupLabel} →
          </Link>
        ) : (
          <p className="text-center text-xs text-fg-subtle">
            Authorised personnel only.
          </p>
        )}
      </div>
    </Card>
  );
}
