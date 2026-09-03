import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from './useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

type Stagger = {
  /** CSS selector for items to stagger within the container. */
  selector?: string;
  /** Stagger delay in seconds. */
  delay?: number;
  /** Y offset to slide from. */
  y?: number;
};

/**
 * Generic scroll-triggered reveal. The container fades in, and any
 * children matching `stagger.selector` slide up sequentially. Honours
 * prefers-reduced-motion.
 */
export function ScrollRevealSection({
  children,
  className,
  stagger,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: Stagger;
  as?: 'div' | 'section' | 'article' | 'header' | 'footer';
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      gsap.set(el, { opacity: 1, y: 0 });
      if (stagger?.selector) {
        gsap.set(el.querySelectorAll(stagger.selector), { opacity: 1, y: 0 });
      }
      return;
    }
    const ctx = gsap.context(() => {
      gsap.from(el, {
        opacity: 0,
        y: 24,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
      if (stagger?.selector) {
        gsap.from(el.querySelectorAll(stagger.selector), {
          opacity: 0,
          y: stagger.y ?? 30,
          duration: 0.7,
          ease: 'power3.out',
          stagger: stagger.delay ?? 0.08,
          scrollTrigger: {
            trigger: el,
            start: 'top 82%',
            toggleActions: 'play none none reverse',
          },
        });
      }
    }, el);
    return () => ctx.revert();
  }, [reduced, stagger?.selector, stagger?.delay, stagger?.y]);

  const Comp = Tag as 'div';
  return (
    <Comp ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      {children}
    </Comp>
  );
}
