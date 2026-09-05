/**
 * Admin-facing data access. All accessors are null-safe.
 * Batch 3 row 8 — adminAssign/adminReassign via existing matching primitives, admin-only transactional via runTransaction; rules isClaimAdmin() is authoritative — helpers do not bypass rules, they surface typed outcomes and handle races.
 * Callers: RequestsQueue.tsx (added in Batch 3). Affected API: requests/{id} status/mechanicId/mechanicName/etaMin/offerExpiresAt. Schema: ServiceRequest (src/lib/customer.ts). Verbatim: Batch 3 row 8 Admin Assign/Reassign via forceRematch/assignTopCandidate/matching primitives admin-only transactional handle races do not bypass rules.
 */
import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where,
  type DocumentData, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import type { ServiceRequest } from './customer';
import type { MechanicProfile } from './mechanic';

function requireDb() {
  const handle = db();
  if (!handle) throw new Error('Firebase is not configured.');
  return handle;
}

function asMechanic(id: string, raw: DocumentData | undefined): MechanicProfile | null {
  if (!raw) return null;
  return { id, ...(raw as Omit<MechanicProfile, 'id'>) };
}
function asRequest(id: string, raw: DocumentData | undefined): ServiceRequest | null {
  if (!raw) return null;
  return { id, ...(raw as Omit<ServiceRequest, 'id'>) };
}

export interface UserSummary {
  id: string;
  email?: string;
  displayName?: string;
  role?: 'customer' | 'mechanic' | 'admin';
  createdAt?: number;
}

export async function listAllMechanics(max = 100): Promise<MechanicProfile[]> {
  try {
    const d = requireDb();
    const snap = await getDocs(query(collection(d, 'mechanics'), orderBy('name', 'asc'), limit(max)));
    return snap.docs.map((s) => asMechanic(s.id, s.data())).filter((m): m is MechanicProfile => Boolean(m));
  } catch { return []; }
}

/** Realtime variant: streams every mechanic as it changes. */
export function watchAllMechanics(max = 100, cb: (items: MechanicProfile[]) => void, onError?: (err: Error) => void): Unsubscribe | null {
  try {
    const d = requireDb();
    return onSnapshot(
      query(collection(d, 'mechanics'), orderBy('name', 'asc'), limit(max)),
      (snap) => cb(snap.docs.map((s) => asMechanic(s.id, s.data())).filter((m): m is MechanicProfile => Boolean(m))),
      (err) => { cb([]); onError?.(err as Error); },
    );
  } catch { return null; }
}

