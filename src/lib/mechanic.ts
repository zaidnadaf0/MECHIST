/**
 * Mechanic-facing data access. All accessors are null-safe: if Firebase
 * is not configured, they return early and the page renders the empty
 * or error state itself.
 */
import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, setDoc, updateDoc, where,
  type DocumentData, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import type { ServiceRequest } from './customer';
import { OFFER_WINDOW_MS } from './customer';
import { DEMO_MECHANICS, DEMO_MECHANIC_ID, DEMO_REQUESTS, isDemo } from './demo';

function requireDb() {
  const handle = db();
  if (!handle) throw new Error('Firebase is not configured.');
  return handle;
}

function asRequest(id: string, raw: DocumentData | undefined): ServiceRequest | null {
  if (!raw) return null;
  return { id, ...(raw as Omit<ServiceRequest, 'id'>) };
}

export type JobStatus = ServiceRequest['status'];

export interface MechanicProfile {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  /** Verification lifecycle for a newly-registered mechanic. */
  verificationStatus?: 'pending' | 'under_review' | 'approved' | 'rejected';
  /** True when an admin has approved this mechanic (`verificationStatus === 'approved'`). */
  approved: boolean;
  specialties: string[];
  /** Supported vehicle types (e.g. ['car','motorcycle','suv']). */
  vehicleTypes?: string[];
  /** Years of professional experience. */
  experienceYears?: number;
  /** Willing to travel up to this many km from the base. */
  serviceRadiusKm?: number;
  isAvailable: boolean;
  rating?: number;
  reviewCount?: number;
  vehicleDescription?: string;
  /** Workshop name (or mobile rig name). */
  garageName?: string;
  /** Free-text workshop address; geocoding is a future-phase concern. */
  garageAddress?: string;
  /** Current (live) coordinates from watchPosition. */
  currentLat?: number;
  /** Current (live) coordinates from watchPosition. */
  currentLng?: number;
  /** Epoch ms of the most recent position push to Firestore. */
  locationUpdatedAt?: number;
  /** Base (home/garage) location — used for "nearby" distance and ETA. */
  baseLat?: number;
  baseLng?: number;
}

/**
 * Live queue of jobs in 'requested' state, ordered by recency.
 *
 * Firestore has no `array-not-contains` / `array-does-not-contain`,
 * so a server-side `where('declinedBy', 'not-contains', uid)` is
 * not possible. The matching engine already excludes `declinedBy`
 * on the server (`findEligibleMechanics(..., excludeUids)`), but
 * the dispatch queue snapshot would still *deliver* the declined
 * doc to the mechanic's listener. We hide it client-side here
 * instead — no new composite index and no rules change required.
 *
 * Pass the current mechanic's uid as `excludeUid` so they never
 * see a request they already declined. Callers that omit it keep
 * the previous behaviour (no filtering).
 */
export function watchIncoming(
  cb: (jobs: ServiceRequest[]) => void,
  onError?: (err: Error) => void,
  excludeUid?: string,
): Unsubscribe | null {
  if (isDemo()) {
    queueMicrotask(() => cb(DEMO_REQUESTS.filter((j) => j.status === 'requested' && !(excludeUid && (j.declinedBy ?? []).includes(excludeUid)))));
    return null;
  }
  try {
    const d = requireDb();
    return onSnapshot(
      query(collection(d, 'requests'), where('status', '==', 'requested'), orderBy('createdAt', 'desc'), limit(20)),
      (snap) => {
        const jobs = snap.docs
          .map((s) => asRequest(s.id, s.data()))
          .filter((j): j is ServiceRequest => Boolean(j))
          .filter((j) => !excludeUid || !(j.declinedBy ?? []).includes(excludeUid));
        cb(jobs);
      },
      (err) => { cb([]); onError?.(err as Error); },
    );
  } catch {
    return null;
  }
}

/** Tri-state result of an accept attempt. */
export type AcceptResult = 'accepted' | 'expired' | 'alreadyTaken' | 'error';

