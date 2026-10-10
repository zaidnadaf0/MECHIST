import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Button, Card, SectionShell, Stars, StatusPill } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { db } from '@/app/firebase';
import type { MechanicProfile } from '@/lib/mechanic';

export function MechanicDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<MechanicProfile | null | undefined>(undefined);

  useEffect(() => {
    if (!id) { setItem(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const h = db();
        if (!h) { if (!cancelled) setItem(null); return; }
        const snap = await getDoc(doc(h, 'mechanics', id));
        if (!cancelled) setItem(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<MechanicProfile, 'id'>) }) : null);
      } catch { if (!cancelled) setItem(null); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-6">
        <div className="text-xs uppercase tracking-wider text-fg-muted">Mechanic</div>
        {item === undefined ? <Skeleton className="h-40" />
          : item === null ? <EmptyState kind="mechanics" onAction={() => navigate('/mechanics')} />
          : (
            <Card tone="azure" elevated>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="display text-display-sm text-fg-app">{item.name}</h1>
                    <p className="text-small text-fg-muted">{item.garageName ?? 'Independent mechanic'}{item.garageAddress ? ` · ${item.garageAddress}` : ''}</p>
                  </div>
                  <StatusPill status={item.isAvailable ? 'accepted' : 'requested'} size="sm" />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-fg-muted">
                  {(item.specialties ?? []).map((s) => <span key={s} className="rounded-full border border-line-soft px-2.5 py-1">{s}</span>)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-small text-fg-muted">
                  {typeof item.rating === 'number' ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Stars value={item.rating} size="xs" /> {item.rating.toFixed(1)}
                    </span>
                  ) : (
                    <span>New on network</span>
                  )}
                  {typeof item.reviewCount === 'number' ? <span>({item.reviewCount})</span> : null}
                  {typeof item.experienceYears === 'number' ? <span>· {item.experienceYears}y exp</span> : null}
                  {typeof item.serviceRadiusKm === 'number' ? <span>· {item.serviceRadiusKm}km radius</span> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="md" onClick={() => navigate(`/request?mechanic=${item.id}`)}>Request this mechanic</Button>
                  <Link to="/mechanics"><Button variant="secondary" size="md">All mechanics</Button></Link>
                </div>
                {!item.approved && <p className="text-xs text-fg-subtle">Note: this profile is pending verification. Requests route only to approved mechanics.</p>}
              </div>
            </Card>
          )}
      </div>
    </SectionShell>
  );
}
