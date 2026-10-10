/**
 * Public-facing data access — the customer-safe mechanic projection.
 *
 * Phase 1D: these readers query `publicMechanics/{uid}`, a server-generated
 * projection containing ONLY safe fields (name, availability, specialties,
 * rating, coarse baseLat/baseLng rounded to ~1.1 km, …). Exact home/garage
 * coordinates, live GPS, garage address and contact fields NEVER reach the
 * client through this module. The private `mechanics/{uid}` parent doc is
 * owner + claim-admin only (see firestore.rules).
 *
 * This module is the only place that constructs those public reads; pages
 * should never hand-write Firestore queries for public data.
 *
 * All accessors are null-safe: if Firebase is not configured, they
 * return early and the page renders the empty/error state itself.
 */
import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, where,
  type DocumentData, type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import type { MechanicProfile } from './mechanic';
import { DEMO_MECHANICS, isDemo } from './demo';

function requireDb() {
  const handle = db();
  if (!handle) throw new Error('Firebase is not configured.');
  return handle;
}

function asMechanic(id: string, raw: DocumentData | undefined): MechanicProfile | null {
  if (!raw) return null;
  return { id, ...(raw as Omit<MechanicProfile, 'id'>) };
}

/** Public alias of `MechanicProfile` — kept distinct for clarity at call sites. */
export type PublicMechanic = MechanicProfile;

/**
 * One-shot read of the public mechanic roster.
 * Filters to mechanics the customer is actually allowed to see:
 *   - `approved === true`
 *   - `isAvailable === true`
 */
export async function listPublicMechanics(max = 100): Promise<MechanicProfile[]> {
  if (isDemo()) return DEMO_MECHANICS.filter((m) => m.approved && m.isAvailable).slice(0, max);
  try {
    const d = requireDb();
    const snap = await getDocs(
      query(
        collection(d, 'mechanics'),
        where('approved', '==', true),
        where('isAvailable', '==', true),
        orderBy('name', 'asc'),
        limit(max),
      ),
    );
    return snap.docs.map((s) => asMechanic(s.id, s.data())).filter((m): m is MechanicProfile => Boolean(m));
  } catch {
    return [];
  }
}

/** Realtime variant: streams the public roster as availability changes. */
export function watchPublicMechanics(max = 100, cb: (items: MechanicProfile[]) => void, onError?: (err: Error) => void): Unsubscribe | null {
  if (isDemo()) {
    queueMicrotask(() => cb(DEMO_MECHANICS.filter((m) => m.approved && m.isAvailable).slice(0, max)));
    return null;
  }
  try {
    const d = requireDb();
    return onSnapshot(
      query(
        collection(d, 'mechanics'),
        where('approved', '==', true),
        where('isAvailable', '==', true),
        orderBy('name', 'asc'),
        limit(max),
      ),
      (snap) => cb(snap.docs.map((s) => asMechanic(s.id, s.data())).filter((m): m is MechanicProfile => Boolean(m))),
      (err) => { cb([]); onError?.(err as Error); },
    );
  } catch {
    return null;
  }
}

/**
 * Higher-limit one-shot for the customer request flow, which needs enough
 * candidates to filter through `nearbyMechanics()` (radius + specialty).
 * Same filter rules as `listPublicMechanics`; just a larger default.
 */
export async function listAllPublicMechanics(max = 200): Promise<MechanicProfile[]> {
  return listPublicMechanics(max);
}

/** Realtime variant for the customer request flow. */
export function watchAllPublicMechanics(max = 200, cb: (items: MechanicProfile[]) => void, onError?: (err: Error) => void): Unsubscribe | null {
  return watchPublicMechanics(max, cb, onError);
}