/** Pick a sensible ETA when the customer didn't pass one in. */
function deriveEta(
  mechanicBase: { lat: number; lng: number } | undefined,
  request: ServiceRequest,
): number {
  if (mechanicBase) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(request.customerLat - mechanicBase.lat);
    const dLng = toRad(request.customerLng - mechanicBase.lng);
    const lat1 = toRad(mechanicBase.lat);
    const lat2 = toRad(request.customerLat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const km = 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    if (Number.isFinite(km) && km > 0) {
      return Math.max(1, Math.round((km / 35) * 60));
    }
  }
  return request.etaMin ?? 15;
}

/**
 * Accept a queued request.
 *
 * Uses a Firestore transaction so the read-then-write is atomic:
 *   - read the request doc
 *   - if `status !== 'requested'`, return `alreadyTaken`
 *   - if `offerExpiresAt < now`, return `expired`
 *   - otherwise write `accepted` + mechanicId/mechanicName/etaMin/updatedAt
 *     and return `accepted`
 *
 * Pages that only need the boolean ("did it work?") can use:
 *   `result === 'accepted'`.
 */
export async function acceptJob(
  id: string,
  mechanicId: string,
  mechanicName: string,
  etaMin?: number,
  mechanicBase?: { lat: number; lng: number },
): Promise<AcceptResult> {
  try {
    const d = requireDb();
    const ref = doc(d, 'requests', id);
    const result = await runTransaction(d, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 'alreadyTaken' as const;
      const data = snap.data() as ServiceRequest;
      if (data.status !== 'requested') return 'alreadyTaken' as const;
      if (data.offerExpiresAt != null && data.offerExpiresAt < Date.now()) {
        return 'expired' as const;
      }
      const eta = etaMin ?? deriveEta(mechanicBase, data);
      tx.update(ref, {
        status: 'accepted',
        mechanicId,
        mechanicName,
        etaMin: eta,
        updatedAt: serverTimestamp(),
      });
      return 'accepted' as const;
    });
    return result;
  } catch {
    return 'error';
  }
}

/**
 * Caller: MechanicJob status actions, Tracking. Affected API: requests/{id} status advance.
 * Schema: ServiceRequest { amountCents?: number (minor units, >=0), durationMin?: number (>=0) }
 * Verbatim instruction: Batch 2 History enrichment add optional amountCents and durationMin only if
 * justified preserve compatibility fallback safely do not fabricate.
 *
 * Batch 7 race guard: transactional read-then-write that refuses to move a
 * terminal job (completed/cancelled). Without this, a mechanic's
 * complete-write racing a customer/admin cancel could flip a cancelled job
 * back to completed (or vice versa) — last-writer-wins on a plain updateDoc.
 */
export async function updateJobStatus(
  id: string,
  status: JobStatus,
  extra?: { amountCents?: number; durationMin?: number },
): Promise<boolean> {
  try {
    const d = requireDb();
    return await runTransaction(d, async (tx) => {
      const snap = await tx.get(doc(d, 'requests', id));
      if (!snap.exists()) return false;
      const cur = (snap.data() as ServiceRequest).status;
      if (cur === 'completed' || cur === 'cancelled') return false;
      const patch: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
      if (status === 'completed') {
        if (extra?.amountCents != null && Number.isFinite(extra.amountCents) && extra.amountCents >= 0) patch.amountCents = Math.round(extra.amountCents);
        if (extra?.durationMin != null && Number.isFinite(extra.durationMin) && extra.durationMin >= 0) patch.durationMin = Math.round(extra.durationMin);
      }
      tx.update(doc(d, 'requests', id), patch);
      return true;
    });
  } catch { return false; }
}

