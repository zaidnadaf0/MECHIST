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
 * Landing composition. `AppShell` owns the `<main id="main">` landmark, so this
 * page must not render a second one — sections are siblings inside a fragment.
 *
 * Narrative: cinematic split hero → metric band → problem catalog → live ops
 * snapshot → 6-step process → coverage split → roster table → ranking engine
 * → realtime timeline → trust band → full-bleed close.
 */
export function LandingPage() {
  return (
    <PageTransition>
      <Hero />
      <HeroMetrics />
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
