/**
 * Dedicated admin sign-in path. Keeps the public auth page free of any
 * "I am an admin" option. Staff credentials are provisioned out of band
 * (custom claim `admin: true` is set by a Cloud Function / Firebase
 * console), so this page is *only* for users who already hold that claim.
 *
 * Behaviour:
 *   - Authenticates with email/password.
 *   - After sign-in, fetches the user doc and confirms the `admin` role.
 *   - If the role is not admin, sign the user out and show a clear error.
 *   - The canonical `role` lives at `users/{uid}.role` (or in custom
 *     claims once a backend exists) — the localStorage dev hint is NOT
 *     trusted for admin gating.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Gauge, Mail, ShieldAlert, TriangleAlert } from 'lucide-react';
import { AuthAlert, AuthScreen, Button, Card, Input, PasswordField } from '@/components/ui';
import { useAuth } from '@/app/AuthProvider';
import { fetchUserRole, verifyAdminClaim } from '@/lib/authProfile';
import { auth as fbAuth } from '@/app/firebase';
import { sendPasswordResetEmail, signOut as fbSignOut } from 'firebase/auth';
import { friendlyAuthError, isValidEmailShape } from '@/lib/authUI';

export function AdminLogin() {
  const { signIn, user, configured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorBody, setErrorBody] = useState<string | null>(null);
  const [notAdmin, setNotAdmin] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // If an admin is already signed in, send them straight to /admin
  // (or honour `?next=` if the guard sent them here).
  useEffect(() => {
    if (user) {
      const sp = new URLSearchParams(window.location.search);
      const next = sp.get('next');
      const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin';
      navigate(dest, { replace: true });
    }
  }, [user, navigate]);

  if (user) return null;

  const onForgot = async () => {
    setError(null); setErrorBody(null); setNotAdmin(false); setResetSent(false);
    if (!isValidEmailShape(email)) {
      setError('Enter your admin email above first, then click “Forgot password”.');
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
    setError(null); setErrorBody(null); setNotAdmin(false); setResetSent(false);
    setBusy(true);
    try {
      await signIn(email, password);
      // Authoritative admin check: the Firebase Auth ID-token custom
      // claim (`admin === true`). Firestore security rules gate every
      // admin operation on this same claim, so this is the only check
      // that protects /admin from privilege drift. The
      // `users/{uid}.role === 'admin'` doc field is a UI hint only;
      // we still confirm it here for the "not provisioned" copy, but
      // a missing claim always wins.
      const a = fbAuth();
      const u = a?.currentUser ?? null;
      const uid = u?.uid;
      if (!uid) throw new Error('Sign-in succeeded but no user is available.');

      const [claim, docRole] = await Promise.all([
        verifyAdminClaim(),
        fetchUserRole(uid),
      ]);

      if (claim !== true) {
        // Not an admin — sign them back out so the public auth flow
        // doesn't quietly let them into the wrong portal.
        if (a) await fbSignOut(a);
        setNotAdmin(true);
        return;
      }
      if (docRole !== 'admin') {
        // The claim is set but the profile doc isn't — surface the
        // "claim provisioned but profile incomplete" case so the
        // operator can re-run the bootstrap script's profile write.
        if (a) await fbSignOut(a);
        setError('Admin claim is provisioned, but the users/{uid} profile is missing the role field. Contact your platform administrator.');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      const f = friendlyAuthError(err);
      setError(f.title);
      setErrorBody(f.body ?? null);
      // Dev-only breadcrumb: the friendly mapper swallows the actual
      // code, so the developer needs the raw `err.code` in the console
      // to debug. Plain `console.warn` — no secrets, no env values.
      // eslint-disable-next-line no-console
      console.warn('[MECHIST admin-login] raw error:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen
      icon={<Gauge className="h-5 w-5" />}
      hue="iris"
      eyebrow="Staff access"
      title="MECHIST CONTROL ROOM"
      description="Authorised personnel only. Customer and mechanic accounts sign in from the main login page."
      configured={configured}
      backHref="/login"
      backLabel="Back to main login"
      footer={
        <p className="text-center text-xs text-fg-subtle">
          Not an admin?{' '}
          <Link to="/login" className="link-quiet">Go to the main sign-in page</Link>.
        </p>
      }
    >
      <Card tone="iris" elevated>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Input
            type="email" name="admin-email" label="Admin email" required
            autoComplete="username"
            placeholder="admin@mechist.in"
            icon={<Mail className="h-4 w-4" />}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            name="admin-password" label="Password" required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />

          <div aria-live="polite" className="empty:hidden">
            {resetSent && (
              <AuthAlert tone="success" role="status" body="Password reset email sent. Check your inbox." />
            )}
            {notAdmin && (
              <AuthAlert
                tone="warning"
                icon={<ShieldAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
                title="This account exists but is not an admin. Staff access is provisioned out of band; please contact your platform administrator."
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
            Sign in to admin
          </Button>

          <button
            type="button"
            onClick={onForgot}
            disabled={busy}
            className="text-small text-fg-muted hover:text-fg-app disabled:opacity-50"
          >
            Forgot password?
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-fg-subtle">
          This endpoint is rate-limited. Repeated failed attempts are logged.
        </p>
      </Card>
    </AuthScreen>
  );
}