/**
 * Decline an offer while the request is still in 'requested' state.
 *
 * We don't change the request status — only append the mechanic's uid
 * to `declinedBy[]`. The offer window keeps ticking for the remaining
 * candidates. Operators see the declinedBy list as a signal that a
 * mechanic is cycling through offers without accepting.
 *
 * A second decline from the same mechanic is a no-op (uid is deduped
 * in the transaction).
 */
export async function declineOffer(
  requestId: string,
  mechanicId: string,
): Promise<'declined' | 'alreadyTaken' | 'forbidden' | 'error'> {
  try {
    const d = requireDb();
    const ref = doc(d, 'requests', requestId);
    return await runTransaction(d, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 'alreadyTaken' as const;
      const data = snap.data() as ServiceRequest;
      if (data.status !== 'requested') return 'alreadyTaken' as const;
      const list = Array.isArray(data.declinedBy) ? data.declinedBy : [];
      if (list.includes(mechanicId)) return 'declined' as const;
      tx.update(ref, {
        declinedBy: [...list, mechanicId],
        updatedAt: serverTimestamp(),
      });
      return 'declined' as const;
    });
  } catch (e: unknown) {
    const code = (e as { code?: string } | null)?.code;
    if (code === 'permission-denied') return 'forbidden';
    return 'error';
  }
}

/** Statuses where the mechanic can still release a job back to the queue. */
const RELEASABLE_STATUSES = ['accepted', 'on-the-way', 'arrived', 'service'] as const;

/**
 * Release an accepted job back to the queue.
 *
 *  - status  -> 'requested'
 *  - mechanicId / mechanicName cleared so the offer is open again
 *  - offerExpiresAt extended by OFFER_WINDOW_MS so the next candidate
 *    gets a fresh window
 *  - releaseReason stored for operator audit
 *
 * The Firestore rule that protects this branch must use hasOnly(...)
 * so the mechanic cannot write arbitrary fields.
 */
