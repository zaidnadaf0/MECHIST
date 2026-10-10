import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { AppShell } from '@/components/shell';
import { PortalShell } from '@/components/shell/PortalShell';
import { DemoBanner } from '@/components/shell/DemoBanner';
import { ErrorBoundary, Skeleton } from '@/components/feedback';
import { useSmoothScroll } from '@/components/motion';

// The fullscreen WebGL background (three.js) is heavy — code-split it and
// mount it ONLY on public marketing/auth routes. Portal dashboards get a
// static background so dispatch/map UIs stay smooth, especially on mobile.
const Lightning = lazy(() =>
  import('@/components/effects/Lightning').then((m) => ({ default: m.Lightning })),
);
const ParticleWave = lazy(() =>
  import('@/components/effects/ParticleWave').then((m) => ({ default: m.ParticleWave })),
);

/** Portal route prefixes — these get the static background + native scroll. */
const PORTAL_PREFIXES = ['/dashboard', '/request', '/track/', '/history', '/vehicles', '/mechanic', '/admin/', '/services', '/notifications', '/profile', '/settings', '/emergency', '/mechanics/'];

function isPortalRoute(pathname: string): boolean {
  if (pathname === '/mechanic' || pathname === '/admin') return true;
  return PORTAL_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Lenis smooth-scroll only on public routes; portals use native scroll. */
function PublicSmoothScroll() {
  const { pathname } = useLocation();
  const portal = isPortalRoute(pathname);
  useSmoothScroll(!portal);
  return null;
}
import { useAuth, type AppRole } from '@/app/AuthProvider';
import { isAdminAuthorized } from '@/lib/authProfile';
import { LandingPage } from '@/pages/landing/LandingPage';
import { HowItWorksPage } from '@/pages/landing/HowItWorksPage';
import { MapPage } from '@/pages/MapPage';
import { AuthPage } from '@/pages/auth/AuthPage';
import { AdminLogin } from '@/pages/auth/AdminLogin';
import { CustomerLogin } from '@/pages/auth/CustomerLogin';
import { MechanicLogin } from '@/pages/auth/MechanicLogin';
import { CustomerSignup } from '@/pages/auth/CustomerSignup';
import { MechanicSignup } from '@/pages/auth/MechanicSignup';
import { MechanicDirectory } from '@/pages/landing/MechanicDirectory';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';

/* ------------------------------------------------------------------ */
/* Lazy-loaded portal route groups                                    */
/*                                                                    */
/* The landing + auth pages stay eager because they are the public     */
/* surface; the three portals (customer / mechanic / admin) each live */
/* in their own JS chunk and are only fetched when the user lands on  */
/* a route inside that portal. The auth pages are tiny so we keep them */
/* eager as well — lazy-loading them would just add a spinner flash.   */
/* ------------------------------------------------------------------ */
const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard })));
const RequestFlow       = lazy(() => import('@/pages/customer/RequestFlow').then((m) => ({ default: m.RequestFlow })));
const Tracking          = lazy(() => import('@/pages/customer/Tracking').then((m) => ({ default: m.Tracking })));
const History           = lazy(() => import('@/pages/customer/History').then((m) => ({ default: m.History })));
const Vehicles          = lazy(() => import('@/pages/customer/Vehicles').then((m) => ({ default: m.Vehicles })));
const Services          = lazy(() => import('@/pages/customer/Services').then((m) => ({ default: m.Services })));
const MechanicDetail    = lazy(() => import('@/pages/customer/MechanicDetail').then((m) => ({ default: m.MechanicDetail })));
const HistoryDetail     = lazy(() => import('@/pages/customer/HistoryDetail').then((m) => ({ default: m.HistoryDetail })));
const Notifications     = lazy(() => import('@/pages/customer/Notifications').then((m) => ({ default: m.Notifications })));
const Profile           = lazy(() => import('@/pages/customer/Profile').then((m) => ({ default: m.Profile })));
const Settings          = lazy(() => import('@/pages/customer/Settings').then((m) => ({ default: m.Settings })));
const Emergency         = lazy(() => import('@/pages/customer/Emergency').then((m) => ({ default: m.Emergency })));

