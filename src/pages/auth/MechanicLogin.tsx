/**
 * Mechanic sign-in. Email + password only, with a clear path to the
 * mechanic application flow (`/signup/mechanic`) and Forgot-password.
 *
 * Mechanic role resolution: the user's `users/{uid}.role` must equal
 * `'mechanic'` for AuthProvider to land on this role. The matching
 * `mechanics/{uid}` doc starts in `verificationStatus: 'pending'` —
 * it is the admin's job to flip it to `approved`. This page does
 * NOT auto-approve; it only authenticates and routes to /mechanic.
 *
 * Cross-portal guard: if a customer or admin account signs in here,
 * we surface a clear "this portal is not for you" message and link
 * to the right sign-in. The route guard in App.tsx is the
 * authoritative version; this is the friendly in-page signal.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, ShieldAlert, TriangleAlert, Wrench } from 'lucide-react';
import { AuthAlert, AuthScreen, Button, Card, Input, PasswordField } from '@/components/ui';
import { useAuth } from '@/app/AuthProvider';
import { auth as fbAuth } from '@/app/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { friendlyAuthError, isValidEmailShape } from '@/lib/authUI';

export function MechanicLogin() {
  const { signIn, user, role, configured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorBody, setErrorBody] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [wrongPortal, setWrongPortal] = useState<'customer' | 'admin' | null>(null);

  // If the user is already signed in AND the role is resolved as
  // 'mechanic', send them straight to /mechanic (or honour `?next=`).
  useEffect(() => {
    if (user && role === 'mechanic') {
      const sp = new URLSearchParams(window.location.search);
      const next = sp.get('next');
      const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/mechanic';
      navigate(dest, { replace: true });
    }
  }, [user, role, navigate]);

  if (user && role === 'mechanic') return null;

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
      // and set `role` to either 'customer' | 'mechanic' | 'admin'.
      // The useEffect above handles 'mechanic'. We do NOT navigate
      // here — we let the role gate drive routing so a non-mechanic
      // account lands in the right place via the route guard rather
      // than slipping into the wrong portal.
    } catch (err) {
      const f = friendlyAuthError(err);
      setError(f.title);
      setErrorBody(f.body ?? null);
    } finally {
      setBusy(false);
    }
  };

  // Cross-portal guard at the UI layer.
  useEffect(() => {
    if (!user) { setWrongPortal(null); return; }
    if (role === 'customer') setWrongPortal('customer');
    else if (role === 'admin') setWrongPortal('admin');
    else setWrongPortal(null);
  }, [user, role]);

  return (
    <AuthScreen
      icon={<Wrench className="h-5 w-5" />}
      hue="aqua"
      eyebrow="Mechanic sign-in"
      title="Open the mechanic console"
      description="Sign in to pick up nearby jobs, run them to completion, and manage your garage."
      configured={configured}
      backHref="/login"
      backLabel="Choose a different role"
      footer={
        <p className="text-center text-xs text-fg-subtle">
          New here?{' '}
          <Link to="/signup/mechanic" className="link-quiet">Apply to the mechanic network</Link>.
        </p>
      }
    >
      <Card tone="aqua" elevated>
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
            <Link to="/signup/mechanic" className="text-small text-fg-muted hover:text-fg-app">
              Apply to the network →
            </Link>
          </div>

          <div aria-live="polite" className="empty:hidden">
            {resetSent && (
              <AuthAlert tone="success" role="status" body="Password reset email sent. Check your inbox." />
            )}
            {wrongPortal === 'customer' && (
              <AuthAlert
                tone="warning"
                icon={<ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
                title={<>This account is registered as a customer. Use the{' '}
                  <Link to="/login/customer" className="underline">customer sign-in</Link> instead.</>}
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
            type="submit" variant="live" size="lg" fullWidth loading={busy}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-fg-subtle">
          By continuing you agree to MECHIST's mechanic terms and code of conduct.
        </p>
      </Card>
    </AuthScreen>
  );
}
