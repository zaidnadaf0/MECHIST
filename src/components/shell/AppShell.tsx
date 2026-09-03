/**
 * MECHIST — AppShell.
 *
 * Wraps every route. Owns:
 *   - Skip-to-content link (a11y)
 *   - TopNav
 *   - <main> landmark
 *   - Footer
 *
 * Routes are responsible for their own background, scroll-restoration, and
 * page transitions. AppShell only handles what is identical across the app.
 */
import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Footer } from './Footer';

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  /* new route → back to the top, without fighting the smooth-scroll rig */
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface-1 focus:px-4 focus:py-2 focus:text-small focus:shadow-pop"
      >
        Skip to content
      </a>

      <TopNav />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}