/**
 * Customer-facing data access. All accessors are null-safe: if Firebase is
 * not configured or the user is signed out, they return early instead of
 * throwing. Pages handle the empty/loading/error states themselves.
 */
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type DocumentData, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { isValidLatLng } from './geoapify';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  type: 'car' | 'bike' | 'van' | 'truck';
  isDefault?: boolean;
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
  /** Final amount in minor units (e.g. paise) when the job is completed; optional — older docs will not have it. */
  amountCents?: number;
  /** Service duration in minutes when known; optional — older docs will not have it. */
  durationMin?: number;
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

export type VehiclesResult = { data: Vehicle[] | null; error: Error | null };
export async function listVehiclesDetailed(customerId: string): Promise<VehiclesResult> {
  try {
    const d = requireDb();
    const snap = await getDocs(query(collection(d, 'vehicles'), where('ownerId', '==', customerId), orderBy('createdAt', 'desc')));
    return { data: snap.docs.map((s) => asVehicle(s.id, s.data())).filter((v): v is Vehicle => Boolean(v)), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function listVehicles(customerId: string): Promise<Vehicle[]> {
  const r = await listVehiclesDetailed(customerId);
  return r.data ?? [];
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

export function getVehicleSync(items: Vehicle[], id: string): Vehicle | null {
  return items.find((v) => v.id === id) ?? null;
}

export async function updateVehicle(vehicleId: string, patch: Partial<Omit<Vehicle, 'id'>>): Promise<boolean> {
  try {
    const d = requireDb();
    // Strip fields that must not be written directly.
    const { isDefault: _isDefault, ...rest } = patch as Record<string, unknown> & { isDefault?: unknown };
    // isDefault is managed via setDefaultVehicle to keep exactly one default.
    void _isDefault;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) clean[k] = v;
    }
    if (Object.keys(clean).length === 0) return false;
    // Do not allow ownerId overwrite via patch.
    delete (clean as Record<string, unknown>).ownerId;
    await updateDoc(doc(d, 'vehicles', vehicleId), clean);
    return true;
  } catch {
    return false;
  }
}

export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  try {
    const d = requireDb();
    await deleteDoc(doc(d, 'vehicles', vehicleId));
    return true;
  } catch {
    return false;
  }
}

export async function setDefaultVehicle(customerId: string, vehicleId: string): Promise<boolean> {
  try {
    const d = requireDb();
    const snap = await getDocs(query(collection(d, 'vehicles'), where('ownerId', '==', customerId)));
    if (snap.empty) return false;
    const targetExists = snap.docs.some((s) => s.id === vehicleId);
    if (!targetExists) return false;
    const batch = writeBatch(d);
    for (const s of snap.docs) {
      batch.update(s.ref, { isDefault: s.id === vehicleId });
    }
    await batch.commit();
    return true;
  } catch {
    return false;
  }
}

/** Server-authoritative window in which a mechanic may accept a queued request. */
export const OFFER_WINDOW_MS = 120_000;

// ---- createRequest validation + deduplication (Batch 1 rows 1 & 5) ----

const lastCreateAtByCustomer = new Map<string, number>();
export const CREATE_DEDUP_WINDOW_MS = 2000;

export function createRequestValidate(r: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): string | null {
  if (!r.customerId || typeof r.customerId !== 'string' || !r.customerId.trim()) return 'Customer is required.';
  if (!r.vehicleId || typeof r.vehicleId !== 'string' || !r.vehicleId.trim()) return 'Vehicle is required.';
  const text = typeof r.problemText === 'string' ? r.problemText.trim() : '';
  if (text.length < 5) return 'Describe the problem (at least 5 characters).';
  if (!Number.isFinite(r.customerLat) || !Number.isFinite(r.customerLng)) return 'Location is required.';
  if (!isValidLatLng({ lat: r.customerLat, lng: r.customerLng })) return 'Location is out of range.';
  return null;
}

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
  const validationError = createRequestValidate(r);
  if (validationError) return null;
  const nowForDedup = Date.now();
  const lastAt = lastCreateAtByCustomer.get(r.customerId) ?? 0;
  if (nowForDedup - lastAt < CREATE_DEDUP_WINDOW_MS) return null;
  lastCreateAtByCustomer.set(r.customerId, nowForDedup);
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
    lastCreateAtByCustomer.delete(r.customerId);
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

export type HistoryResult = { data: ServiceRequest[] | null; error: Error | null };
export async function listHistoryDetailed(customerId: string, max = 20): Promise<HistoryResult> {
  try {
    const d = requireDb();
    const snap = await getDocs(
      query(collection(d, 'requests'),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc'),
        limit(max),
      ),
    );
    return { data: snap.docs.map((s) => asRequest(s.id, s.data())).filter((r): r is ServiceRequest => Boolean(r)), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function listHistory(customerId: string, max = 20): Promise<ServiceRequest[]> {
  const r = await listHistoryDetailed(customerId, max);
  return r.data ?? [];
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
