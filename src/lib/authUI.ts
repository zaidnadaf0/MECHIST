/**
 * Auth-UI helpers. Pure functions and types shared by the four
 * authentication pages (AuthPage, CustomerSignup, MechanicSignup,
 * AdminLogin) and by the MechanicDashboard verification banner.
 *
 * Scope (kept tight on purpose):
 *   - Indian-context validation (phone, PIN code, basic email shape).
 *   - Mapping of Firebase Auth error codes → human messages, per
 *     Phase 4 §24 (no raw stack traces, every error maps to a string
 *     a non-technical user can act on).
 *   - Indian rupee currency formatter.
 *   - Indian clock formatter (24h IST by default; locale-aware).
 *   - Canonical role labels.
 *   - Reusable verification-state UI (banner copy + tone).
 */
import type { FirebaseError } from 'firebase/app';

/* ──────────────────────────── validation ──────────────────────────── */

/** Indian mobile: optional +91 / leading 0, 10 digits starting 6-9. */
export const INDIAN_PHONE_RE = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/;

/** Indian PIN code: 6 digits, first digit 1-9. */
export const INDIAN_PIN_RE = /^[1-9]\d{5}$/;

/** RFC-5322-lite. Defers to Firebase for the authoritative check. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidIndianPhone(s: string): boolean {
  return INDIAN_PHONE_RE.test(s.trim());
}
export function isValidIndianPin(s: string): boolean {
  return INDIAN_PIN_RE.test(s.trim());
}
export function isValidEmailShape(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}

/** Normalize an Indian phone to "+91XXXXXXXXXX" for storage. */
export function normalizeIndianPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return raw.trim();
}

/* ──────────────────────────── auth errors ─────────────────────────── */

export interface AuthErrorShape {
  /** Short headline safe to put on a single line. */
  title: string;
  /** Optional longer body explaining what the user should try next. */
  body?: string;
}

const AUTH_ERROR_MAP: Record<string, AuthErrorShape> = {
  'auth/email-already-in-use': {
    title: 'This email is already registered',
    body: 'Sign in instead, or use a different email address.',
  },
  'auth/invalid-email': {
    title: 'That email address looks invalid',
    body: 'Check for typos — it should look like name@example.com.',
  },
  'auth/user-disabled': {
    title: 'This account is disabled',
    body: 'Please contact RoadAssisst support to restore access.',
  },
  'auth/user-not-found': {
    title: 'No account matches those details',
    body: 'Double-check the email, or create a new account.',
  },
  'auth/wrong-password': {
    title: 'That password is incorrect',
    body: 'Try again, or use “Forgot password” to reset it.',
  },
  'auth/invalid-credential': {
    title: 'Sign-in failed',
    body: 'The email or password is incorrect. Try again or reset your password.',
  },
  'auth/invalid-login-credentials': {
    title: 'Sign-in failed',
    body: 'The email or password is incorrect. Try again or reset your password.',
  },
  'auth/too-many-requests': {
    title: 'Too many attempts',
    body: 'Please wait a minute before trying again.',
  },
  'auth/network-request-failed': {
    title: 'Network error',
    body: 'Check your connection and try again.',
  },
  'auth/operation-not-allowed': {
    title: 'Sign-in is unavailable',
    body: 'Email/password sign-in is not enabled in Firebase yet.',
  },
  'auth/weak-password': {
    title: 'Password is too weak',
    body: 'Use at least 6 characters, ideally with a mix of letters and numbers.',
  },
  'auth/requires-recent-login': {
    title: 'Please sign in again',
    body: 'For your security, sign in once more to continue.',
  },
  'auth/popup-closed-by-user': {
    title: 'Sign-in window was closed',
    body: 'Try again — you can close the window any time.',
  },
  'auth/unauthorized-domain': {
    title: 'This domain is not authorized',
    body: 'Add it to the Firebase Auth authorized-domains list.',
  },
  // v12 SDK surfaces a few additional config-error codes for the
  // case where the project's API key is wrong, restricted, or the
  // app is not registered. Without these the user sees the generic
  // "Something went wrong" and the developer has to dig through the
  // console to find the real cause. The messages intentionally avoid
  // any mention of the key value.
  'auth/invalid-api-key': {
    title: 'Firebase rejected the API key',
    body: 'The VITE_FIREBASE_API_KEY in .env.local is not valid for this project. Re-copy it from Firebase Console → Project settings → General → Web app.',
  },
  'auth/api-key-not-valid': {
    title: 'Firebase rejected the API key',
    body: 'The VITE_FIREBASE_API_KEY in .env.local is not valid for this project. Re-copy it from Firebase Console → Project settings → General → Web app.',
  },
  'auth/app-not-authorized': {
    title: 'This app is not authorized',
    body: 'The VITE_FIREBASE_APP_ID is not registered for this API key. Re-copy the app config from Firebase Console → Project settings → General → Web app.',
  },
  'auth/configuration-not-found': {
    title: 'Firebase configuration is missing',
    body: 'No Firebase project is configured for this app. Re-check .env.local and restart npm run dev.',
  },
  'auth/internal-error': {
    title: 'Firebase returned an internal error',
    body: 'Retry in a moment. If it persists, open the browser console and share the [MECHIST auth] log with your platform admin.',
  },
};

