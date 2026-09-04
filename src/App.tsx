import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { AppShell } from '@/components/shell';
import { ErrorBoundary, Skeleton } from '@/components/feedback';
import { Lightning } from '@/components/effects';
import { useSmoothScroll } from '@/components/motion';
import { useAuth, type AppRole } from '@/app/AuthProvider';
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

const MechanicDashboard   = lazy(() => import('@/pages/mechanic/MechanicDashboard').then((m) => ({ default: m.MechanicDashboard })));
const MechanicJob         = lazy(() => import('@/pages/mechanic/MechanicJob').then((m) => ({ default: m.MechanicJob })));
const MechanicHistory     = lazy(() => import('@/pages/mechanic/MechanicHistory').then((m) => ({ default: m.MechanicHistory })));
const MechanicProfilePage = lazy(() => import('@/pages/mechanic/MechanicProfilePage').then((m) => ({ default: m.MechanicProfilePage })));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const MechanicReview = lazy(() => import('@/pages/admin/MechanicReview').then((m) => ({ default: m.MechanicReview })));
const RequestsQueue  = lazy(() => import('@/pages/admin/RequestsQueue').then((m) => ({ default: m.RequestsQueue })));
const Users          = lazy(() => import('@/pages/admin/Users').then((m) => ({ default: m.Users })));

/** Where a signed-in user with role X should land by default. */
function homeForRole(role: AppRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'mechanic') return '/mechanic';
  if (role === 'customer') return '/dashboard';
  return '/';
}

function RequireAuth({ children, requireRole }: { children: ReactNode; requireRole?: AppRole }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PortalFallback />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  // While the role is still being resolved (`'unknown'`) we hold the
  // route render with the same skeleton the lazy chunk uses. The
  // previous `return null` here produced a literally blank page during
  // the signup/profile-write race and during refresh-on-protected-route
  // before AuthProvider's onAuthStateChanged callback resolved.
  // Rendering the skeleton keeps the layout stable and signals that we
  // are still working, without bypassing any role guard.
  if (role === 'unknown') return <PortalFallback />;
  // If a role is required, gate the route. The dev role fallback still
  // works for users without a Firestore doc; the canonical check is the
  // resolved `role` from AuthProvider.
  if (requireRole && role !== requireRole) {
    return <Navigate to={homeForRole(role)} replace />;
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

export default function App() {
  useSmoothScroll();
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center text-fg-muted">
        <div className="flex items-center gap-3 text-small">
          <span aria-hidden className="h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          Loading MECHIST…
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary label="Background">
        <Lightning />
      </ErrorBoundary>
      <div className="relative z-10">
      <AppShell>
        <Suspense fallback={<PortalFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/login/customer" element={<CustomerLogin />} />
            <Route path="/login/mechanic" element={<MechanicLogin />} />
            <Route path="/signup/customer" element={<CustomerSignup />} />
            <Route path="/signup/mechanic" element={<MechanicSignup />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/mechanics" element={<MechanicDirectory />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />

            <Route path="/dashboard"  element={<RequireAuth requireRole="customer"><ErrorBoundary label="Customer"><CustomerDashboard /></ErrorBoundary></RequireAuth>} />
            <Route path="/request"    element={<RequireAuth requireRole="customer"><ErrorBoundary label="Customer"><RequestFlow /></ErrorBoundary></RequireAuth>} />
            <Route path="/track/:id"  element={<RequireAuth><ErrorBoundary label="Customer"><Tracking /></ErrorBoundary></RequireAuth>} />
            <Route path="/history"    element={<RequireAuth requireRole="customer"><ErrorBoundary label="Customer"><History /></ErrorBoundary></RequireAuth>} />
            <Route path="/vehicles"   element={<RequireAuth requireRole="customer"><ErrorBoundary label="Customer"><Vehicles /></ErrorBoundary></RequireAuth>} />

            <Route path="/mechanic"            element={<RequireAuth requireRole="mechanic"><ErrorBoundary label="Mechanic"><MechanicDashboard /></ErrorBoundary></RequireAuth>} />
            <Route path="/mechanic/job/:id"    element={<RequireAuth requireRole="mechanic"><ErrorBoundary label="Mechanic"><MechanicJob /></ErrorBoundary></RequireAuth>} />
            <Route path="/mechanic/history"    element={<RequireAuth requireRole="mechanic"><ErrorBoundary label="Mechanic"><MechanicHistory /></ErrorBoundary></RequireAuth>} />
            <Route path="/mechanic/profile"    element={<RequireAuth requireRole="mechanic"><ErrorBoundary label="Mechanic"><MechanicProfilePage /></ErrorBoundary></RequireAuth>} />

            <Route path="/admin"               element={<RequireAuth requireRole="admin"><ErrorBoundary label="Admin"><AdminDashboard /></ErrorBoundary></RequireAuth>} />
            <Route path="/admin/mechanics"     element={<RequireAuth requireRole="admin"><ErrorBoundary label="Admin"><MechanicReview /></ErrorBoundary></RequireAuth>} />
            <Route path="/admin/requests"      element={<RequireAuth requireRole="admin"><ErrorBoundary label="Admin"><RequestsQueue /></ErrorBoundary></RequireAuth>} />
            <Route path="/admin/users"         element={<RequireAuth requireRole="admin"><ErrorBoundary label="Admin"><Users /></ErrorBoundary></RequireAuth>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      </div>
    </ToastProvider>
  );
}