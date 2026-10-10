/**
 * Shared notification subscription (Batch 1; error surfacing added Batch 5).
 *
 * `watchNotifications` opens one Firestore `onSnapshot` per call. The
 * customer portal needs the same inbox in two places at once — the
 * Notifications page and the PortalShell unread badge — so this module
 * keeps a single ref-counted subscription per uid. Every hook consumer
 * receives the same realtime array; the underlying listener is torn down
 * when the last consumer unmounts.
 *
 * Failures (permission-denied, unavailable) are published alongside the
 * data so pages can render an ErrorState instead of a misleading empty
 * inbox.
 */
import { useEffect, useState } from 'react';
import { watchNotifications, type AppNotification } from './notifications';

interface Entry {
  items: AppNotification[] | null;
  error: Error | null;
  refCount: number;
  unsub: (() => void) | null;
  listeners: Set<(items: AppNotification[] | null) => void>;
  errorListeners: Set<(err: Error | null) => void>;
}

const entries = new Map<string, Entry>();

function getEntry(uid: string): Entry {
  let e = entries.get(uid);
  if (!e) {
    e = { items: null, error: null, refCount: 0, unsub: null, listeners: new Set(), errorListeners: new Set() };
    entries.set(uid, e);
  }
  return e;
}

function publish(uid: string, items: AppNotification[] | null, error: Error | null): void {
  const e = entries.get(uid);
  if (!e) return;
  e.items = items;
  e.error = error;
  e.listeners.forEach((cb) => cb(items));
  e.errorListeners.forEach((cb) => cb(error));
}

export interface NotificationsState {
  items: AppNotification[] | null;
  error: Error | null;
}

/** Realtime inbox shared across consumers — same data as the Notifications page. */
export function useNotifications(uid: string | null | undefined): NotificationsState {
  const [items, setItems] = useState<AppNotification[] | null>(() =>
    uid ? (entries.get(uid)?.items ?? null) : null,
  );
  const [error, setError] = useState<Error | null>(() =>
    uid ? (entries.get(uid)?.error ?? null) : null,
  );

  useEffect(() => {
    if (!uid) {
      setItems(null);
      setError(null);
      return;
    }
    const e = getEntry(uid);
    e.refCount += 1;
    e.listeners.add(setItems);
    e.errorListeners.add(setError);
    // Replay the latest snapshot for late subscribers.
    if (e.items !== null) setItems(e.items);
    if (e.error !== null) setError(e.error);
    if (e.refCount === 1) {
      const unsub = watchNotifications(
        uid,
        (next) => publish(uid, next, null),
        (err) => publish(uid, [], err),
      );
      e.unsub = unsub ?? null;
    }
    return () => {
      e.listeners.delete(setItems);
      e.errorListeners.delete(setError);
      e.refCount = Math.max(0, e.refCount - 1);
      if (e.refCount === 0) {
        e.unsub?.();
        entries.delete(uid);
      }
    };
  }, [uid]);

  return { items, error };
}

/** Realtime unread count for the PortalShell badge. 0 when signed out. */
export function useUnreadCount(uid: string | null | undefined): number {
  const { items } = useNotifications(uid);
  if (!items) return 0;
  return items.reduce((n, it) => (it.read === true ? n : n + 1), 0);
}
