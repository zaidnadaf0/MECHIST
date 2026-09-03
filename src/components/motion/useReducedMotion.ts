import { useEffect, useState } from 'react';

/**
 * MECHIST's motion is intentional. We force this hook to always
 * return `false` so every consumer renders the animated path. The
 * `matchMedia` override in `index.html` is the primary fix (it
 * covers framer-motion's `useReducedMotion` too); this hook is the
 * belt-and-braces for the in-house components that import it
 * directly.
 *
 * When a user-facing "reduce motion" toggle ships, flip the
 * initial state back to a `matchMedia` read in one line.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced] = useState<boolean>(false);

  useEffect(() => {
    // Keep the listener installed so a future toggle can re-enable
    // the dynamic path without changing this file's shape.
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      // intentionally a no-op while the feature is forced on
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