export async function approveMechanic(id: string, approved: boolean): Promise<boolean> {
  try {
    const d = requireDb();
    await updateDoc(doc(d, 'mechanics', id), {
      approved,
      verificationStatus: approved ? 'approved' : 'rejected',
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch { return false; }
}

export async function upsertMechanic(profile: MechanicProfile): Promise<boolean> {
  try {
    const d = requireDb();
    const { id, ...rest } = profile;
    await setDoc(doc(d, 'mechanics', id), { ...rest, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch { return false; }
}

export async function listAllRequests(max = 200): Promise<ServiceRequest[]> {
  try {
    const d = requireDb();
    const snap = await getDocs(query(collection(d, 'requests'), orderBy('createdAt', 'desc'), limit(max)));
    return snap.docs.map((s) => asRequest(s.id, s.data())).filter((r): r is ServiceRequest => Boolean(r));
  } catch { return []; }
}

/** Realtime variant: streams every request as it changes. */
export function watchAllRequests(max = 200, cb: (items: ServiceRequest[]) => void, onError?: (err: Error) => void): Unsubscribe | null {
  try {
    const d = requireDb();
    return onSnapshot(
      query(collection(d, 'requests'), orderBy('createdAt', 'desc'), limit(max)),
      (snap) => cb(snap.docs.map((s) => asRequest(s.id, s.data())).filter((r): r is ServiceRequest => Boolean(r))),
      (err) => { cb([]); onError?.(err as Error); },
    );
  } catch { return null; }
}

export async function cancelRequest(id: string): Promise<boolean> {
  try {
    const d = requireDb();
    await updateDoc(doc(d, 'requests', id), { status: 'cancelled', updatedAt: serverTimestamp() });
    return true;
  } catch { return false; }
}

export async function listUsers(max = 200): Promise<UserSummary[]> {
  try {
    const d = requireDb();
    const snap = await getDocs(query(collection(d, 'users'), limit(max)));
    return snap.docs.map((s) => ({ id: s.id, ...(s.data() as Omit<UserSummary, 'id'>) }));
  } catch { return []; }
}

/** Realtime variant: streams users as they change. */
export function watchUsers(max = 200, cb: (items: UserSummary[]) => void, onError?: (err: Error) => void): Unsubscribe | null {
  try {
    const d = requireDb();
    return onSnapshot(
      query(collection(d, 'users'), limit(max)),
      (snap) => cb(snap.docs.map((s) => ({ id: s.id, ...(s.data() as Omit<UserSummary, 'id'>) }))),
      (err) => { cb([]); onError?.(err as Error); },
    );
  } catch { return null; }
}

/**
 * Set a user's role.
 *
 * Note: changing a role to/from 'admin' is intentionally blocked by the
 * Firestore security rules (the admin `role` claim is server-mintable
 * only). This function returns `'forbidden-claim-required'` in that
 * case so the admin UI can surface the right copy.
 */
export type SetUserRoleResult = 'ok' | 'forbidden' | 'error';

export async function setUserRole(
  uid: string,
  role: UserSummary['role'],
): Promise<SetUserRoleResult> {
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
      return 'forbidden';
    }
    return 'error';
  }
}

export async function getStats(): Promise<{ requests: number; mechanics: number; users: number }> {
  try {
    const d = requireDb();
    const [r, m, u] = await Promise.all([
      getDocs(query(collection(d, 'requests'), where('status', '==', 'requested'))),
      getDocs(collection(d, 'mechanics')),
      getDocs(collection(d, 'users')),
    ]);
    return { requests: r.size, mechanics: m.size, users: u.size };
  } catch { return { requests: 0, mechanics: 0, users: 0 }; }
}

/** Row 8 — transactional, race-safe admin assignment primitives. */

/** Statuses where an admin assignment/reassign is allowed to act. */
const ADMIN_ASSIGNABLE: ReadonlySet<string> = new Set(['requested', 'accepted', 'on-the-way', 'arrived', 'service']);
export type AdminAssignResult = 'assigned' | 'invalid_state' | 'forbidden' | 'error';

/** Read the mechanic's display name from mechanics/{uid}. Returns null when not found. */
async function mechanicDisplayName(mechanicId: string): Promise<string | null> {
  try {
    const d = requireDb();
    const snap = await getDoc(doc(d, 'mechanics', mechanicId));
    if (!snap.exists()) return null;
    const raw = snap.data() as { name?: string; displayName?: string };
    const n = (raw.name ?? raw.displayName ?? '').trim();
    return n || mechanicId;
  } catch { return null; }
}

/**
 * Admin → assign a queued request to a mechanic.
 * Transactional and race-safe: if the request has already been accepted
 * by a mechanic, this returns `invalid_state` instead of overwriting — the
 * caller's UI should refresh and show the new assignee. `isClaimAdmin()` is
 * the authoritative gate in firestore.rules; a non-admin caller gets
 * `forbidden` (permission-denied) from the transaction commit.
 */
export async function adminAssignRequest(
  requestId: string,
  mechanicId: string,
  opts: { etaMin?: number; offerWindowMs?: number } = {},
): Promise<AdminAssignResult> {
  try {
    const d = requireDb();
    const ref = doc(d, 'requests', requestId);
    const mechName = await mechanicDisplayName(mechanicId);
    if (!mechName) return 'error';
    return await runTransaction(d, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 'invalid_state' as const;
      const data = snap.data() as ServiceRequest;
      if (!ADMIN_ASSIGNABLE.has(data.status)) return 'invalid_state' as const;
      // Don't clobber an in-flight accepted assignment unless caller
      // explicitly wants a reassignment (use adminReassignRequest).
      if (data.mechanicId && data.mechanicId !== mechanicId && data.status !== 'requested') {
        return 'invalid_state' as const;
      }
      const eta = opts.etaMin ?? data.etaMin ?? 15;
      const windowMs = opts.offerWindowMs ?? 120_000;
      tx.update(ref, {
        status: 'accepted',
        mechanicId,
        mechanicName: mechName,
        etaMin: eta,
        offerExpiresAt: Date.now() + windowMs,
        updatedAt: serverTimestamp(),
      });
      return 'assigned' as const;
    });
  } catch (e: unknown) {
    const code = (e as { code?: string } | null)?.code;
    if (code === 'permission-denied') return 'forbidden';
    return 'error';
  }
}

/**
 * Admin → reassign an in-flight request from its current mechanic to another.
 * Transactional, race-safe, admin-only (isClaimAdmin branch). Surfaces the
 * same typed outcomes as adminAssignRequest without bypassing rules.
 */
export async function adminReassignRequest(
  requestId: string,
  mechanicId: string,
  opts: { etaMin?: number; offerWindowMs?: number; reason?: string } = {},
): Promise<AdminAssignResult> {
  try {
    const d = requireDb();
    const ref = doc(d, 'requests', requestId);
    const mechName = await mechanicDisplayName(mechanicId);
    if (!mechName) return 'error';
    return await runTransaction(d, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 'invalid_state' as const;
      const data = snap.data() as ServiceRequest;
      if (!ADMIN_ASSIGNABLE.has(data.status)) return 'invalid_state' as const;
      const update: Record<string, unknown> = {
        status: 'accepted',
        mechanicId,
        mechanicName: mechName,
        etaMin: opts.etaMin ?? data.etaMin ?? 15,
        offerExpiresAt: Date.now() + (opts.offerWindowMs ?? 120_000),
        updatedAt: serverTimestamp(),
      };
      if (opts.reason && opts.reason.trim()) update.adminReassignReason = opts.reason.trim();
      tx.update(ref, update);
      return 'assigned' as const;
    });
  } catch (e: unknown) {
    const code = (e as { code?: string } | null)?.code;
    if (code === 'permission-denied') return 'forbidden';
    return 'error';
  }
}

/** Row 9 — diagnostics/analytics + CSV helpers (real Firestore data only). */

export type OpsStats = {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  avgEtaMin: number | null;
  completedRevenueCents: number | null;
  avgDurationMin: number | null;
};

/** Aggregate operational stats from requests (real data; capped read). */
export async function getOpsStats(max = 200): Promise<OpsStats> {
  try {
    const d = requireDb();
    const snap = await getDocs(query(collection(d, 'requests'), orderBy('createdAt', 'desc'), limit(max)));
    const rows = snap.docs.map((s) => s.data() as ServiceRequest & Record<string, unknown>);
    const total = rows.length;
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let etaSum = 0; let etaN = 0;
    let revSum = 0; let revN = 0;
    let durSum = 0; let durN = 0;
    for (const r of rows) {
      const st = (r.status ?? 'unknown') as string;
      byStatus[st] = (byStatus[st] ?? 0) + 1;
      const cat = (r.problemCategory ?? 'other') as string;
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      if (typeof r.etaMin === 'number' && Number.isFinite(r.etaMin)) { etaSum += r.etaMin; etaN++; }
      if (typeof (r as ServiceRequest).amountCents === 'number' && Number.isFinite((r as ServiceRequest).amountCents!)) { revSum += (r as ServiceRequest).amountCents!; revN++; }
      if (typeof (r as ServiceRequest).durationMin === 'number' && Number.isFinite((r as ServiceRequest).durationMin!)) { durSum += (r as ServiceRequest).durationMin!; durN++; }
    }
    return {
      total,
      byStatus,
      byCategory,
      avgEtaMin: etaN ? Math.round((etaSum / etaN) * 10) / 10 : null,
      completedRevenueCents: revN ? revSum : null,
      avgDurationMin: durN ? Math.round((durSum / durN) * 10) / 10 : null,
    };
  } catch {
    return { total: 0, byStatus: {}, byCategory: {}, avgEtaMin: null, completedRevenueCents: null, avgDurationMin: null };
  }
}

/** Serialise requests as CSV (header + rows). Caller is responsible for download wiring. */
export function toCsv(rows: ServiceRequest[]): string {
  const esc = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = ['id','status','problemCategory','customerId','mechanicId','createdAt','updatedAt','etaMin','amountCents','durationMin','rating'].map(esc).join(',');
  const lines = rows.map((r) => [
    r.id, r.status, r.problemCategory ?? '', r.customerId ?? '', r.mechanicId ?? '',
    new Date(r.createdAt).toISOString(), new Date(r.updatedAt).toISOString(),
    r.etaMin ?? '', r.amountCents ?? '', r.durationMin ?? '', r.rating ?? '',
  ].map(esc).join(','));
  return [header, ...lines].join('\n');
}

/** Fetch up to `max` requests for export (admin-only read per rules). */
export async function fetchRequestsForExport(max = 500): Promise<ServiceRequest[]> {
  try {
    const d = requireDb();
    const cap = Math.min(Math.max(1, max), 1000);
    const snap = await getDocs(query(collection(d, 'requests'), orderBy('createdAt', 'desc'), limit(cap)));
    return snap.docs.map((s) => asRequest(s.id, s.data())).filter((r): r is ServiceRequest => Boolean(r));
  } catch { return []; }
}

/** Trigger a browser download of `content` as `filename`. No-op outside browser. */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

/** Realtime stats: re-emits whenever any of the three collections changes. */
export function watchStats(cb: (s: { requests: number; mechanics: number; users: number }) => void, onError?: (err: Error) => void): Unsubscribe | null {
  try {
    const d = requireDb();
    // Per-collection cache. We only re-fetch the collection whose snapshot
    // fired, instead of re-running all three `getDocs` on any change.
    let requests = 0;
    let mechanics = 0;
    let users = 0;
    let ready = { requests: false, mechanics: false, users: false };
    const emit = () => {
      if (ready.requests && ready.mechanics && ready.users) {
        cb({ requests, mechanics, users });
      }
    };
    const a = onSnapshot(
      query(collection(d, 'requests'), where('status', '==', 'requested')),
      (snap) => { requests = snap.size; ready.requests = true; emit(); },
      (err) => { onError?.(err as Error); ready.requests = true; emit(); },
    );
    const b = onSnapshot(
      collection(d, 'mechanics'),
      (snap) => { mechanics = snap.size; ready.mechanics = true; emit(); },
      (err) => { onError?.(err as Error); ready.mechanics = true; emit(); },
    );
    const c = onSnapshot(
      collection(d, 'users'),
      (snap) => { users = snap.size; ready.users = true; emit(); },
      (err) => { onError?.(err as Error); ready.users = true; emit(); },
    );
    return () => { a(); b(); c(); };
  } catch { return null; }
}

export async function adminGetMechanic(id: string): Promise<MechanicProfile | null> {
  try {
    const d = requireDb();
    const snap = await getDoc(doc(d, 'mechanics', id));
    return asMechanic(id, snap.data());
  } catch { return null; }
}
