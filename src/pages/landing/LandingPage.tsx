import {
  Hero,
  HeroMetrics,
  Problems,
  OperationsSnapshot,
  HowItWorks,
  LocationSection,
  MechanicNetwork,
  IntelligentMatching,
  RealtimeAssistance,
  Trust,
  FinalCTA,
} from './section';
import { PageTransition } from '@/components/motion';

/**
 * Landing composition — 11-section honest narrative. `AppShell` owns
 * `<main id="main">` so this page must not render a second one.
 *
 * Each section id is stable and used by in-page links; reorder only
 * if there is a new narrative reason.
 */
export function LandingPage() {
  return (
    <PageTransition>
      <Hero />
      <HeroMetrics />
      {/* 3 - 11: narrative body */}
      <Problems />
      <OperationsSnapshot />
      <HowItWorks />
      <LocationSection />
      <MechanicNetwork />
      <IntelligentMatching />
      <RealtimeAssistance />
      <Trust />
      <FinalCTA />
    </PageTransition>
  );
}
