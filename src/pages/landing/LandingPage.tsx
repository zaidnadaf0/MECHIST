import {
  Hero,
  HeroMetrics,
  Problems,
  OperationsSnapshot,
  HowItWorks,
  NearbyCTA,
  LocationSection,
  MechanicNetwork,
  IntelligentMatching,
  RealtimeAssistance,
  Trust,
  FinalCTA,
} from './section';
import { PageTransition } from '@/components/motion';

/**
 * Landing composition — 12-section honest narrative. `AppShell` owns
 * `<main id="main">` so this page must not render a second one.
 *
 * Each section id is stable and used by in-page links; reorder only
 * if there is a new narrative reason. No GPS is requested here —
 * location discovery lives on /map.
 */
export function LandingPage() {
  return (
    <PageTransition>
      <Hero />
      <HeroMetrics />
      <Problems />
      <OperationsSnapshot />
      <HowItWorks />
      <NearbyCTA />
      <LocationSection />
      <MechanicNetwork />
      <IntelligentMatching />
      <RealtimeAssistance />
      <Trust />
      <FinalCTA />
    </PageTransition>
  );
}
