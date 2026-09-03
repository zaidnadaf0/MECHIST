/**
 * Customer sign-in. Email + password only, with a clear path to the
 * customer registration flow and the Forgot-password flow.
 *
 * The role-aware post-login redirect is the fix for the brief's
 * "login is currently not completing" symptom: we wait for
 * AuthProvider to resolve the role (it reads `users/{uid}.role`)
 * before navigating to `/dashboard`. That closes the race where a
 * successful sign-in lands the user on `/` (the public landing page)
 * because the role was still 'unknown'.
 *
 * Cross-portal guard: if a non-customer account signs in here (e.g.
 * a mechanic or admin), the role resolution returns the wrong value
 * and we surface a clear error instead of letting them into the
 * customer portal. The same applies to admin — admin must use
 * `/admin/login` because that is where the custom-claim check runs.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Car, Mail, ShieldAlert, TriangleAlert } from 'lucide-react';
import { AuthAlert, AuthScreen, Button, Card, Input, PasswordField } from '@/components/ui';
import { useAuth } from '@/app/AuthProvider';
import { auth as fbAuth } from '@/app/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { friendlyAuthError, isValidEmailShape } from '@/lib/authUI';

export function CustomerLogin() {
  const { signIn, user, role, configured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorBody, setErrorBody] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [wrongPortal, setWrongPortal] = useState<'mechanic' | 'admin' | null>(null);

  // If the user is already signed in AND the role is resolved as
  // 'customer', send them straight to /dashboard. The role guard in
  // App.tsx will redirect non-customers to their own portal.
  useEffect(() => {
    if (user && role === 'customer') navigate('/dashboard', { replace: true });
  }, [user, role, navigate]);

  if (user && role === 'customer') return null;

  const onForgot = async () => {
    setError(null); setErrorBody(null); setWrongPortal(null); setResetSent(false);
    if (!isValidEmailShape(email)) {
      setError('Enter your email above first, then click “Forgot password”.');
      return;
    }
    const a = fbAuth();
    if (!a) { setError('Firebase is not configured.'); return; }
    setBusy(true);
    try {
      await sendPasswordResetEmail(a, email.trim());
      setResetSent(true);
    } catch (err) {
      const f = friendlyAuthError(err);
      setError(f.title);
      setErrorBody(f.body ?? null);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setErrorBody(null); setWrongPortal(null); setResetSent(false);
    if (!isValidEmailShape(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      // AuthProvider's onAuthStateChanged will read users/{uid}.role
      // and set `role` to either 'customer' | 'mechanic' | 'admin' or
      // back to null on error. The useEffect above handles 'customer'.
      // We do NOT navigate here — we let the role gate drive routing
      // so a non-customer account lands in the right place via the
      // route guard rather than slipping into the wrong portal.
    } catch (err) {
      const f = friendlyAuthError(err);
      setError(f.title);
      setErrorBody(f.body ?? null);
    } finally {
      setBusy(false);
    }
  };

  // Cross-portal guard at the UI layer: if a user is signed in but
  // their resolved role is something other than 'customer', surface a
  // clear "this portal is not for you" message with a link to the
  // right one. The route guard in App.tsx is the authoritative version;
  // this just gives the user a friendlier in-page signal.
  useEffect(() => {
    if (!user) { setWrongPortal(null); return; }
    if (role === 'mechanic') setWrongPortal('mechanic');
    else if (role === 'admin') setWrongPortal('admin');
    else setWrongPortal(null);
  }, [user, role]);

  return (
    <AuthScreen
      icon={<Car className="h-5 w-5" />}
      hue="azure"
      eyebrow="Customer sign-in"
      title="Welcome back to MECHIST"
      description="Sign in to request help, track a live service, and manage your vehicles."
      configured={configured}
      backHref="/login"
      backLabel="Choose a different role"
      footer={
        <p className="text-center text-xs text-fg-subtle">
          Looking for the mechanic portal?{' '}
          <Link to="/login/mechanic" className="link-quiet">Sign in as mechanic</Link>.
        </p>
      }
    >
      <Card tone="azure" elevated>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Input
            type="email" name="email" label="Email" required autoComplete="email"
            placeholder="you@example.in"
            icon={<Mail className="h-4 w-4" />}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            name="password" label="Password" required autoComplete="current-password"
            placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onForgot}
              className="text-small text-fg-muted hover:text-fg-app"
              disabled={busy}
            >
              Forgot password?
            </button>
            <Link to="/signup/customer" className="text-small text-fg-muted hover:text-fg-app">
              Create an account →
            </Link>
          </div>

          <div aria-live="polite" className="empty:hidden">
            {resetSent && (
              <AuthAlert tone="success" role="status" body="Password reset email sent. Check your inbox." />
            )}
            {wrongPortal === 'mechanic' && (
              <AuthAlert
                tone="warning"
                icon={<ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
                title={<>This account is registered as a mechanic. Use the{' '}
                  <Link to="/login/mechanic" className="underline">mechanic sign-in</Link> instead.</>}
              />
            )}
            {wrongPortal === 'admin' && (
              <AuthAlert
                tone="warning"
                icon={<ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
                title={<>This is a staff account. Use the{' '}
                  <Link to="/admin/login" className="underline">MECHIST control room sign-in</Link>.</>}
              />
            )}
            {error && (
              <AuthAlert tone="danger" icon={<TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />} title={error} body={errorBody} />
            )}
          </div>

          <Button
            type="submit" variant="primary" size="lg" fullWidth loading={busy}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-fg-subtle">
          By continuing you agree to MECHIST's terms and privacy policy.
        </p>
      </Card>
    </AuthScreen>
  );
}
