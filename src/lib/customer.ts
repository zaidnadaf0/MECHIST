/**
 * Customer-facing data access. All accessors are null-safe: if Firebase is
 * not configured or the user is signed out, they return early instead of
 * throwing. Pages handle the empty/loading/error states themselves.
 */
import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where,
  type DocumentData, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/app/firebase';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  type: 'car' | 'bike' | 'van' | 'truck';
}

export interface ServiceRequest {
  id: string;
  customerId: string;
  vehicleId: string;
  problemText: string;
  problemCategory?: string;
  status: 'requested' | 'accepted' | 'on-the-way' | 'arrived' | 'service' | 'completed' | 'cancelled';
  customerLat: number;
  customerLng: number;
  mechanicId?: string;
  mechanicName?: string;
  mechanicLat?: number;
  mechanicLng?: number;
  etaMin?: number;
  /** Mechanic the customer pre-selected on the request wizard, if any. */
  pickedMechanicId?: string;
  /** Server-authoritative offer expiry (epoch ms). A mechanic must accept before this. */
  offerExpiresAt?: number;
  /** Uids of mechanics that have declined this offer (analytics; does not affect matching). */
  declinedBy?: string[];
  /** Reason a mechanic released the job after accepting (operator audit signal). */
  releaseReason?: string;
  /** Free-text cancellation reason provided by the customer or admin. */
  cancellationReason?: string;
  /** Customer-supplied rating on completion. */
  rating?: number;
  /** Optional comment accompanying the rating. */
  comment?: string;
  createdAt: number;
  updatedAt: number;
}

/** Statuses where the customer is still allowed to cancel the request. */
export const CANCELLABLE_STATUSES = ['requested', 'accepted', 'on-the-way', 'arrived'] as const;

function requireDb() {
  const handle = db();
  if (!handle) throw new Error('Firebase is not configured.');
  return handle;
}

function asVehicle(id: string, raw: DocumentData | undefined): Vehicle | null {
  if (!raw) return null;
  return { id, ...(raw as Omit<Vehicle, 'id'>) };
}
function asRequest(id: string, raw: DocumentData | undefined): ServiceRequest | null {
  if (!raw) return null;
  return { id, ...(raw as Omit<ServiceRequest, 'id'>) };
}

export async function listVehicles(customerId: string): Promise<Vehicle[]> {
  try {
    const d = requireDb();
    const snap = await getDocs(query(collection(d, 'vehicles'), where('ownerId', '==', customerId), orderBy('createdAt', 'desc')));
    return snap.docs.map((s) => asVehicle(s.id, s.data())).filter((v): v is Vehicle => Boolean(v));
  } catch {
    return [];
  }
}

export async function addVehicle(customerId: string, v: Omit<Vehicle, 'id'>): Promise<Vehicle | null> {
  try {
    const d = requireDb();
    const id = `${customerId}-${Date.now()}`;
    const next: Vehicle = { id, ...v };
    await setDoc(doc(d, 'vehicles', id), { ...v, ownerId: customerId, createdAt: Date.now() });
    return next;
  } catch {
    return null;
  }
}

/** Server-authoritative window in which a mechanic may accept a queued request. */
export const OFFER_WINDOW_MS = 120_000;

/**
 * Tri-state outcome of a customer-initiated cancel attempt.
 *
 *  - `cancelled` — the request was successfully moved to `cancelled`.
 *  - `too_late`  — the request is already `completed` or `cancelled`; the
 *                  caller's button should not have been clickable in this
 *                  state, so we surface it as an error rather than swallow.
 *  - `forbidden` — the auth user is not the request's customer; the rules
 *                  rejected the write. The caller should not retry.
 *  - `error`     — Firebase is unconfigured, or an unknown failure happened.
 */
export type CancelResult = 'cancelled' | 'too_late' | 'forbidden' | 'error';

/**
 * Cancel a request as the customer who owns it.
 *
 * Uses a Firestore transaction so we read-modify-write atomically:
 *   - read the request doc
 *   - if `status` ∉ CANCELLABLE_STATUSES, return `too_late`
 *   - otherwise write `status = 'cancelled'` + `cancelledAt`, `cancelledBy = 'customer'`,
 *     optional `cancellationReason`, `updatedAt`, and return `cancelled`.
 *
 * Permission-denied maps to `'forbidden'` so the UI can show a precise
 * toast instead of a generic error.
 */
export async function cancelRequest(
  id: string,
  customerId: string,
  reason?: string,
): Promise<CancelResult> {
  try {
    const d = requireDb();
    const ref = doc(d, 'requests', id);
    return await runTransaction(d, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 'too_late' as const;
      const data = snap.data() as ServiceRequest;
      if (data.customerId !== customerId) return 'forbidden' as const;
      if (!(CANCELLABLE_STATUSES as readonly string[]).includes(data.status)) {
        return 'too_late' as const;
      }
      const patch: Record<string, unknown> = {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: 'customer',
        updatedAt: serverTimestamp(),
      };
      if (reason && reason.trim()) patch.cancellationReason = reason.trim();
      tx.update(ref, patch);
      return 'cancelled' as const;
    });
  } catch (e: unknown) {
    const code = (e as { code?: string } | null)?.code;
    if (code === 'permission-denied') return 'forbidden';
    return 'error';
  }
}

export async function createRequest(r: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<ServiceRequest | null> {
  try {
    const d = requireDb();
    const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const next: ServiceRequest = {
      id,
      status: 'requested',
      createdAt: now,
      updatedAt: now,
      offerExpiresAt: now + OFFER_WINDOW_MS,
      ...r,
    };
    await setDoc(doc(d, 'requests', id), next);
    return next;
  } catch {
    return null;
  }
}

export async function getRequest(id: string): Promise<ServiceRequest | null> {
  try {
    const d = requireDb();
    const snap = await getDoc(doc(d, 'requests', id));
    return asRequest(id, snap.data());
  } catch {
    return null;
  }
}

/**
 * Subscribe to a single request doc.
 *
 * Pass `onError` to surface Firestore failures (permission-denied,
 * unavailable, …) — without it, a denied read leaves the caller's
 * `state` stuck on `'loading'` because the success branch never
 * fires. The page is then responsible for rendering the error UI.
 */
export function watchRequest(
  id: string,
  cb: (r: ServiceRequest | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe | null {
  try {
    const d = requireDb();
    return onSnapshot(
      doc(d, 'requests', id),
      (snap) => cb(asRequest(snap.id, snap.data())),
      (err) => {
        // Without an onError handler we still treat the snapshot as
        // "no data" so the page renders its empty state instead of
        // staying on the loading skeleton forever.
        cb(null);
        onError?.(err);
      },
    );
  } catch (e) {
    onError?.(e instanceof Error ? e : new Error(String(e)));
    return null;
  }
}

export async function listHistory(customerId: string, max = 20): Promise<ServiceRequest[]> {
  try {
    const d = requireDb();
    const snap = await getDocs(
      query(collection(d, 'requests'),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc'),
        limit(max),
      ),
    );
    return snap.docs.map((s) => asRequest(s.id, s.data())).filter((r): r is ServiceRequest => Boolean(r));
  } catch {
    return [];
  }
}

export async function rateRequest(id: string, rating: number, comment?: string): Promise<boolean> {
  try {
    const d = requireDb();
    await updateDoc(doc(d, 'requests', id), { rating, comment: comment ?? '', ratedAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}
