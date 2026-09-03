/**
 * Admin-facing data access. All accessors are null-safe.
 */
import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
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
export function watchAllMechanics(max = 100, cb: (items: MechanicProfile[]) => void): Unsubscribe | null {
  try {
    const d = requireDb();
    return onSnapshot(
      query(collection(d, 'mechanics'), orderBy('name', 'asc'), limit(max)),
      (snap) => cb(snap.docs.map((s) => asMechanic(s.id, s.data())).filter((m): m is MechanicProfile => Boolean(m))),
      () => cb([]),
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
export function watchAllRequests(max = 200, cb: (items: ServiceRequest[]) => void): Unsubscribe | null {
  try {
    const d = requireDb();
    return onSnapshot(
      query(collection(d, 'requests'), orderBy('createdAt', 'desc'), limit(max)),
      (snap) => cb(snap.docs.map((s) => asRequest(s.id, s.data())).filter((r): r is ServiceRequest => Boolean(r))),
      () => cb([]),
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
export function watchUsers(max = 200, cb: (items: UserSummary[]) => void): Unsubscribe | null {
  try {
    const d = requireDb();
    return onSnapshot(
      query(collection(d, 'users'), limit(max)),
      (snap) => cb(snap.docs.map((s) => ({ id: s.id, ...(s.data() as Omit<UserSummary, 'id'>) }))),
      () => cb([]),
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

/** Realtime stats: re-emits whenever any of the three collections changes. */
export function watchStats(cb: (s: { requests: number; mechanics: number; users: number }) => void): Unsubscribe | null {
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
      () => { ready.requests = true; emit(); },
    );
    const b = onSnapshot(
      collection(d, 'mechanics'),
      (snap) => { mechanics = snap.size; ready.mechanics = true; emit(); },
      () => { ready.mechanics = true; emit(); },
    );
    const c = onSnapshot(
      collection(d, 'users'),
      (snap) => { users = snap.size; ready.users = true; emit(); },
      () => { ready.users = true; emit(); },
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
