/**
 * Realtime Firestore hooks.
 *
 * Wraps `onSnapshot` for component-level subscriptions so we don't
 * repeat the same effect/cleanup pair in every page. The hooks:
 *
 *   - return `null` while loading,
 *   - clear their subscription on unmount or when the query key changes,
 *   - return `null` and stay there if Firebase is not configured,
 *     matching the null-safe style of the rest of the lib.
 */
import { useEffect, useState } from 'react';
import {
  collection, doc, onSnapshot, query,
  type Firestore, type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/app/firebase';

/** A real-time collection query. */
export function useFirestoreQuery<T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
): T[] | null {
  const [items, setItems] = useState<T[] | null>(null);
  // Build a stable key from the collection name + constraints so the
  // effect re-runs only when the caller actually changed the query.
  const key = `${collectionName}::${constraints.map((c) => c.toString()).join('|')}`;

  useEffect(() => {
    const handle = db();
    if (!handle) { setItems(null); return; }
    const ref = query(collection(handle, collectionName), ...constraints);
    const unsub = onSnapshot(
      ref,
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as T))),
      () => setItems([]),
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return items;
}

/** A real-time single doc. `null` means "no such doc" or "Firebase off". */
export function useFirestoreDoc<T>(collectionName: string, id: string | null): T | null | 'loading' {
  const [row, setRow] = useState<T | null | 'loading'>('loading');
  useEffect(() => {
    if (!id) { setRow(null); return; }
    const handle = db();
    if (!handle) { setRow(null); return; }
    const ref = doc(handle, collectionName, id);
    const unsub = onSnapshot(
      ref,
      (snap) => snap.exists() ? setRow({ id: snap.id, ...(snap.data() as object) } as T) : setRow(null),
      () => setRow(null),
    );
    return () => unsub();
  }, [collectionName, id]);
  return row;
}

// Re-export so admin.ts can keep one import path.
export type { Firestore };
