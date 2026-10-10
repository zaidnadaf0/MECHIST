/**
 * Customer registration. Required fields per Phase 4 spec:
 *   - Full Name
 *   - Email
 *   - Phone
 *   - Password
 *   - Confirm Password
 *
 * Indian-localised:
 *   - Indian names in placeholders (Aarav Sharma, Priya Iyer, …).
 *   - Phone is validated as Indian mobile (+91 / 10 digits / 6-9 lead)
 *     and normalised to "+91XXXXXXXXXX" before storage.
 *   - Currency in subsequent UI uses ₹ (handled elsewhere).
 *
 * The flow:
 *   1. If the visitor arrived from /login after a "Continue" click, the
 *      Auth account already exists and the email/password are passed
 *      through router state. We only need to capture the profile fields
 *      and write `users/{uid}.role = 'customer'`.
 *   2. If the visitor came here directly, we create the Auth account,
 *      then capture the profile fields and write the role doc.
 *
 * The password is NEVER persisted in Firestore — it lives only in
 * Firebase Auth. The page also enforces client-side rules
 * (length, match, valid Indian phone) before the call goes out.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Car, Mail, Phone, TriangleAlert, User } from 'lucide-react';
import { AuthAlert, AuthScreen, Button, Card, Input, PasswordField } from '@/components/ui';
import { useAuth } from '@/app/AuthProvider';
import { auth as fbAuth } from '@/app/firebase';
import { createCustomerUserDoc, confirmUserRoleReadable } from '@/lib/authProfile';
import {
  friendlyAuthError, isValidEmailShape, isValidIndianPhone,
  normalizeIndianPhone, INDIAN_NAMES,
} from '@/lib/authUI';

interface RouterState {
  email?: string;
  password?: string;
}

export function CustomerSignup() {
  const { signUp, signIn, signOut, user, role, configured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as RouterState;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(state.email ?? '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(state.password ?? '');
  const [confirm, setConfirm] = useState(state.password ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorBody, setErrorBody] = useState<string | null>(null);
  // Set once the Auth account + profile doc are confirmed. Navigation into
  // the portal happens from the effect below ONLY after AuthProvider has
  // delivered `user` and resolved the role — navigating any earlier races
  // onAuthStateChanged and RequireAuth bounces back to the role tiles.
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (!created) return;
    if (user && role === 'customer') {
      navigate('/dashboard', { replace: true });
    } else if (user && role !== null && role !== 'unknown') {
      navigate(role === 'mechanic' ? '/mechanic' : '/admin', { replace: true });
    } else if (user && role === null) {
      setError('Account created, but no profile was found. Please sign in.');
      setCreated(false);
    }
  }, [created, user, role, navigate]);

  // A signed-in user WITH a completed profile who lands here sees an
  // explicit handoff card (not a blank redirect). A signed-in user with NO
  // profile doc yet (mid-signup continuation, role null/unknown) still sees
  // the form so the flow can finish.
  const alreadyRegistered = Boolean(user) && role !== null && role !== 'unknown';

  const passwordsMatch = useMemo(
    () => password.length > 0 && password === confirm,
    [password, confirm],
  );

  if (alreadyRegistered) {
    return (
      <AuthScreen
        icon={<Car className="h-5 w-5" />}
        hue="azure"
        eyebrow="Customer sign-up"
        title="You're already signed in"        description="This account already has a profile. Continue to your portal, or sign out to create a different account."
        configured={configured}
        backHref="/login"
        backLabel="Back to sign-in"
      >
        <Card tone="azure" elevated>
          <div className="flex flex-col gap-3">
            <Button
              variant="primary" size="lg" fullWidth
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate(role === 'mechanic' ? '/mechanic' : role === 'admin' ? '/admin' : '/dashboard')}
            >
              Go to my portal
            </Button>
            <Button variant="ghost" size="md" fullWidth onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </Card>
      </AuthScreen>
    );
  }

  // Profile is saved; waiting for AuthProvider to deliver the user +
  // resolved role before the effect above routes into the portal.
  if (created) {
    return (
      <AuthScreen
        icon={<Car className="h-5 w-5" />}
        hue="azure"
        eyebrow="Customer sign-up"
        title="Setting up your account…"
        description="Almost there — we're confirming your profile and taking you to your dashboard."
        configured={configured}
        backHref="/login"
        backLabel="Back to sign-in"
      >
        <Card tone="azure" elevated>
          <div className="flex items-center gap-3" role="status" aria-live="polite">
            <span aria-hidden className="h-5 w-5 rounded-full border-2 border-azure-500 border-t-transparent animate-spin" />
            <span className="text-small text-fg-muted">Finishing up — this takes a few seconds.</span>
          </div>
        </Card>
      </AuthScreen>
    );
  }

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
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

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

      const ok = await createCustomerUserDoc(uid, {
        fullName,
        email,
        phone: normalizeIndianPhone(phone),
      });
      if (!ok) throw new Error('Could not save your profile. Please try again.');

      // Confirm the users/{uid} doc is readable from a fresh read before
      // we hand off to the dashboard. Closes the signup/profile race
      // (setDoc on the write connection vs. onAuthStateChanged firing
      // on a different connection / the rules `get()`).
      const confirmed = await confirmUserRoleReadable(uid, 'customer');
      if (!confirmed) throw new Error('Profile is taking longer than expected to save. Please try again in a moment.');

      // Hand off to the effect above: it navigates once AuthProvider has
      // the user + resolved role, so RequireAuth never sees a half-ready
      // auth state and bounces to the sign-in role tiles.
      setCreated(true);
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
      icon={<Car className="h-5 w-5" />}
      hue="azure"
      eyebrow="Customer account"
      title="Tell us about you"
      description="A few details so we can dispatch the right help and reach you when it matters — anywhere across India."
      configured={configured}
      backHref="/login"
      backLabel="Back to sign in"
      width="wide"
      footer={
        <>
          <p className="text-center text-xs text-fg-subtle">
            Already have an account?{' '}
            <Link to="/login" className="link-quiet">Sign in</Link>.
          </p>
          <p className="text-center text-xs text-fg-subtle">
            Staff member?{' '}
            <Link to="/admin/login" className="link-quiet">
              Open the RoadAssisst control room
            </Link>.
          </p>
        </>
      }
    >
      <Card tone="azure" elevated>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Input
            label="Full name" name="fullName" required autoComplete="name"
            placeholder={INDIAN_NAMES.customer[0]}
            icon={<User className="h-4 w-4" />}
            value={fullName} onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            type="email" label="Email" name="email" required autoComplete="email"
            placeholder="aarav.sharma@example.in"
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
            hint="10-digit Indian mobile, starting with 6–9. We will only call or SMS about active requests."
          />
          <div className="grid gap-4 sm:grid-cols-2">
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

          <div aria-live="polite" className="empty:hidden">
            {error && (
              <AuthAlert tone="danger" icon={<TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />} title={error} body={errorBody} />
            )}
          </div>

          <Button
            type="submit" variant="primary" size="lg" fullWidth loading={busy}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Create my account
          </Button>
        </form>
      </Card>
    </AuthScreen>
  );
}
