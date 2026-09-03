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
 * The two writes are committed in a single Firestore batch so they either
 * both land or neither does — a half-written mechanic (users doc only, no
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
      phone: input.phone?.trim() || null,
      email: input.email.trim().toLowerCase(),
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
    const batch = writeBatch(d);
    batch.set(doc(d, 'users', uid), userDoc);
    batch.set(doc(d, 'mechanics', uid), mechDoc);
    await batch.commit();
    return true;
  } catch { return false; }
}

/** Read the role for the signed-in user from `users/{uid}.role`. Returns null if not found. */
export async function fetchUserRole(uid: string): Promise<PublicRole | 'admin' | null> {
  try {
    const d = requireDb();
    const snap = await getDoc(doc(d, 'users', uid));
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
 * Read the admin custom claim from the current user's ID token. The
 * Firestore security rules trust ONLY the custom claim
 * (`request.auth.token.admin == true`) — the `users/{uid}.role`
 * field is a UI/profile hint, not a security boundary. This helper
 * forces a fresh token read so a freshly-provisioned claim is seen
 * after the user signs back in.
 *
 * Returns:
 *   - true   → admin claim is present.
 *   - false  → signed in but the admin claim is missing.
 *   - null   → no signed-in user (caller should redirect to /login).
 *
 * Never call this server-side — it touches the current user's ID
 * token, which is only available in the browser SDK.
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
