import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from './useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Wires up Lenis smooth scrolling at the document level and tells GSAP
 * ScrollTrigger to read scroll position from Lenis so they don't fight
 * each other. Honours prefers-reduced-motion: Lenis is disabled
 * (native scroll restored) and ScrollTrigger still works, just instantly.
 */
export function useSmoothScroll(enabled = true) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!enabled || reduced) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
    });

    // Pump Lenis into the GSAP ticker so ScrollTrigger gets smooth updates.
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Lenis → ScrollTrigger sync.
    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    // Refresh after layout settles (hero canvas, fonts, etc.)
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 250);

    return () => {
      window.clearTimeout(t);
      gsap.ticker.remove(tick);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [reduced, enabled]);
}
