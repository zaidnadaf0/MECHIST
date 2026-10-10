import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Button, Card, Input, SectionHeading, SectionShell } from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useAuth } from '@/app/AuthProvider';
import { db } from '@/app/firebase';
import { useToast } from '@/components/ui';

export function Profile() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    (async () => {
      try {
        const h = db();
        if (!h) { if (!cancelled) setLoading(false); return; }
        const snap = await getDoc(doc(h, 'users', user.uid));
        if (!cancelled && snap.exists()) {
          const d = snap.data() as { fullName?: string; phone?: string };
          setFullName(d.fullName ?? '');
          setPhone(d.phone ?? '');
        }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (!user) return null;
  if (loading) return <SectionShell tone="app"><div className="container section-compact"><Skeleton className="h-48" /></div></SectionShell>;

  return (
    <SectionShell tone="app">
      <div className="container section-compact flex max-w-xl flex-col gap-6">
        <SectionHeading as="h1" size="sm" eyebrow="Account" title="Profile" description="Only your own profile. Role changes require an admin." />
        {user.email ? <Card><div className="text-small text-fg-muted">Signed in as</div><div className="text-body font-medium text-fg-app">{user.email}</div></Card>
          : <EmptyState kind="generic" title="No profile" description="Sign-in details will appear here." />}
        <Card>
          <div className="text-small text-fg-muted">Your UID (send this to support to check your role)</div>
          <div className="mt-1 select-all font-mono text-small text-fg-app">{user.uid}</div>
          <div className="mt-1 text-small text-fg-muted">Role: <span className="font-medium text-fg-app">{role ?? 'none — no users doc yet'}</span></div>
        </Card>
        <Card>
          <div className="flex flex-col gap-3">
            <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
            <Button
              variant="primary" size="md" loading={saving}
              onClick={() => {
                if (!fullName.trim()) { toast.push({ title: 'Name required', tone: 'danger' }); return; }
                setSaving(true);
                (async () => {
                  try {
                    const h = db();
                    if (!h) throw new Error('no db');
                    await updateDoc(doc(h, 'users', user.uid), { fullName: fullName.trim(), phone: phone.trim() || null, updatedAt: serverTimestamp() });
                    toast.push({ title: 'Profile saved', tone: 'success' });
                  } catch { toast.push({ title: 'Could not save', tone: 'danger' }); }
                  finally { setSaving(false); }
                })();
              }}
            >
              Save
            </Button>
          </div>
        </Card>
      </div>
    </SectionShell>
  );
}