const DEFAULT_AUTH_ERROR: AuthErrorShape = {
  title: 'Something went wrong',
  body: 'Please try again. If the problem persists, contact RoadAssisst support.',
};

/** Map a Firebase Auth error to a user-friendly message. */
export function friendlyAuthError(err: unknown): AuthErrorShape {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as FirebaseError).code;
    if (code && AUTH_ERROR_MAP[code]) return AUTH_ERROR_MAP[code];
  }
  if (err instanceof Error) {
    if (/network/i.test(err.message)) return AUTH_ERROR_MAP['auth/network-request-failed']!;
    if (/email.*exists|already.*use/i.test(err.message)) return AUTH_ERROR_MAP['auth/email-already-in-use']!;
    if (/password/i.test(err.message)) return AUTH_ERROR_MAP['auth/wrong-password']!;
  }
  // Diagnostic breadcrumb. Logs the raw error so a developer can see
  // the actual Firebase code in the browser console without exposing
  // it to the end-user. The user-facing title remains the safe default.
  // Only runs in the browser (where `console` and `window` are defined).
  if (typeof console !== 'undefined' && typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('[MECHIST auth] unmapped error:', err);
  }
  return DEFAULT_AUTH_ERROR;
}

/* ──────────────────────────── formatting ──────────────────────────── */

/** Indian rupee formatter. Uses INR locale, no fractional digits by default. */
export function inr(amount: number, opts: { decimals?: boolean } = {}): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(amount);
}

/** Indian 24h clock (HH:mm) anchored to Asia/Kolkata. */
export function istClock(d: Date | number): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/** Long Indian date. */
export function istDateLong(d: Date | number): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/* ──────────────────────────── role labels ─────────────────────────── */

export const ROLE_LABELS: Record<'customer' | 'mechanic' | 'admin', string> = {
  customer: 'Customer',
  mechanic: 'Mechanic',
  admin: 'Admin',
};

/* ─────────────────────── verification status UI ────────────────────── */

export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface VerificationUi {
  badgeTone: 'info' | 'warning' | 'success' | 'danger';
  badgeLabel: string;
  bannerTitle: string;
  bannerBody: string;
  canAcceptJobs: boolean;
}

export function verificationUi(s: VerificationStatus | null | undefined): VerificationUi {
  switch (s) {
    case 'approved':
      return {
        badgeTone: 'success',
        badgeLabel: 'Approved',
        bannerTitle: 'You are approved and accepting jobs',
        bannerBody: 'Your garage is live. Toggle availability from the header to start receiving dispatch offers.',
        canAcceptJobs: true,
      };
    case 'under_review':
      return {
        badgeTone: 'warning',
        badgeLabel: 'Under review',
        bannerTitle: 'Your application is under review',
        bannerBody: 'Our team is verifying your garage details. Most applications are reviewed within 24–48 hours. You will be able to accept jobs once approved.',
        canAcceptJobs: false,
      };
    case 'rejected':
      return {
        badgeTone: 'danger',
        badgeLabel: 'Application rejected',
        bannerTitle: 'Your application was not approved',
        bannerBody: 'Please contact RoadAssisst support for the reason and the steps to re-apply with additional documentation.',
        canAcceptJobs: false,
      };
    case 'pending':
    default:
      return {
        badgeTone: 'info',
        badgeLabel: 'Pending review',
        bannerTitle: 'Your application is in the queue',
        bannerBody: 'An admin will review your profile before you can be matched to customers. This usually takes 24–48 hours.',
        canAcceptJobs: false,
      };
  }
}

/* ─────────────────────── sample Indian placeholders ────────────────── */

export const INDIAN_NAMES = {
  customer: ['Aarav Sharma', 'Priya Iyer', 'Rohan Mehta', 'Sneha Kapoor', 'Vikram Reddy', 'Ananya Nair'],
  mechanic: ['Rajesh Kumar', 'Suresh Patil', 'Mahesh Singh', 'Dinesh Yadav', 'Arjun Verma', 'Karthik Rao'],
  admin: ['admin@mechist.in'],
} as const;

export const INDIAN_CITIES = [
  'Bengaluru, Karnataka',
  'Mumbai, Maharashtra',
  'Delhi, NCR',
  'Chennai, Tamil Nadu',
  'Hyderabad, Telangana',
  'Pune, Maharashtra',
  'Kolkata, West Bengal',
  'Ahmedabad, Gujarat',
  'Jaipur, Rajasthan',
  'Lucknow, Uttar Pradesh',
] as const;

export const INDIAN_GARAGE_NAMES = [
  'Kumar Motor Works',
  'Sharma Auto Garage',
  'Patil Car Care',
  'Reddy Tyres & Service',
  'Verma Two-Wheeler Repair',
  'Iyer Auto Electricals',
] as const;

/** Sample garage address with PIN code, for placeholders. */
export function sampleIndianAddress(garage: string = 'Kumar Motor Works'): string {
  return `${garage}, 14 Industrial Layout, Bengaluru, Karnataka — 560044`;
}
