/**
 * MECHIST — TopNav.
 *
 * Premium top navigation. Mobile-first with a role-aware primary CTA.
 *
 * Information architecture (three zones):
 *   - Product: Find assistance / Track / Mechanic network
 *   - Operations: Customer / Mechanic / Admin (role-dependent)
 *   - About: How it works / Trust
 *
 * The primary CTA changes with role:
 *   - guest   → "Get Assistance"   (→ /request)
 *   - customer → "Dashboard"      (→ /dashboard)
 *   - mechanic → "Open portal"    (→ /mechanic)
 *   - admin   → "Control room"   (→ /admin)
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  Activity,
  ChevronRight,
  Menu,
  Radar,
  ShieldCheck,
  Truck,
  Users2,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { LogoMark } from '@/components/illustrations/Illustrations';
import { useTheme } from '@/app/ThemeProvider';
import { useAuth, type AppRole } from '@/app/AuthProvider';
import { cx } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon?: ReactNode;
}

const roleHue = {
  customer: { tone: 'azure' as const, label: 'Customer' },
  mechanic: { tone: 'aqua' as const, label: 'Mechanic' },
  admin: { tone: 'iris' as const, label: 'Admin' },
};

const publicLinks: NavItem[] = [
  { to: '/', label: 'Overview', icon: <Activity size={12} aria-hidden /> },
  { to: '/#how-it-works', label: 'How it works', icon: <Radar size={12} aria-hidden /> },
  { to: '/mechanics', label: 'Network', icon: <Users2 size={12} aria-hidden /> },
  { to: '/#trust', label: 'Trust', icon: <ShieldCheck size={12} aria-hidden /> },
];

const customerLinks: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <Activity size={12} aria-hidden /> },
  { to: '/vehicles', label: 'Vehicles', icon: <Truck size={12} aria-hidden /> },
  { to: '/history', label: 'History', icon: <Activity size={12} aria-hidden /> },
];

const mechanicLinks: NavItem[] = [
  { to: '/mechanic', label: 'Jobs', icon: <Radar size={12} aria-hidden /> },
  { to: '/mechanic/history', label: 'History', icon: <Activity size={12} aria-hidden /> },
  { to: '/mechanic/profile', label: 'Profile', icon: <ShieldCheck size={12} aria-hidden /> },
];

const adminLinks: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: <Activity size={12} aria-hidden /> },
  { to: '/admin/requests', label: 'Requests', icon: <Radar size={12} aria-hidden /> },
  { to: '/admin/mechanics', label: 'Mechanics', icon: <Users2 size={12} aria-hidden /> },
  { to: '/admin/users', label: 'Users', icon: <Users2 size={12} aria-hidden /> },
];

function linksForRole(role: AppRole | 'unknown', signedIn: boolean): NavItem[] {
  if (!signedIn) return publicLinks;
  if (role === 'mechanic') return mechanicLinks;
  if (role === 'admin')    return adminLinks;
  if (role === 'customer') return customerLinks;
  return publicLinks;
}

function primaryCtaForRole(role: AppRole | 'unknown'): { to: string; label: string } {
  if (role === 'mechanic') return { to: '/mechanic', label: 'Open portal' };
  if (role === 'admin')    return { to: '/admin', label: 'Control room' };
  return { to: '/request', label: 'Get assistance' };
}

export function TopNav() {
  const { theme, toggle } = useTheme();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });

  const signedIn = Boolean(user);
  const links = linksForRole(role, signedIn);
  const primaryCta = primaryCtaForRole(role);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const primaryVariant: 'primary' | 'live' | 'iris' =
    role === 'mechanic' ? 'live' : role === 'admin' ? 'iris' : 'primary';

  return (
    <header
      className={cx(
        'sticky top-0 z-40 w-full border-b transition-[background-color,border-color,backdrop-filter] duration-300 ease-out-soft',
        scrolled ? 'border-line-soft bg-surface-app/80 backdrop-blur-xl' : 'border-transparent bg-transparent',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-2.5" aria-label="MECHIST home">
          <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-lg ring-1 ring-inset ring-line-soft">
            <LogoMark className="h-full w-full" />
          </span>
          <span className="display text-h3 font-bold tracking-[-0.03em] text-fg-app">MECHIST</span>
          <Badge tone="neutral" size="sm" className="hidden md:inline-flex">v0.1</Badge>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex">
          {links.map((l) => (
            <NavItem key={l.to} to={l.to}>
              <span className="inline-flex items-center gap-1.5">
                {l.icon}
                {l.label}
              </span>
            </NavItem>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {role && role !== 'unknown' && user && (
            <Badge tone={roleHue[role]?.tone ?? 'neutral'} dot className="mr-1">
              {roleHue[role]?.label ?? role}
            </Badge>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="grid h-10 w-10 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-hair/[0.07] hover:text-fg-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure-400/60"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="grid place-items-center"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </motion.span>
            </AnimatePresence>
          </button>
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign in
            </Button>
          )}
          <Button
            variant={primaryVariant}
            size="sm"
            rightIcon={<ChevronRight size={16} />}
            onClick={() => navigate(primaryCta.to)}
          >
            {primaryCta.label}
          </Button>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg text-fg-app transition-colors hover:bg-hair/[0.07] md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure-400/60"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* scroll progress — the only always-on motion in the chrome */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-azure-500 via-iris-500 to-aqua-400"
      />

      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line-soft bg-surface-app/95 backdrop-blur-xl md:hidden"
          >
            <div className="container flex flex-col gap-1 py-5">
              {links.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.24 }}
                >
                  <NavLink
                    to={l.to}
                    className="flex items-center justify-between rounded-lg px-1 py-2.5 text-body text-fg-app"
                  >
                    <span className="inline-flex items-center gap-2">
                      {l.icon}
                      {l.label}
                    </span>
                    <ChevronRight size={16} className="text-fg-subtle" />
                  </NavLink>
                </motion.div>
              ))}
              <div className="my-3 hairline" />
              <button
                onClick={toggle}
                className="py-2 text-left text-small text-fg-muted"
              >
                Switch to {theme === 'dark' ? 'light' : 'dark'} theme
              </button>
              <div className="mt-2 flex flex-col gap-2">
                {user ? (
                  <Button variant="secondary" fullWidth onClick={() => void signOut()}>
                    Sign out
                  </Button>
                ) : (
                  <Button variant="secondary" fullWidth onClick={() => navigate('/login')}>
                    Sign in
                  </Button>
                )}
                <Button
                  variant={primaryVariant}
                  fullWidth
                  rightIcon={<ChevronRight size={16} />}
                  onClick={() => navigate(primaryCta.to)}
                >
                  {primaryCta.label}
                </Button>
              </div>
              {role && role !== 'unknown' && user && (
                <div className="pt-3">
                  <Badge tone={roleHue[role]?.tone ?? 'neutral'} dot>
                    {roleHue[role]?.label ?? role}
                  </Badge>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'relative px-3 py-2 text-small transition-colors duration-200',
          isActive ? 'text-fg-app' : 'text-fg-muted hover:text-fg-app',
        )
      }
    >
      {({ isActive }) => (
        <>
          {children}
          <span
            aria-hidden
            className={cx(
              'absolute inset-x-3 -bottom-0.5 h-px origin-left bg-gradient-to-r from-azure-500 to-iris-500 transition-transform duration-300 ease-out-soft',
              isActive ? 'scale-x-100' : 'scale-x-0',
            )}
          />
        </>
      )}
    </NavLink>
  );
}