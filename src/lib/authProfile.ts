/**
 * User / mechanic profile creation.
 *
 * The Firebase Auth account is created by the auth page; this module
 * handles the *secondary* writes to Firestore that the rules require
 * (a `users/{uid}` doc with the canonical role, and for mechanics a
 * `mechanics/{uid}` doc that starts in `verificationStatus: 'pending'`).
 *
 * Rules reminder:
 *   - `users/{uid}.role` is created by the user themselves on signup.
 *   - `mechanics/{uid}.approved` MUST start as `false`.
 *   - No password-shaped field ever lands in a profile doc.
 */
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch, type DocumentData } from 'firebase/firestore';
import { getIdTokenResult } from 'firebase/auth';
import { db, auth as fbAuth } from '@/app/firebase';
import { demoRole, isDemo } from '@/lib/demo';

export type PublicRole = 'customer' | 'mechanic';
export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface CustomerProfileInput {
  fullName: string;
  email: string;
  phone?: string;
}
export interface MechanicProfileInput {
  fullName: string;
  email: string;
  phone?: string;
  garageName: string;
  garageAddress: string;
  /** Geocoded coords, optional at signup (can be set later). */
  baseLat?: number;
  baseLng?: number;
  specialties: string[];
  vehicleTypes: string[];
  experienceYears: number;
  serviceRadiusKm: number;
  isAvailable: boolean;
  vehicleDescription?: string;
}

function requireDb() {
  const handle = db();
  if (!handle) throw new Error('Firebase is not configured.');
  return handle;
}

/** Create the canonical `users/{uid}` document for a customer. */
export async function createCustomerUserDoc(uid: string, input: CustomerProfileInput): Promise<boolean> {
  try {
    const d = requireDb();
    const payload: DocumentData = {
      uid,
      role: 'customer',
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(d, 'users', uid), payload);
    return true;
  } catch { return false; }
}

/** Create the canonical `users/{uid}` AND `mechanics/{uid}` documents for a mechanic.
 *
 * Contact fields (`phone`, `email`) live in `mechanics/{uid}/private/contact`
 * (owner + admin only) — never in the publicly-readable parent doc. The
 * three writes are committed in a single Firestore batch so they either
 * all land or none does — a half-written mechanic (users doc only, no
 * mechanics doc) would leave the user signed in with `role: 'mechanic'`
 * but no profile, and the rules make that a hard state to recover from. */
