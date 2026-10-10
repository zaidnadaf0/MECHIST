/**
 * Notification inbox — per-user items under notifications/{uid}/items/{id}.
 *
 * - Owner-only reads (rules enforce isSelf(uid)).
 * - Creates are allowed from any signed-in user but payload shape is
 *   validated server-side (type/title string, bounded title).
 * - Updates are owner-only and restricted to the `read` flag.
 * - Realtime watch is capped (limit 20 default, hard cap 50).
 */
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { DEMO_NOTIFICATIONS, isDemo } from './demo';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  requestId?: string;
  /** Deep-link set by server producers (e.g. /track/:id, /mechanic/job/:id). */
  path?: string;
  createdAt: number;
  read?: boolean;
}

function asNotif(id: string, raw: DocumentData | undefined): AppNotification | null {
  if (!raw) return null;
  if (typeof raw.title !== 'string' || typeof raw.type !== 'string') return null;
  return { id, ...(raw as Omit<AppNotification, 'id'>) };
}

function requireDb() {
  const handle = db();
  if (!handle) throw new Error('Firebase is not configured.');
  return handle;
}

export type NotificationsResult = { data: AppNotification[] | null; error: Error | null };

export async function listNotifications(uid: string, max = 20): Promise<AppNotification[]> {
  const r = await listNotificationsDetailed(uid, max);
  return r.data ?? [];
}

export async function listNotificationsDetailed(uid: string, max = 20): Promise<NotificationsResult> {
  if (isDemo()) return { data: DEMO_NOTIFICATIONS.slice(0, Math.min(Math.max(1, max), 50)), error: null };
  try {
    const d = requireDb();
    const cap = Math.min(Math.max(1, max), 50);
    const snap = await getDocs(
      query(collection(d, `notifications/${uid}/items`), orderBy('createdAt', 'desc'), limit(cap)),
    );
    return {
      data: snap.docs.map((s) => asNotif(s.id, s.data())).filter((n): n is AppNotification => Boolean(n)),
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export function watchNotifications(
  uid: string,
  cb: (items: AppNotification[]) => void,
  onError?: (err: Error) => void,
  max = 20,
): Unsubscribe | null {
  if (isDemo()) {
    queueMicrotask(() => cb(DEMO_NOTIFICATIONS.slice(0, Math.min(Math.max(1, max), 50))));
    return null;
  }
  try {
    const d = requireDb();
    const cap = Math.min(Math.max(1, max), 50);
    return onSnapshot(
      query(collection(d, `notifications/${uid}/items`), orderBy('createdAt', 'desc'), limit(cap)),
      (snap) => {
        cb(snap.docs.map((s) => asNotif(s.id, s.data())).filter((n): n is AppNotification => Boolean(n)));
      },
      (err) => {
        cb([]);
        onError?.(err as Error);
      },
    );
  } catch (e) {
    onError?.(e instanceof Error ? e : new Error(String(e)));
    return null;
  }
}

export async function createNotification(
  uid: string,
  payload: Omit<AppNotification, 'id' | 'createdAt'> & { createdAt?: number },
): Promise<AppNotification | null> {
  try {
    const d = requireDb();
    if (!payload.title || payload.title.length > 120) return null;
    if (!payload.type || typeof payload.type !== 'string') return null;
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = payload.createdAt ?? Date.now();
    const { createdAt: _ignored, ...rest } = payload as Record<string, unknown>;
    void _ignored;
    const data = { ...(rest as Omit<AppNotification, 'id' | 'createdAt'>), id, createdAt: now, read: false } as AppNotification;
    await setDoc(doc(d, `notifications/${uid}/items`, id), data);
    return data;
  } catch {
    return null;
  }
}

export async function markRead(uid: string, notificationId: string): Promise<boolean> {
  try {
    const d = requireDb();
    await updateDoc(doc(d, `notifications/${uid}/items`, notificationId), { read: true });
    return true;
  } catch {
    return false;
  }
}

export async function markAllRead(uid: string): Promise<boolean> {
  try {
    const d = requireDb();
    const snap = await getDocs(
      query(collection(d, `notifications/${uid}/items`), orderBy('createdAt', 'desc'), limit(50)),
    );
    const unread = snap.docs.filter((s) => s.data().read !== true);
    if (unread.length === 0) return true;
    const batch = writeBatch(d);
    for (const s of unread) batch.update(s.ref, { read: true });
    await batch.commit();
    return true;
  } catch {
    return false;
  }
}