const MechanicDashboard   = lazy(() => import('@/pages/mechanic/MechanicDashboard').then((m) => ({ default: m.MechanicDashboard })));
const MechanicJob         = lazy(() => import('@/pages/mechanic/MechanicJob').then((m) => ({ default: m.MechanicJob })));
const MechanicHistory     = lazy(() => import('@/pages/mechanic/MechanicHistory').then((m) => ({ default: m.MechanicHistory })));
const MechanicProfilePage = lazy(() => import('@/pages/mechanic/MechanicProfilePage').then((m) => ({ default: m.MechanicProfilePage })));
const MechanicRequests    = lazy(() => import('@/pages/mechanic/Requests').then((m) => ({ default: m.Requests })));
const MechanicEarnings    = lazy(() => import('@/pages/mechanic/Earnings').then((m) => ({ default: m.Earnings })));
const MechanicNotifications = lazy(() => import('@/pages/mechanic/Notifications').then((m) => ({ default: m.MechanicNotifications })));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const MechanicReview = lazy(() => import('@/pages/admin/MechanicReview').then((m) => ({ default: m.MechanicReview })));
const RequestsQueue  = lazy(() => import('@/pages/admin/RequestsQueue').then((m) => ({ default: m.RequestsQueue })));
const Users          = lazy(() => import('@/pages/admin/Users').then((m) => ({ default: m.Users })));
const Dispatch       = lazy(() => import('@/pages/admin/Dispatch').then((m) => ({ default: m.Dispatch })));
const Analytics      = lazy(() => import('@/pages/admin/Analytics').then((m) => ({ default: m.Analytics })));
const Reports        = lazy(() => import('@/pages/admin/Reports').then((m) => ({ default: m.Reports })));
const Logs           = lazy(() => import('@/pages/admin/Logs').then((m) => ({ default: m.Logs })));

/** Where a signed-in user with role X should land by default. */
function homeForRole(role: AppRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'mechanic') return '/mechanic';
  if (role === 'customer') return '/dashboard';
  return '/';
}