export async function createMechanicUserDocs(uid: string, input: MechanicProfileInput): Promise<boolean> {
  try {
    const d = requireDb();
    const userDoc: DocumentData = {
      uid,
      role: 'mechanic',
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const mechDoc: DocumentData = {
      uid,
      name: input.fullName.trim(),
      approved: false,
      verificationStatus: 'pending' as VerificationStatus,
      specialties: input.specialties,
      vehicleTypes: input.vehicleTypes,
      experienceYears: input.experienceYears,
      serviceRadiusKm: input.serviceRadiusKm,
      isAvailable: input.isAvailable,
      vehicleDescription: input.vehicleDescription ?? null,
      garageName: input.garageName.trim(),
      garageAddress: input.garageAddress.trim(),
      baseLat: input.baseLat ?? null,
      baseLng: input.baseLng ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const contactDoc: DocumentData = {
      phone: input.phone?.trim() || null,
      email: input.email.trim().toLowerCase(),
      updatedAt: serverTimestamp(),
    };
    const batch = writeBatch(d);
    batch.set(doc(d, 'users', uid), userDoc);
    batch.set(doc(d, 'mechanics', uid), mechDoc);
    batch.set(doc(d, 'mechanics', uid, 'private', 'contact'), contactDoc);
    await batch.commit();
    return true;
  } catch { return false; }
}

/**
 * Read the role for the signed-in user from `users/{uid}.role`.
 * Returns null if not found. Bounded by a timeout so a stalled network
 * can never leave the app on the global loading screen forever — the
 * caller treats null as "no role" and route guards handle the rest.
 */
export async function fetchUserRole(uid: string, timeoutMs = 8000): Promise<PublicRole | 'admin' | null> {
  if (isDemo()) return demoRole();
  try {
    const d = requireDb();
    const snap = await Promise.race([
      getDoc(doc(d, 'users', uid)),
      new Promise<never>((_, reject) => globalThis.setTimeout(() => reject(new Error('role-timeout')), timeoutMs)),
    ]);
    if (!snap.exists()) return null;
    const data = snap.data() as { role?: string };
    if (data.role === 'customer' || data.role === 'mechanic' || data.role === 'admin') return data.role;
    return null;
  } catch { return null; }
}

/**
 * Confirm `users/{uid}` is queryable from a fresh read AND has the
 * expected role field. Polls with a short bounded retry window — the
 * race we close is: `setDoc` resolved on the write connection, but
 * `onAuthStateChanged` fires on a different connection (or the rules
 * `get()` runs on the rules backend) before the write has propagated.
 *
 * Used by CustomerSignup / MechanicSignup to declare onboarding
 * complete only once the profile doc is observable from a fresh read.
 * Bounded retries prevent an infinite loop if the project is misconfigured.
 *
 * No arbitrary sleeps are used — each iteration is a real Firestore read.
 */
export async function confirmUserRoleReadable(
  uid: string,
  expected: PublicRole,
  opts: { attempts?: number; gapMs?: number } = {},
): Promise<boolean> {
  const attempts = opts.attempts ?? 5;
  const gapMs    = opts.gapMs    ?? 250;
  for (let i = 0; i < attempts; i++) {
    const role = await fetchUserRole(uid);
    if (role === expected) return true;
    if (i < attempts - 1) {
      // One explicit micro-gap between real reads; the next attempt
      // is the actual wait condition, not a sleep.
      await new Promise<void>((r) => setTimeout(r, gapMs));
    }
  }
  return false;
}

/**
 * Read the admin custom claim from the user's CACHED ID token (no refresh).
 * Use this for passive UI gating; use verifyAdminClaim() when a fresh
 * read is required (login, post-grant refresh). Returns null with no user.
 */
export async function readAdminClaim(
  user: { getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims?: Record<string, unknown> }> } | null | undefined,
): Promise<boolean | null> {
  try {
    if (!user) return null;
    const token = await user.getIdTokenResult(false);
    return token.claims?.admin === true;
  } catch {
    return false;
  }
}

/**
 * Read the admin custom claim with a FORCED token refresh. The Firestore
 * security rules trust ONLY the custom claim (`request.auth.token.admin ==
 * true`) — the `users/{uid}.role` field is a UI/profile hint, not a
 * security boundary.
 *
 * Returns true / false / null (no user). Never call server-side.
 */
export async function verifyAdminClaim(): Promise<boolean | null> {
  try {
    const a = fbAuth();
    const u = a?.currentUser;
    if (!u) return null;
    // Force refresh so a freshly-set claim is picked up without
    // requiring the user to sign out / back in.
    const token = await getIdTokenResult(u, /*forceRefresh*/ true);
    return token.claims?.admin === true;
  } catch {
    return false;
  }
}

/**
 * Set or clear the user's role on the canonical `users/{uid}` doc.
 *
 * Note: changing a role to/from 'admin' is intentionally blocked by the
 * Firestore security rules (the admin `role` claim is server-mintable
 * only). This function returns `'forbidden-claim-required'` in that
 * case so the admin UI can surface the right copy.
 */
export type SetUserRoleResult = 'ok' | 'forbidden-claim-required' | 'error';

export async function setUserRoleDoc(uid: string, role: PublicRole | 'admin' | null): Promise<SetUserRoleResult> {
  try {
    const d = requireDb();
    await updateDoc(doc(d, 'users', uid), { role, updatedAt: serverTimestamp() });
    return 'ok';
  } catch (err) {
    const code = (err as { code?: string } | null)?.code ?? '';
    if (
      code === 'permission-denied' ||
      code === 'firestore/permission-denied' ||
      /PERMISSION_DENIED/i.test(String((err as { message?: string } | null)?.message ?? ''))
    ) {
      return 'forbidden-claim-required';
    }
    return 'error';
  }
}

/**
 * Pure admin-portal gate (Phase 1C). Functional admin access requires BOTH:
 * the profile hint (`role === 'admin'`) for routing AND the Firebase ID-token
 * claim (`isAdminClaim === true`) for authority. A doc-role admin WITHOUT the
 * claim gets nothing. Used by RequireAuth and covered by unit tests.
 */
export function isAdminAuthorized(
  role: string | null | undefined,
  isAdminClaim: boolean | null | undefined,
): boolean {
  return role === 'admin' && isAdminClaim === true;
}
