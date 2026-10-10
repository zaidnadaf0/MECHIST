import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, Card, IconTile, SectionHeading, SectionShell } from '@/components/ui';
import { ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { SERVICES, serviceCategoryFor } from '@/lib/services';
import { watchPublicMechanics } from '@/lib/public';
import { problemCompatibility } from '@/lib/nearby';
import type { MechanicProfile } from '@/lib/mechanic';

export function Services() {
  const navigate = useNavigate();
  // Realtime roster of approved + available mechanics (rules-gated).
  // Shared shape with the request flow's candidate list; without the
  // customer's location here we count specialty-compatible mechanics
  // rather than in-radius ones, and label it honestly.
  const [mechanics, setMechanics] = useState<MechanicProfile[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const unsub = watchPublicMechanics(
      200,
      (list) => { setMechanics(list); setLoadError(false); },
      () => { setMechanics([]); setLoadError(true); },
    );
    return () => { unsub?.(); };
  }, []);

  const counts = useMemo(() => {
    if (!mechanics) return null;
    const out = new Map<string, number>();
    for (const s of SERVICES) {
      const cat = serviceCategoryFor(s.id);
      out.set(s.id, mechanics.filter((m) => problemCompatibility(cat, m.specialties)).length);
    }
    return out;
  }, [mechanics]);

  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-8">
        <FadeIn>
          <SectionHeading
            as="h1"
            size="sm"
            eyebrow="Services"
            title="Request help"
            description="Pick a service to start a request. Final assignment and ETA come from live mechanics — prices below are starting estimates."
          />
        </FadeIn>
        {loadError && (
          <ErrorState
            kind="api" title="Could not load availability"
            description="Service details are below, but live mechanic counts are unavailable. Check your connection."
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Card key={s.id} interactive onClick={() => navigate(`/request?service=${s.id}`)}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <IconTile icon={<span className="text-lg font-bold">{s.name.slice(0, 1)}</span>} hue="azure" size="md" />
                  <span className="text-xs text-fg-muted">from ₹{s.basePriceInr} · ~{s.etaMin} min</span>
                </div>
                <div className="text-body font-medium text-fg-app">{s.name}</div>
                <p className="text-small text-fg-muted">{s.blurb}</p>
                <div className="text-xs text-fg-subtle" aria-live="polite">
                  {counts === null ? (
                    <Skeleton className="inline-block h-4 w-32" />
                  ) : (() => {
                    const n = counts.get(s.id) ?? 0;
                    return n === 0
                      ? 'No mechanics available right now — requests still queue.'
                      : `${n} mechanic${n === 1 ? '' : 's'} available`;
                  })()}
                </div>
                <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate(`/request?service=${s.id}`)}>
                  Start request
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <p className="text-center text-xs text-fg-subtle">
          Prefer browsing people first? <Link to="/mechanics" className="link-quiet">Find a mechanic →</Link>
        </p>
      </div>
    </SectionShell>
  );
}
