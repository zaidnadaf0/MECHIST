import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button, useToast } from '@/components/ui';
import { ErrorState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { getMechanicProfile, setAvailability, type MechanicProfile } from '@/lib/mechanic';

export function MechanicProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState<MechanicProfile | null | 'loading'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    getMechanicProfile(user.uid)
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch((e: unknown) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setLoadError(msg || 'Could not load profile');
          setProfile(null);
        }
      });
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (!user) return null;
  if (profile === 'loading') return <main className="container section-compact"><Skeleton className="h-40" /></main>;
  if (profile === null) {
    if (loadError) return (
      <main className="container section-compact">
        <ErrorState kind="api" title="Could not load profile" description={loadError} retryLabel="Retry" onRetry={() => location.reload()} />
      </main>
    );
    return (
      <main className="container section-compact">
        <ErrorState kind="empty-results" title="No profile" description="An admin must approve your application first." />
      </main>
    );
  }

  const toggle = async () => {
    setBusy(true);
    const ok = await setAvailability(user.uid, !profile.isAvailable);
    setBusy(false);
    if (ok) {
      setProfile({ ...profile, isAvailable: !profile.isAvailable });
      toast.push({ title: profile.isAvailable ? 'Offline' : 'Available', tone: 'info' });
    } else {
      toast.push({ title: 'Could not update availability', description: 'Check your connection and try again.', tone: 'danger' });
    }
  };

  return (
    <main className="container section-compact">
      <FadeIn>
        <div className="text-xs uppercase tracking-wider text-fg-muted">Profile</div>
        <h1 className="mt-2 display text-display-md text-fg-app">{profile.name}</h1>
      </FadeIn>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-h2 text-fg-app">Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Email"   value={user.email ?? '—'} />
            <Field label="Phone"   value={profile.phone ?? '—'} />
            <Field label="Vehicle" value={profile.vehicleDescription ?? '—'} />
            <Field label="Approved" value={profile.approved ? 'Yes' : 'Pending review'} />
            <div className="sm:col-span-2">
              <div className="text-xs uppercase tracking-wider text-fg-muted">Specialties</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.specialties.length === 0 ? (
                  <span className="text-small text-fg-muted">None listed.</span>
                ) : profile.specialties.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="text-h2 text-fg-app">Availability</h2>
          <p className="mt-2 text-small text-fg-muted">Going offline hides you from the live queue.</p>
          <div className="mt-4">
            <Button variant={profile.isAvailable ? 'secondary' : 'primary'} fullWidth loading={busy} onClick={toggle}>
              {profile.isAvailable ? 'Go offline' : 'Go available'}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-fg-muted">{label}</div>
      <div className="mt-1 text-fg-app">{value}</div>
    </div>
  );
}
