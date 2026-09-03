/**
 * Mechanic registration. Per Phase 4 spec the form must collect:
 *   - Full name
 *   - Email
 *   - Phone (Indian mobile — validated and normalised to +91…)
 *   - Garage name
 *   - Garage address (with Indian PIN)
 *   - Specialization (multi-select)
 *   - Vehicle types served (multi-select)
 *   - Experience (years)
 *   - Service radius (km)
 *   - Availability (toggle: accepting jobs now / not currently)
 *
 * Verification lifecycle written by createMechanicUserDocs:
 *   PENDING → UNDER_REVIEW → APPROVED (or REJECTED).
 *
 * The form enforces:
 *   - `mechanics/{uid}.approved = false` (the rules will reject any
 *     client attempt to set it true).
 *   - `mechanics/{uid}.verificationStatus = 'pending'`.
 *   - No password field is ever written to Firestore.
 *   - The mechanics profile doc is gated until the user has the
 *     approved verification status — they can sign in and see their
 *     pending dashboard, but cannot accept jobs.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Building2, CheckCircle2, Mail, MapPin, Phone, Star, TriangleAlert, User, Wrench,
} from 'lucide-react';
import { AuthAlert, AuthScreen, Badge, Button, Card, Input, PasswordField } from '@/components/ui';
import { useAuth } from '@/app/AuthProvider';
import { auth as fbAuth } from '@/app/firebase';
import { createMechanicUserDocs, confirmUserRoleReadable } from '@/lib/authProfile';
import {
  friendlyAuthError, INDIAN_GARAGE_NAMES, INDIAN_NAMES,
  isValidEmailShape, isValidIndianPhone, normalizeIndianPhone, sampleIndianAddress,
} from '@/lib/authUI';

interface RouterState {
  email?: string;
  password?: string;
}

const SPECIALTIES = [
  'Battery / jump start',
  'Flat-tyre change',
  'Towing',
  'Lockout',
  'Engine diagnostics',
  'Brakes',
  'Fuel delivery (petrol / diesel)',
  'Electrical / wiring',
  'Two-wheeler repair',
  'EV charging support',
] as const;

const VEHICLE_TYPES = [
  'Hatchback',
  'Sedan',
  'SUV',
  'Pickup / Truck',
  'Motorbike / Scooter',
  'EV (electric)',
  'Tempo / Van',
  'Commercial fleet',
] as const;

export function MechanicSignup() {
  const { signUp, signIn, user, configured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as RouterState;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(state.email ?? '');
  const [phone, setPhone] = useState('');
  const [garageName, setGarageName] = useState('');
  const [garageAddress, setGarageAddress] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState(3);
  const [serviceRadiusKm, setServiceRadiusKm] = useState(15);
  const [isAvailable, setIsAvailable] = useState(true);
  const [password, setPassword] = useState(state.password ?? '');
  const [confirm, setConfirm] = useState(state.password ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorBody, setErrorBody] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate('/mechanic', { replace: true });
  }, [user, navigate]);

  const passwordsMatch = useMemo(
    () => password.length > 0 && password === confirm,
    [password, confirm],
  );

  if (user) return null;

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) => {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setErrorBody(null);

    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!isValidEmailShape(email)) { setError('Please enter a valid email address.'); return; }
    if (!isValidIndianPhone(phone)) {
      setError('Please enter a valid Indian mobile number.');
      setErrorBody('10 digits, starting with 6–9. You can add +91 or a leading 0.');
      return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!garageName.trim()) { setError('Please enter your garage / business name.'); return; }
    if (!garageAddress.trim()) { setError('Please enter your garage address.'); return; }
    if (specialties.length === 0) { setError('Pick at least one specialization.'); return; }
    if (vehicleTypes.length === 0) { setError('Pick at least one vehicle type you service.'); return; }
    if (experienceYears < 0 || experienceYears > 60) { setError('Enter a realistic years-of-experience value.'); return; }
    if (serviceRadiusKm < 1 || serviceRadiusKm > 200) { setError('Service radius must be between 1 and 200 km.'); return; }

    setBusy(true);
    try {
      const a = fbAuth();
      let uid: string | null = a?.currentUser?.uid ?? null;
      if (!uid) {
        if (state.email && state.password) {
          await signIn(state.email, state.password);
        } else {
          await signUp(email, password);
        }
        uid = fbAuth()?.currentUser?.uid ?? null;
      }
      if (!uid) throw new Error('Could not determine the signed-in user.');

      const ok = await createMechanicUserDocs(uid, {
        fullName,
        email,
        phone: normalizeIndianPhone(phone),
        garageName,
        garageAddress,
        specialties,
        vehicleTypes,
        experienceYears,
        serviceRadiusKm,
        isAvailable,
      });
      if (!ok) throw new Error('Could not save your profile. Please try again.');

      // Confirm users/{uid} is readable from a fresh read before
      // handing off to the mechanic dashboard. Closes the same
      // signup/profile race that customer signup closes.
      const confirmed = await confirmUserRoleReadable(uid, 'mechanic');
      if (!confirmed) throw new Error('Profile is taking longer than expected to save. Please try again in a moment.');

      // New mechanics land on their dashboard in the "pending review" state.
      navigate('/mechanic', { replace: true });
    } catch (err) {
      const f = friendlyAuthError(err);
      setError(f.title);
      setErrorBody(f.body ?? null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen
      icon={<Wrench className="h-5 w-5" />}
      hue="aqua"
      eyebrow="Mechanic application"
      title="Join the MECHIST mechanic network"
      description="Tell us about your garage. Profiles go through a quick admin review before you can start accepting jobs across India."
      configured={configured}
      backHref="/login"
      backLabel="Back to sign in"
      width="wide"
      between={
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-fg-muted">
          <Badge tone="info" dot>Pending review</Badge>
          <span aria-hidden>→</span>
          <Badge tone="warning" dot>Under review</Badge>
          <span aria-hidden>→</span>
          <Badge tone="success" dot>Approved</Badge>
        </div>
      }
      footer={
        <>
          <p className="text-center text-xs text-fg-subtle">
            Already an approved mechanic?{' '}
            <Link to="/login" className="link-quiet">Sign in</Link>.
          </p>
          <p className="text-center text-xs text-fg-subtle">
            Staff member?{' '}
            <Link to="/admin/login" className="link-quiet">
              Open the MECHIST control room
            </Link>.
          </p>
        </>
      }
    >
      <Card tone="aqua" elevated>
        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          {/* ---------- Account ---------- */}
          <Section icon={<User className="h-4 w-4" />} title="Account">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full name" name="fullName" required autoComplete="name"
                placeholder={INDIAN_NAMES.mechanic[0]}
                icon={<User className="h-4 w-4" />}
                value={fullName} onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                type="email" label="Email" name="email" required autoComplete="email"
                placeholder="rajesh.kumar@example.in"
                icon={<Mail className="h-4 w-4" />}
                value={email} onChange={(e) => setEmail(e.target.value)}
                readOnly={Boolean(state.email)}
                hint={state.email ? 'Carried over from your sign-up step.' : undefined}
              />
              <Input
                type="tel" label="Phone (India)" name="phone" required autoComplete="tel"
                placeholder="+91 98765 43210"
                icon={<Phone className="h-4 w-4" />}
                value={phone} onChange={(e) => setPhone(e.target.value)}
                hint="10-digit Indian mobile, starting with 6–9."
              />
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <PasswordField
                  label="Password" name="password" required minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  hint="At least 6 characters."
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordField
                  label="Confirm password" name="confirm" required minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  error={confirm.length > 0 && !passwordsMatch ? 'Passwords do not match.' : undefined}
                />
              </div>
            </div>
          </Section>

          {/* ---------- Garage ---------- */}
          <Section icon={<Building2 className="h-4 w-4" />} title="Garage">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Garage name" name="garageName" required
                placeholder={INDIAN_GARAGE_NAMES[0]}
                icon={<Building2 className="h-4 w-4" />}
                value={garageName} onChange={(e) => setGarageName(e.target.value)}
              />
              <Input
                label="Garage address" name="garageAddress" required
                placeholder={sampleIndianAddress(INDIAN_GARAGE_NAMES[0])}
                icon={<MapPin className="h-4 w-4" />}
                value={garageAddress} onChange={(e) => setGarageAddress(e.target.value)}
                className="sm:col-span-2"
                hint="Include the PIN code — it is what we verify against (and what your customers will see)."
              />
            </div>
          </Section>

          {/* ---------- Capabilities ---------- */}
          <Section icon={<Wrench className="h-4 w-4" />} title="Capabilities">
            <CheckboxGroup
              legend="Specializations"
              hint="Pick every service you can competently deliver."
              options={SPECIALTIES as readonly string[]}
              values={specialties} onToggle={(v) => toggle(specialties, setSpecialties, v)}
            />
            <CheckboxGroup
              legend="Vehicle types"
              hint="Tick each category you service."
              options={VEHICLE_TYPES as readonly string[]}
              values={vehicleTypes} onToggle={(v) => toggle(vehicleTypes, setVehicleTypes, v)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="number" name="experience" label="Years of experience" required min={0} max={60}
                icon={<Star className="h-4 w-4" />}
                value={experienceYears}
                onChange={(e) => setExperienceYears(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
              />
              <Input
                type="number" name="radius" label="Service radius (km)" required min={1} max={200}
                icon={<MapPin className="h-4 w-4" />}
                value={serviceRadiusKm}
                onChange={(e) => setServiceRadiusKm(Math.max(1, Math.min(200, Number(e.target.value) || 0)))}
              />
            </div>
          </Section>

          {/* ---------- Availability ---------- */}
          <Section icon={<CheckCircle2 className="h-4 w-4" />} title="Availability">
            <label className="flex items-start gap-3 rounded-lg border border-line-soft bg-surface-2 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-line text-brand-500 focus:ring-brand-500"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
              />
              <div>
                <div className="text-small font-medium text-fg-app">
                  I am currently accepting jobs
                </div>
                <p className="mt-1 text-xs text-fg-muted">
                  You can flip this any time from your mechanic dashboard. Mechanics who
                  opt in get prioritized for nearby requests.
                </p>
              </div>
            </label>
          </Section>

          <div aria-live="polite" className="empty:hidden">
            {error && (
              <AuthAlert tone="danger" icon={<TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />} title={error} body={errorBody} />
            )}
          </div>

          <Button
            type="submit" variant="primary" size="lg" fullWidth loading={busy}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Submit application
          </Button>

          <p className="text-center text-xs text-fg-subtle">
            By submitting you agree to MECHIST's mechanic terms and code of conduct.
          </p>
        </form>
      </Card>
    </AuthScreen>
  );
}

/* ---------------- helpers ---------------- */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-small font-medium text-fg-app">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-surface-inset text-fg-muted">{icon}</span>
        {title}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function CheckboxGroup({
  legend, hint, options, values, onToggle,
}: {
  legend: string; hint?: string;
  options: readonly string[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-small font-medium text-fg-app">{legend}</legend>
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const on = values.includes(opt);
          return (
            <label
              key={opt}
              className={
                'flex items-center gap-3 rounded-lg border p-3 transition-colors duration-200 ease-out-soft cursor-pointer ' +
                (on ? 'border-line-strong bg-surface-2' : 'border-line-soft bg-surface-1 hover:bg-surface-2')
              }
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-line text-brand-500 focus:ring-brand-500"
                checked={on}
                onChange={() => onToggle(opt)}
              />
              <span className="text-small text-fg-app">{opt}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