function RequireAuth({ children, requireRole, requireAdminClaim }: { children: ReactNode; requireRole?: AppRole; requireAdminClaim?: boolean }) {
  const { user, role, isAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PortalFallback />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  // While the role is still being resolved (`'unknown'`) we hold the
  // route render with the same skeleton the lazy chunk uses. The
  // previous `return null` here produced a literally blank page during
  // the signup/profile race and during refresh-on-protected-route
  // before AuthProvider's onAuthStateChanged callback resolved.
  // Rendering the skeleton keeps the layout stable and signals that we
  // are still working, without bypassing any role guard.
  if (role === 'unknown') return <PortalFallback />;
  // Signed in but no users/{uid} doc (e.g. console-created account, or
  // BACKUP demo emails that don't exist in this Firestore project).
  // Bouncing to '/' looked like "nothing happens" — send to /login with
  // an explicit recovery message instead.
  if (role === null) return <Navigate to={`/login?norole=1&next=${encodeURIComponent(location.pathname)}`} replace />;
  // If a role is required, gate the route. The dev role fallback still
  // works for users without a Firestore doc; the canonical check is the
  // resolved `role` from AuthProvider.
  if (requireRole && role !== requireRole) {
    return <Navigate to={homeForRole(role)} replace />;
  }
  // Phase 1C: admin routes additionally require the Firebase ID-token
  // custom claim (token.admin === true). A users/{uid}.role === 'admin'
  // doc WITHOUT the claim gets no functional admin access — the claim is
  // the authority, the doc is a hint. Bounce to '/' (not homeForRole,
  // which would loop back to /admin) while the claim resolves.
  if (requireAdminClaim) {
    if (isAdmin === null) return <PortalFallback />;
    if (!isAdminAuthorized(role, isAdmin)) {
      return <Navigate to="/" replace />;
    }
  }
  return <>{children}</>;
}

/** Suspense fallback for lazy portal routes. Keeps the layout stable while the chunk loads. */
function PortalFallback() {
  return (
    <div className="container section-sm">
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

/** Rendered inside the router so it can read the current pathname. */
function PublicBackdrop() {
  const { pathname } = useLocation();
  if (isPortalRoute(pathname)) return null;
  return (
    <ErrorBoundary label="Background">
      <Suspense fallback={null}>
        {/* BACKUP's dotted-wave mesh (user video ref) as the base layer,
            Lightning stays on top — both translucent, portals untouched. */}
        <ParticleWave />
        <Lightning />
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  // No global loading gate: public routes (landing, login, map) render
  // immediately without waiting for Firebase Auth + role resolution.
  // RequireAuth shows a skeleton on protected routes while resolving.
  // Gating everything behind auth was the main "blank / slow start" cause.
  return (
    <ToastProvider>
      <DemoBanner />
      <PublicSmoothScroll />
      <PublicBackdrop />
      <div className="relative z-10">
        <Suspense fallback={<PortalFallback />}>
          <Routes>
            {/* Public — inside AppShell (landing chrome + TopNav) */}
            <Route path="/" element={<AppShell><LandingPage /></AppShell>} />
            <Route path="/login" element={<AppShell><AuthPage /></AppShell>} />
            <Route path="/login/customer" element={<AppShell><CustomerLogin /></AppShell>} />
            <Route path="/login/mechanic" element={<AppShell><MechanicLogin /></AppShell>} />
            <Route path="/signup/customer" element={<AppShell><CustomerSignup /></AppShell>} />
            <Route path="/signup/mechanic" element={<AppShell><MechanicSignup /></AppShell>} />
            <Route path="/admin/login" element={<AppShell><AdminLogin /></AppShell>} />
            <Route path="/mechanics" element={<AppShell><MechanicDirectory /></AppShell>} />
            <Route path="/forgot" element={<AppShell><ForgotPassword /></AppShell>} />
            <Route path="/map" element={<AppShell><MapPage /></AppShell>} />
            <Route path="/how-it-works" element={<AppShell><HowItWorksPage /></AppShell>} />

            {/* Customer portal — own sidebar + portal top bar */}
            <Route path="/dashboard"  element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><CustomerDashboard /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/request"    element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><RequestFlow /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/track/:id"  element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><Tracking /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/history"    element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><History /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/history/:id" element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><HistoryDetail /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/vehicles"   element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><Vehicles /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/services"   element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><Services /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/mechanics/:id" element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><MechanicDetail /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><Notifications /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/profile"    element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><Profile /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/settings"   element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><Settings /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/emergency"  element={<RequireAuth requireRole="customer"><PortalShell role="customer"><ErrorBoundary label="Customer"><Emergency /></ErrorBoundary></PortalShell></RequireAuth>} />

            {/* Mechanic portal — aqua shell */}
            <Route path="/mechanic"            element={<RequireAuth requireRole="mechanic"><PortalShell role="mechanic"><ErrorBoundary label="Mechanic"><MechanicDashboard /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/mechanic/job/:id"    element={<RequireAuth requireRole="mechanic"><PortalShell role="mechanic"><ErrorBoundary label="Mechanic"><MechanicJob /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/mechanic/history"    element={<RequireAuth requireRole="mechanic"><PortalShell role="mechanic"><ErrorBoundary label="Mechanic"><MechanicHistory /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/mechanic/profile"    element={<RequireAuth requireRole="mechanic"><PortalShell role="mechanic"><ErrorBoundary label="Mechanic"><MechanicProfilePage /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/mechanic/requests"   element={<RequireAuth requireRole="mechanic"><PortalShell role="mechanic"><ErrorBoundary label="Mechanic"><MechanicRequests /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/mechanic/notifications" element={<RequireAuth requireRole="mechanic"><PortalShell role="mechanic"><ErrorBoundary label="Mechanic"><MechanicNotifications /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/mechanic/earnings"   element={<RequireAuth requireRole="mechanic"><PortalShell role="mechanic"><ErrorBoundary label="Mechanic"><MechanicEarnings /></ErrorBoundary></PortalShell></RequireAuth>} />

            {/* Admin portal — iris shell */}
            <Route path="/admin"               element={<RequireAuth requireRole="admin" requireAdminClaim><PortalShell role="admin"><ErrorBoundary label="Admin"><AdminDashboard /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/admin/mechanics"     element={<RequireAuth requireRole="admin" requireAdminClaim><PortalShell role="admin"><ErrorBoundary label="Admin"><MechanicReview /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/admin/requests"      element={<RequireAuth requireRole="admin" requireAdminClaim><PortalShell role="admin"><ErrorBoundary label="Admin"><RequestsQueue /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/admin/users"         element={<RequireAuth requireRole="admin" requireAdminClaim><PortalShell role="admin"><ErrorBoundary label="Admin"><Users /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/admin/dispatch"      element={<RequireAuth requireRole="admin" requireAdminClaim><PortalShell role="admin"><ErrorBoundary label="Admin"><Dispatch /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/admin/analytics"     element={<RequireAuth requireRole="admin" requireAdminClaim><PortalShell role="admin"><ErrorBoundary label="Admin"><Analytics /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/admin/reports"       element={<RequireAuth requireRole="admin" requireAdminClaim><PortalShell role="admin"><ErrorBoundary label="Admin"><Reports /></ErrorBoundary></PortalShell></RequireAuth>} />
            <Route path="/admin/logs"          element={<RequireAuth requireRole="admin" requireAdminClaim><PortalShell role="admin"><ErrorBoundary label="Admin"><Logs /></ErrorBoundary></PortalShell></RequireAuth>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </ToastProvider>
  );
}