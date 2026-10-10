/**
 * Request assistance wizard. Five steps:
 *   1. Vehicle      — pick a saved vehicle (or jump to /vehicles).
 *   2. Problem      — category + free-text description.
 *   3. Location     — geolocation permission, with a map preview.
 *   4. Mechanic     — best match from the network, can be overridden.
 *   5. Confirm      — read-only summary + submit.
 *
 * Business logic is unchanged: createRequest writes to `requests/{id}`
 * with `status: 'requested'` and `offerExpiresAt = now + OFFER_WINDOW_MS`
 * so the mechanic has 2 minutes to accept. The picked mechanic, if any,
 * is persisted on the request doc; the rest of the matching is done
 * server-side by the queue.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Bike, Car, Check, MapPin, Search, Truck, Wrench,
} from 'lucide-react';
import {
  Avatar, Button, Card, IconTile, ReceiptRow, SectionShell, Stars, StatusPill, Textarea, useToast,
} from '@/components/ui';
import { EmptyState, Skeleton } from '@/components/feedback';
import { FadeIn } from '@/components/motion';
import { useAuth } from '@/app/AuthProvider';
import { useGeolocation, type GeoState } from '@/lib/geolocation';
import { ProviderMap } from '@/components/map/ProviderMap';
import { listVehicles, createRequest, OFFER_WINDOW_MS, type Vehicle } from '@/lib/customer';
import { listAllPublicMechanics } from '@/lib/public';
import type { MechanicProfile } from '@/lib/mechanic';
import { nearbyMechanics, problemCompatibility, DISPATCH_RADIUS_KM, type NearbyMechanic } from '@/lib/nearby';
import { rankMechanics, urgencyForCategory, vehicleMatchFor, type RankCandidate } from '@/lib/mlRank';
import { formatDurationLong, formatDurationShort, money } from '@/lib/format';
import { serviceById } from '@/lib/services';

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: { n: Step; title: string; hint: string; hue: 'azure' | 'aqua' | 'iris' | 'gold' }[] = [
  { n: 1, title: 'Vehicle',  hint: 'Which vehicle needs help?',            hue: 'azure' },
  { n: 2, title: 'Problem',  hint: 'What is happening?',                   hue: 'iris' },
  { n: 3, title: 'Location', hint: 'Where is the vehicle?',                hue: 'aqua' },
  { n: 4, title: 'Mechanic', hint: 'Best match from the network',         hue: 'gold' },
  { n: 5, title: 'Confirm',  hint: 'Review and submit',                    hue: 'gold' },
];

/** Offer window is server-authoritative — canonical OFFER_WINDOW_MS from `@/lib/customer`
 *  (120_000 ms = 2 minutes). Copy below derives from it so the unit can't drift. */

function vehicleIcon(type: Vehicle['type']) {
  switch (type) {
    case 'bike':  return <Bike className="h-4 w-4" />;
    case 'van':
    case 'truck': return <Truck className="h-4 w-4" />;
    case 'car':
    default:      return <Car className="h-4 w-4" />;
  }
}

