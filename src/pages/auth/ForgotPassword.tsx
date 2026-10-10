/**
 * Standalone password-reset route (`/forgot`, public).
 *
 * Real Firebase Authentication flow via `sendPasswordResetEmail` — the
 * same call the per-portal login pages use inline. This page exists so
 * the reset flow is deep-linkable (support links, auth error screens)
 * without requiring the user to be signed in. No password is ever
 * stored or handled here; Firebase sends the reset email.
 */
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail, TriangleAlert } from 'lucide-react';
import { AuthAlert, AuthScreen, Button, Card, Input } from '@/components/ui';
import { useAuth } from '@/app/AuthProvider';
import { auth as fbAuth } from '@/app/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { friendlyAuthError, isValidEmailShape } from '@/lib/authUI';

export function ForgotPassword() {
  const { configured } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorBody, setErrorBody] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorBody(null);
    setSent(false);
    if (!isValidEmailShape(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    const a = fbAuth();
    if (!a) {
      setError('Firebase is not configured.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(a, email.trim());
      setSent(true);
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
      icon={<KeyRound className="h-5 w-5" />}
      hue="azure"
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter the email you signed up with and we will send you a password-reset link."
      configured={configured}
      backHref="/login"
      backLabel="Back to sign-in"
      footer={
        <p className="text-center text-xs text-fg-subtle">
          Remembered it?{' '}
          <Link to="/login/customer" className="link-quiet">Sign in as customer</Link>
          {' · '}
          <Link to="/login/mechanic" className="link-quiet">Sign in as mechanic</Link>
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
          <div aria-live="polite" className="empty:hidden">
            {sent && (
              <AuthAlert
                tone="success" role="status"
                title="Reset email sent"
                body="Check your inbox (and spam folder) for the password-reset link."
              />
            )}
            {error && (
              <AuthAlert
                tone="danger"
                icon={<TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
                title={error} body={errorBody}
              />
            )}
          </div>
          <Button
            type="submit" variant="primary" size="lg" fullWidth loading={busy}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Send reset link
          </Button>
        </form>
      </Card>
    </AuthScreen>
  );
}
