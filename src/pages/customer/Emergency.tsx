import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, Card, Input, SectionHeading, SectionShell } from '@/components/ui';
import { EmptyState } from '@/components/feedback';

interface Contact { id: string; name: string; phone: string; locked?: boolean; }
const KEY = 'mechist.emergency.v1';

function load(): Contact[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Contact[];
  } catch { /* ignore */ }
  return [{ id: 'c-112', name: 'Emergency (112)', phone: '112', locked: true }];
}
function save(items: Contact[]) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ } }

export function Emergency() {
  const [items, setItems] = useState<Contact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => { setItems(load()); }, []);
  useEffect(() => { save(items); }, [items]);

  const shareLocation = () => {
    if (!navigator.geolocation) { setShareMsg('Geolocation is not available in this browser.'); return; }
    setSharing(true);
    setShareMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSharing(false);
        const text = `I need help. My location: https://www.openstreetmap.org/?mlat=${pos.coords.latitude.toFixed(5)}&mlon=${pos.coords.longitude.toFixed(5)}#map=16/${pos.coords.latitude.toFixed(5)}/${pos.coords.longitude.toFixed(5)}`;
        const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> };
        if (nav.share) {
          nav.share({ title: 'RoadAssisst — my location', text }).catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(
            () => setShareMsg('Location link copied — paste it to your contact.'),
            () => setShareMsg('Could not copy. Your coordinates are on the request tracking page.'),
          );
        } else {
          setShareMsg('Sharing is not available — read your coordinates from the tracking page.');
        }
      },
      () => { setSharing(false); setShareMsg('Could not get a GPS fix. Allow location and try again.'); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <SectionShell tone="app">
      <div className="container section-compact flex max-w-xl flex-col gap-6">
        <SectionHeading as="h1" size="sm" eyebrow="Safety" title="Emergency contacts" description="Stored only on this device. 112 cannot be removed." />
        <Card tone="gold" elevated>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-body font-medium text-fg-app">Need a mechanic right now?</div>
              <p className="mt-0.5 max-w-prose text-small text-fg-muted">
                This sends a real assistance request into the live dispatch queue — the same flow as Request Help.
              </p>
            </div>
            <Link to="/request">
              <Button variant="danger" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Request emergency help
              </Button>
            </Link>
          </div>
        </Card>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-small text-fg-muted">Send your live GPS position to a trusted contact.</div>
            <Button variant="primary" size="sm" loading={sharing} onClick={shareLocation}>Share my location</Button>
          </div>
          {shareMsg && <p role="status" className="mt-3 text-small text-fg-muted">{shareMsg}</p>}
        </Card>
        {items.length === 0 ? <EmptyState kind="generic" title="No emergency contacts" description="Add a trusted contact. 112 is always available by phone." /> : (
          <div className="grid gap-3">
            {items.map((c) => (
              <Card key={c.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-body font-medium text-fg-app">{c.name}</div>
                    <a className="text-small text-azure-600" href={`tel:${c.phone}`}>{c.phone}</a>
                  </div>
                  {!c.locked && <Button variant="ghost" size="sm" onClick={() => setItems((p) => p.filter((x) => x.id !== c.id))}>Remove</Button>}
                </div>
              </Card>
            ))}
          </div>
        )}
        <Card>
          <div className="flex flex-col gap-3">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Family member" />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
            <Button
              variant="secondary" size="md"
              onClick={() => {
                if (!name.trim() || !phone.trim()) return;
                setItems((p) => [...p, { id: `c-${Date.now()}`, name: name.trim(), phone: phone.trim() }]);
                setName(''); setPhone('');
              }}
            >
              Add contact
            </Button>
          </div>
        </Card>
      </div>
    </SectionShell>
  );
}