export function RequestFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [step, setStep] = useState<Step>(1);
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [problemText, setProblemText] = useState('');
  const [problemCategory, setProblemCategory] = useState<string>('flat-tyre');
  const [geo, requestGeo] = useGeolocation();
  const [mechanics, setMechanics] = useState<MechanicProfile[] | null>(null);
  const [pickedMechanic, setPickedMechanic] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep links: /request?service=towing|battery|tire|fuel|lockout|winch
  // and /request?mechanic=<uid> (from Services catalogue / directory).
  useEffect(() => {
    const svc = searchParams.get('service');
    if (svc) {
      const map: Record<string, string> = { towing: 'tow', winch: 'tow', battery: 'battery', tire: 'flat-tyre', fuel: 'other', lockout: 'other' };
      const cat = map[svc] ?? 'other';
      setProblemCategory(cat);
      setProblemText((prev) => prev || `${svc} assistance needed. `);
    }
    const mech = searchParams.get('mechanic');
    if (mech) setPickedMechanic(mech);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login?mode=signin', { replace: true }); return; }
    let cancelled = false;
    listVehicles(user.uid).then((v) => {
      if (cancelled) return;
      setVehicles(v);
      if (v[0]) setVehicleId(v[0].id);
    });
    return () => { cancelled = true; };
  }, [user, navigate]);

  // Load mechanics only when step 4 is shown, to keep the early steps fast.
  useEffect(() => {
    if (step !== 4) return;
    if (mechanics !== null) return;
    let cancelled = false;
    listAllPublicMechanics(200).then((list) => { if (!cancelled) setMechanics(list); });
    return () => { cancelled = true; };
  }, [step, mechanics]);

  const rawCandidates: NearbyMechanic[] = useMemo(() => {
    if (!geo.coords || !mechanics) return [];
    return nearbyMechanics(
      { lat: geo.coords.lat, lng: geo.coords.lng },
      problemCategory,
      mechanics,
      { radiusKm: DISPATCH_RADIUS_KM },
    );
  }, [geo.coords, problemCategory, mechanics]);

  const [rankedCandidates, setRankedCandidates] = useState<NearbyMechanic[] | null>(null);
  // ML ranking (with baseline fallback) — runs when raw list or context changes
  useEffect(() => {
    if (rawCandidates.length <= 1) { setRankedCandidates(rawCandidates); return; }
    if (!geo.coords) { setRankedCandidates(rawCandidates); return; }
    let cancelled = false;
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    const vt = vehicle?.type === 'car' ? 'Sedan' : vehicle?.type === 'bike' ? 'Motorbike / Scooter' : 'Sedan';
    const toRank: RankCandidate[] = rawCandidates.map(c => ({
      mechanic: c.mechanic,
      distanceKm: c.distanceKm,
      etaMin: c.etaMin,
      specialtyMatch: problemCompatibility(problemCategory, c.mechanic.specialties) ? 1 : 0,
      vehicleMatch: vehicleMatchFor(vehicle?.type, c.mechanic.vehicleTypes),
      withinRadius: c.distanceKm <= (c.mechanic.serviceRadiusKm ?? DISPATCH_RADIUS_KM) ? 1 : 0,
    }));
    rankMechanics(toRank, { lat: geo.coords.lat, lng: geo.coords.lng }, problemCategory, vt, urgencyForCategory(problemCategory)).then(ranked => {
      if (cancelled) return;
      const order = new Map(ranked.map(r => [r.mechanic.id, r]));
      setRankedCandidates(rawCandidates.slice().sort((a,b) => {
        const ra = order.get(a.mechanic.id); const rb = order.get(b.mechanic.id);
        if (!ra || !rb) return 0;
        // preserve ML order
        const ia = ranked.findIndex(r => r.mechanic.id === a.mechanic.id);
        const ib = ranked.findIndex(r => r.mechanic.id === b.mechanic.id);
        return ia - ib;
      }));
    });
    return () => { cancelled = true; };
  }, [rawCandidates, geo.coords, problemCategory, vehicles, vehicleId]);
  const candidates = rankedCandidates ?? rawCandidates;

  if (!user) return null;

  const canNext = (): boolean => {
    if (step === 1) return Boolean(vehicleId);
    if (step === 2) return problemText.trim().length >= 5;
    if (step === 3) return geo.status === 'granted' && Boolean(geo.coords);
    return true; // step 4 best-match is pre-selected; user can override
  };

  const submit = async () => {
    if (!geo.coords) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createRequest({
        customerId: user.uid,
        vehicleId,
        problemText: problemText.trim(),
        problemCategory,
        customerLat: geo.coords.lat,
        customerLng: geo.coords.lng,
        pickedMechanicId: pickedMechanic ?? undefined,
      });
      if (!created) {
        setError('Could not create the request. Check that Firebase is configured.');
        return;
      }
      toast.push({ title: 'Request sent', description: 'We are matching you with a mechanic now.', tone: 'success' });
      navigate(`/track/${created.id}`, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  const goNext = () => setStep((s) => (s < 5 ? ((s + 1) as Step) : s));
  const current = STEPS[step - 1];
  const pickedCandidate = pickedMechanic
    ? candidates.find((c) => c.mechanic.id === pickedMechanic) ?? null
    : (candidates[0] ?? null);

  return (
    <SectionShell tone="app">
      <div className="container section-compact flex flex-col gap-8">

        {/* ---------- Header ---------- */}
        <FadeIn>
          <div className="flex flex-col gap-4">
            <div>
              <span className="eyebrow">Request assistance</span>
              <h1 className="mt-2 display text-display-md text-fg-app text-balance">
                Tell us what happened.
              </h1>
              <p className="mt-2 max-w-prose text-body text-fg-muted text-pretty">
                Five short steps. We use your location to find verified mechanics within range.
              </p>
            </div>
            <Stepper step={step} />
          </div>
        </FadeIn>

        {/* ---------- Step body ---------- */}
        <FadeIn key={step} className="w-full">
          <div className="mx-auto w-full max-w-2xl">
            <Card tone={current.hue}>
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <IconTile icon={<StepIcon step={step} />} hue={current.hue} size="md" />
                  <div className="min-w-0 flex-1">
                    <span className="eyebrow">Step {step.toString().padStart(2, '0')} of 05</span>
                    <h2 className="mt-1 text-h2 text-fg-app text-balance">{current.title}</h2>
                    <p className="mt-0.5 text-small text-fg-muted">{current.hint}</p>
                  </div>
                </div>

                {step === 1 && (
                  <StepVehicle
                    vehicles={vehicles}
                    value={vehicleId}
                    onChange={setVehicleId}
                    onManage={() => navigate('/vehicles')}
                  />
                )}
                {step === 2 && (
                  <StepProblem
                    category={problemCategory}
                    onCategory={setProblemCategory}
                    text={problemText}
                    onText={setProblemText}
                  />
                )}
                {step === 3 && (
                  <StepLocation geo={geo} requestGeo={requestGeo} />
                )}
                {step === 4 && (
                  <StepMechanic
                    mechanics={mechanics}
                    candidates={candidates}
                    value={pickedMechanic}
                    onChange={setPickedMechanic}
                    onSkip={() => setStep(5)}
                  />
                )}
                {step === 5 && (
                  <StepConfirm
                    vehicles={vehicles}
                    vehicleId={vehicleId}
                    serviceId={searchParams.get('service')}
                    problemCategory={problemCategory}
                    problemText={problemText}
                    geo={geo}
                    pickedCandidate={pickedCandidate}
                    error={error}
                    submitting={submitting}
                    onSubmit={submit}
                  />
                )}
              </div>
            </Card>
          </div>
        </FadeIn>

        {/* ---------- Nav ---------- */}
        <FadeIn>
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
            <Button
              variant="ghost"
              size="md"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={goBack}
              disabled={step === 1}
            >
              Back
            </Button>
            {step < 5 ? (
              <div className="flex flex-col items-end gap-1">
                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={goNext}
                  disabled={!canNext()}
                  aria-describedby={!canNext() ? "step-hint" : undefined}
                >
                  Continue
                </Button>
                {!canNext() && (
                  <span id="step-hint" className="text-xs text-fg-subtle">
                    {step === 1 && "Pick a vehicle to continue."}
                    {step === 2 && "Describe the problem (at least 5 characters)."}
                    {step === 3 && "Share your location to continue."}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </FadeIn>
      </div>
    </SectionShell>
  );
}

/* ---------------------------- Step components ---------------------------- */

function StepVehicle({
  vehicles, value, onChange, onManage,
}: {
  vehicles: Vehicle[] | null;
  value: string;
  onChange: (v: string) => void;
  onManage: () => void;
}) {
  if (vehicles === null) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (vehicles.length === 0) {
    return <EmptyState compact kind="vehicles" onAction={onManage} />;
  }
  return (
    <ul className="grid gap-2" aria-label="Your vehicles">
      {vehicles.map((v) => {
        const selected = v.id === value;
        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onChange(v.id)}
              aria-pressed={selected}
              className="group/row flex w-full items-center gap-3 rounded-lg border border-line-soft bg-surface-1 p-3 text-left transition-colors duration-200 ease-out-soft hover:border-line-strong hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-azure-400"
            >
              <IconTile icon={vehicleIcon(v.type)} hue={selected ? 'azure' : 'neutral'} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-body font-medium text-fg-app">{v.year} {v.make} {v.model}</div>
                <div className="text-xs text-fg-muted">{v.plate}</div>
              </div>
              <span
                aria-hidden
                className={
                  'grid h-6 w-6 place-items-center rounded-full ring-1 ring-inset ' +
                  (selected ? 'bg-azure-500 text-white ring-azure-500' : 'ring-line-strong text-transparent')
                }
              >
                <Check className="h-3.5 w-3.5" />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function StepProblem({
  category, onCategory, text, onText,
}: {
  category: string;
  onCategory: (v: string) => void;
  text: string;
  onText: (v: string) => void;
}) {
  const OPTIONS: { value: string; label: string; tone: 'azure' | 'aqua' | 'iris' | 'gold' | 'warning' }[] = [
    { value: 'flat-tyre', label: 'Flat tyre',                tone: 'warning' },
    { value: 'battery',   label: "Battery / won't start",    tone: 'aqua' },
    { value: 'engine',    label: "Engine won't start",       tone: 'iris' },
    { value: 'tow',       label: 'Tow / recovery',           tone: 'gold' },
    { value: 'other',     label: 'Other',                    tone: 'azure' },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Category</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Problem category">
          {OPTIONS.map((opt) => {
            const on = opt.value === category;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onCategory(opt.value)}
                className={
                  'rounded-full px-3.5 py-2 text-small font-mono font-medium tracking-[0.02em] ring-1 ring-inset transition-colors duration-200 ease-out-soft ' +
                  (on
                    ? 'bg-azure-500/12 text-azure-700 dark:text-azure-300 ring-azure-500/30'
                    : 'bg-hair/[0.04] text-fg-muted ring-line-soft hover:text-fg-app hover:ring-line-strong')
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <Textarea
        label="Describe what happened"
        required
        rows={4}
        placeholder="e.g. Front-left tyre is flat. I'm on the shoulder of the highway, hazard lights on."
        value={text}
        onChange={(e) => onText(e.target.value)}
        hint="A few sentences is plenty. Plain language is fine."
      />
    </div>
  );
}

function StepLocation({ geo, requestGeo }: {
  geo: GeoState;
  requestGeo: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <GeoBanner geo={geo} requestGeo={requestGeo} />
      {geo.status === 'idle' && (
        <>
          <p className="text-small text-fg-muted">
            We need your location to find mechanics nearby. Your fix is shared with the mechanic only after they accept. <span className="text-fg-subtle">Tip: allow browser location on this step for the best match.</span>
          </p>
          <div>
            <Button variant="primary" onClick={requestGeo}>
              Use my location
            </Button>
          </div>
          <p className="text-xs text-fg-subtle">Safety: if you are on a road, move to a safe spot and turn on hazard lights before sharing location.</p>
        </>
      )}
      {geo.status === 'requesting' && (
        <div className="grid gap-2" aria-hidden>
          <Skeleton className="h-12" />
          <Skeleton className="h-40" />
        </div>
      )}
      {geo.status === 'denied' && (
        <>
          <p className="text-small text-fg-muted">
            Location is blocked for this site. Open your browser's site settings (lock icon in the
            address bar), set Location to Allow, then try again — no coordinates are stored until you do.
          </p>
          <div>
            <Button variant="primary" onClick={requestGeo}>
              Try again
            </Button>
          </div>
        </>
      )}
      {(geo.status === 'unavailable' || geo.status === 'error') && (
        <>
          <p className="text-small text-fg-muted">
            {geo.status === 'unavailable'
              ? 'Geolocation is not available in this browser. Try a different browser or device — we never guess your position.'
              : `We couldn't get a GPS fix${geo.error ? `: ${geo.error}` : ''}. Move somewhere with a clearer sky view and retry.`}
          </p>
          <div>
            <Button variant="primary" onClick={requestGeo}>
              Retry location
            </Button>
          </div>
        </>
      )}
      {geo.status === 'granted' && geo.coords && (
        <>
          <p className="text-small text-fg-muted">
            {geo.coords.lat.toFixed(5)}, {geo.coords.lng.toFixed(5)} (±{Math.round(geo.coords.accuracy)} m)
          </p>
          <p className="text-xs text-fg-subtle">Distance and ETA on the next step are straight-line estimates, not road routing.</p>
          <div className="overflow-hidden rounded-xl border border-line-soft">
            <ProviderMap
              center={[geo.coords.lat, geo.coords.lng]}
              zoom={15}
              className="aspect-[16/9] w-full"
              userPosition={[geo.coords.lat, geo.coords.lng]}
              userLabel="You"
            />
          </div>
          <div>
            <Button variant="ghost" size="sm" onClick={requestGeo}>
              Refresh location
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Persistent location-status banner. The same `geo` state that gates
 * step 4 and feeds `createRequest({customerLat, customerLng})` drives
 * this banner, so what the customer sees is exactly what gets submitted.
 */
function GeoBanner({ geo, requestGeo }: { geo: GeoState; requestGeo: () => void }) {
  if (geo.status === 'idle') {
    return (
      <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-surface-1 p-3">
        <span className="text-small text-fg-muted">Location needed to find mechanics nearby.</span>
        <Button variant="secondary" size="sm" onClick={requestGeo}>Use my location</Button>
      </div>
    );
  }
  if (geo.status === 'requesting') {
    return (
      <div role="status" className="flex items-center gap-3 rounded-lg border border-azure-500/30 bg-azure-500/10 p-3">
        <span aria-hidden className="grid h-2 w-2 animate-pulse-dot rounded-full bg-azure-500" />
        <span className="text-small text-fg-app">Requesting your location… approve the browser prompt.</span>
      </div>
    );
  }
  if (geo.status === 'granted' && geo.coords) {
    return (
      <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-success-500/30 bg-success-500/10 p-3">
        <span className="flex items-center gap-2 text-small text-fg-app">
          <span aria-hidden className="grid h-2 w-2 rounded-full bg-success-500" />
          Location locked · ±{Math.round(geo.coords.accuracy)} m
        </span>
        <Button variant="ghost" size="sm" onClick={requestGeo}>Refresh</Button>
      </div>
    );
  }
  return (
    <div role="alert" className="rounded-lg border border-warning-500/30 bg-warning-500/10 p-3 text-small text-fg-app">
      {geo.status === 'denied'
        ? 'Location permission was denied — nothing was recorded.'
        : 'Location is unavailable — nothing was recorded.'}
    </div>
  );
}

function StepMechanic({
  mechanics, candidates, value, onChange, onSkip,
}: {
  mechanics: MechanicProfile[] | null;
  candidates: NearbyMechanic[];
  value: string | null;
  onChange: (v: string | null) => void;
  onSkip: () => void;
}) {
  if (mechanics === null) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          compact
          kind="mechanics"
          title="No mechanics in range right now"
          description="Your request will still go to the dispatch queue. We will notify you as soon as a verified mechanic becomes available."
          ctaLabel="Continue"
          onAction={onSkip}
        />
        <p className="text-xs text-fg-subtle text-center">
          No matching mechanics were found within ~25 km (display radius). You can still submit — the request is queued.
        </p>
      </div>
    );
  }
  const selected = value ?? candidates[0]?.mechanic.id;
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-2" aria-label="Nearby mechanics">
        {candidates.slice(0, 5).map((c) => {
          const on = c.mechanic.id === selected;
          return (
            <li key={c.mechanic.id}>
              <button
                type="button"
                onClick={() => onChange(c.mechanic.id)}
                aria-pressed={on}
                className="group/row flex w-full items-center gap-3 rounded-lg border border-line-soft bg-surface-1 p-3 text-left transition-colors duration-200 ease-out-soft hover:border-line-strong hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-azure-400"
              >
                <Avatar name={c.mechanic.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-body font-medium text-fg-app truncate">{c.mechanic.name}</div>
                  <div className="text-xs text-fg-muted truncate">
                    {c.mechanic.specialties.slice(0, 3).join(' · ') || 'General mechanic'}
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-small font-medium text-fg-app">{c.distanceKm.toFixed(1)} km</div>
                  <div className="text-xs text-fg-muted">ETA {c.etaMin} min</div>
                </div>
                {typeof c.mechanic.rating === 'number' && (
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <Stars value={c.mechanic.rating} size="xs" />
                    <span className="font-mono text-small text-fg-app">{c.mechanic.rating.toFixed(1)}</span>
                  </div>
                )}
                <span
                  aria-hidden
                  className={
                    'grid h-6 w-6 place-items-center rounded-full ring-1 ring-inset ' +
                    (on ? 'bg-azure-500 text-white ring-azure-500' : 'ring-line-strong text-transparent')
                  }
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-fg-subtle">
        Offers expire {formatDurationLong(OFFER_WINDOW_MS)} after you submit, so the mechanic can stay responsive.
      </p>
    </div>
  );
}

function StepConfirm({
  vehicles, vehicleId, serviceId, problemCategory, problemText, geo, pickedCandidate, error, submitting, onSubmit,
}: {
  vehicles: Vehicle[] | null;
  vehicleId: string;
  serviceId: string | null;
  problemCategory: string;
  problemText: string;
  geo: GeoState;
  pickedCandidate: NearbyMechanic | null;
  error: string | null;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const veh = vehicles?.find((v) => v.id === vehicleId);
  // Catalogue starting-estimate only — honestly labelled, same copy as the
  // Services page. No platform fees are invented: the final amount is set
  // by the mechanic on completion and appears on the receipt.
  const service = serviceById(serviceId);
  return (
    <div className="flex flex-col gap-4">
      <div className="eyebrow">Request receipt</div>
      <dl className="grid gap-3 text-small">
        <ReceiptRow
          label="Service"
          value={service ? service.name : problemCategory}
          icon={<Wrench className="h-3.5 w-3.5 text-fg-muted" />}
        />
        <ReceiptRow
          label="Vehicle"
          value={veh ? `${veh.year} ${veh.make} ${veh.model} — ${veh.plate}` : null}
          icon={<Car className="h-3.5 w-3.5 text-fg-muted" />}
        />
        <ReceiptRow label="Problem" value={problemText || null} icon={<Search className="h-3.5 w-3.5 text-fg-muted" />} />
        <ReceiptRow
          label="Location"
          value={geo.coords ? `${geo.coords.lat.toFixed(5)}, ${geo.coords.lng.toFixed(5)} (±${Math.round(geo.coords.accuracy)} m)` : null}
          icon={<MapPin className="h-3.5 w-3.5 text-fg-muted" />}
        />
        <ReceiptRow
          label="Mechanic"
          value={pickedCandidate
            ? `${pickedCandidate.mechanic.name} (${pickedCandidate.distanceKm.toFixed(1)} km · ETA ${pickedCandidate.etaMin} min straight-line)`
            : 'Best available (queued)'}
          icon={<Wrench className="h-3.5 w-3.5 text-fg-muted" />}
        />
        {service && (
          <ReceiptRow
            label="Starting estimate"
            value={`${money(service.basePriceInr)} onwards`}
          />
        )}
      </dl>
      <p className="text-xs text-fg-subtle">
        {service
          ? `Starting estimate from the service catalogue. The final amount is confirmed by the mechanic on completion — no hidden fees are added here.`
          : `The final amount is confirmed by the mechanic on completion and appears on your receipt.`}
      </p>

      {error && (
        <p role="alert" className="rounded-lg border border-danger-500/30 bg-danger-500/10 p-3 text-small text-danger-700 dark:text-danger-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between rounded-lg border border-line-soft bg-surface-1 p-3">
        <div>
          <div className="eyebrow">Offer window</div>
          <div className="mt-1 text-small text-fg-muted">
            {formatDurationShort(OFFER_WINDOW_MS)} for the mechanic to accept.
          </div>
        </div>
        <StatusPill status="requested" size="sm" />
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={submitting}
        onClick={onSubmit}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        Send request
      </Button>
      <p className="text-center text-xs text-fg-subtle">
        You can cancel free of charge from the tracking page while the job is still cancellable.
      </p>
    </div>
  );
}

/* ----------------------------- Bits and bobs ----------------------------- */

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((s) => {
        const done = s.n < step;
        const current = s.n === step;
        const tone = done
          ? 'bg-success-500'
          : current
            ? 'bg-azure-500'
            : 'bg-hair/30';
        return (
          <li key={s.n} className="flex flex-1 items-center gap-2" aria-current={current ? 'step' : undefined}>
            <span aria-hidden className={`h-1.5 flex-1 rounded-full ${tone}`} />
            <span className="hidden text-xs text-fg-muted md:inline">{s.title}</span>
          </li>
        );
      })}
    </ol>
  );
}

function StepIcon({ step }: { step: Step }) {
  switch (step) {
    case 1: return <Car className="h-5 w-5" />;
    case 2: return <Wrench className="h-5 w-5" />;
    case 3: return <MapPin className="h-5 w-5" />;
    case 4: return <Search className="h-5 w-5" />;
    case 5: return <Check className="h-5 w-5" />;
  }
}