export async function releaseJob(
  requestId: string,
  mechanicId: string,
  reason: string,
): Promise<'released' | 'not_assigned' | 'invalid_state' | 'forbidden' | 'error'> {
  try {
    const d = requireDb();
    const ref = doc(d, 'requests', requestId);
    return await runTransaction(d, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 'invalid_state' as const;
      const data = snap.data() as ServiceRequest;
      if (data.mechanicId !== mechanicId) return 'not_assigned' as const;
      if (!(RELEASABLE_STATUSES as readonly string[]).includes(data.status)) {
        return 'invalid_state' as const;
      }
      tx.update(ref, {
        status: 'requested',
        mechanicId: null,
        mechanicName: null,
        mechanicPhone: null,
        mechanicLat: null,
        mechanicLng: null,
        offerExpiresAt: Date.now() + OFFER_WINDOW_MS,
        releaseReason: reason,
        releasedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return 'released' as const;
    });
  } catch (e: unknown) {
    const code = (e as { code?: string } | null)?.code;
    if (code === 'permission-denied') return 'forbidden';
    return 'error';
  }
}

export async function getMechanicProfile(uid: string): Promise<MechanicProfile | null> {
  if (isDemo()) return DEMO_MECHANICS.find((m) => m.id === uid) ?? DEMO_MECHANICS.find((m) => m.id === DEMO_MECHANIC_ID) ?? null;
  try {
    const d = requireDb();
    const snap = await getDoc(doc(d, 'mechanics', uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<MechanicProfile, 'id'>) };
  } catch { return null; }
}

/**
 * Owner-scoped contact card (`mechanics/{uid}/private/contact`).
 * Returns null when the viewer is not the owner/admin (permission-denied
 * is swallowed by design) or when no contact was saved yet. Public pages
 * must never call this — the roster works without contact fields.
 */
export interface MechanicContact {
  phone: string | null;
  email: string | null;
}

export async function getMechanicContact(uid: string): Promise<MechanicContact | null> {
  if (isDemo()) {
    const m = DEMO_MECHANICS.find((x) => x.id === uid);
    return { phone: m?.phone ?? null, email: m?.email ?? null };
  }
  try {
    const d = requireDb();
    const snap = await getDoc(doc(d, 'mechanics', uid, 'private', 'contact'));
    if (!snap.exists()) return null;
    const raw = snap.data() as Partial<MechanicContact>;
    return {
      phone: typeof raw.phone === 'string' ? raw.phone : null,
      email: typeof raw.email === 'string' ? raw.email : null,
    };
  } catch { return null; }
}

/** Update the owner's own contact card. Phone/email never land on the parent doc. */
export async function updateMechanicContact(
  uid: string,
  patch: { phone?: string | null; email?: string | null },
): Promise<boolean> {
  try {
    const d = requireDb();
    const clean: DocumentData = { updatedAt: serverTimestamp() };
    if (patch.phone !== undefined) clean.phone = patch.phone;
    if (patch.email !== undefined) clean.email = patch.email;
    // setDoc+merge (not updateDoc): legacy profiles created before the
    // contact split have no private/contact doc yet.
    await setDoc(doc(d, 'mechanics', uid, 'private', 'contact'), clean, { merge: true });
    return true;
  } catch { return false; }
}

export async function setAvailability(uid: string, isAvailable: boolean): Promise<boolean> {
  try {
    const d = requireDb();
    await updateDoc(doc(d, 'mechanics', uid), { isAvailable, updatedAt: serverTimestamp() });
    return true;
  } catch { return false; }
}

/** Push the mechanic's live GPS coordinates onto their own profile doc. */
export async function pushMechanicLocation(uid: string, lat: number, lng: number): Promise<boolean> {
  try {
    const d = requireDb();
    await updateDoc(doc(d, 'mechanics', uid), {
      currentLat: lat,
      currentLng: lng,
      locationUpdatedAt: Date.now(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch { return false; }
}

/** Push the mechanic's live GPS coordinates onto the in-flight request. */
export async function pushMechanicLocationToRequest(requestId: string, lat: number, lng: number): Promise<boolean> {
  try {
    const d = requireDb();
    await updateDoc(doc(d, 'requests', requestId), {
      mechanicLat: lat,
      mechanicLng: lng,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch { return false; }
}

export type ListCompletedResult =
  | { data: ServiceRequest[]; error: null }
  | { data: null; error: Error };

export async function listCompletedJobs(mechanicId: string, max = 30): Promise<ListCompletedResult> {
  if (isDemo()) return { data: DEMO_REQUESTS.filter((r) => r.status === 'completed').slice(0, max), error: null };
  try {
    const d = requireDb();
    const snap = await getDocs(
      query(collection(d, 'requests'),
        where('mechanicId', '==', mechanicId),
        where('status', '==', 'completed'),
        orderBy('updatedAt', 'desc'),
        limit(max),
      ),
    );
    return { data: snap.docs.map((s) => asRequest(s.id, s.data())).filter((r): r is ServiceRequest => Boolean(r)), error: null };
  } catch (e) { return { data: null, error: e instanceof Error ? e : new Error(String(e)) }; }
}

export type ListActiveResult =
  | { data: ServiceRequest | null; error: null }
  | { data: null; error: Error };

export async function listActiveJob(mechanicId: string): Promise<ListActiveResult> {
  if (isDemo()) return { data: DEMO_REQUESTS.find((r) => ['accepted', 'on-the-way', 'arrived', 'service'].includes(r.status)) ?? null, error: null };
  try {
    const d = requireDb();
    const snap = await getDocs(
      query(collection(d, 'requests'),
        where('mechanicId', '==', mechanicId),
        where('status', 'in', ['accepted', 'on-the-way', 'arrived', 'service']),
        limit(1),
      ),
    );
    if (snap.empty) return { data: null, error: null };
    const doc0 = snap.docs[0];
    return { data: asRequest(doc0.id, doc0.data()), error: null };
  } catch (e) { return { data: null, error: e instanceof Error ? e : new Error(String(e)) }; }
}
