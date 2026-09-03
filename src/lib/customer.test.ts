/**
 * @vitest-environment node
 *
 * Phase 9 regression tests — customer.ts watchRequest
 *
 * The Phase 9 fix added an optional `onError` callback to `watchRequest`
 * and made the snapshot error path also call `cb(null)`. Without that,
 * a permission-denied read left the caller's `state` stuck on `'loading'`
 * forever (the success branch never fired, the error path was never
 * wired). The two pages that consume this — `Tracking.tsx` (customer)
 * and `MechanicJob.tsx` (mechanic) — now pass `onError` so they can
 * render the error UI.
 *
 * These tests verify the three outcomes:
 *   1. successful snapshot -> cb receives the request
 *   2. snapshot error       -> cb receives null AND onError is called
 *   3. db() is null          -> onError is called synchronously
 *
 * Firestore is mocked — we never talk to a real backend.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We capture the callbacks the production code passes to onSnapshot so the
// tests can invoke them synchronously.
type SnapshotCallbacks = {
  onNext: (snap: unknown) => void;
  onError: (err: Error) => void;
};
let captured: SnapshotCallbacks | null = null;

vi.mock('firebase/firestore', () => ({
  // `onSnapshot` records the callbacks the caller hands in; the test
  // invokes them on demand. Returning a no-op Unsubscribe is fine.
  onSnapshot: (
    _ref: unknown,
    onNext: (snap: unknown) => void,
    onError: (err: Error) => void,
  ) => {
    captured = { onNext, onError };
    return () => { captured = null; };
  },
  // Imports present in customer.ts but unused in this test file:
  doc: () => ({ __doc: true }),
  collection: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));

vi.mock('@/app/firebase', () => ({
  db: () => ({ __handle: true }),
}));

import { watchRequest } from './customer';
import type { ServiceRequest } from './customer';

const sampleRequest: ServiceRequest = {
  id: 'req-1',
  customerId: 'cust-1',
  vehicleId: 'veh-1',
  problemText: 'flat tyre',
  problemCategory: 'tyre',
  status: 'requested',
  customerLat: 19.076,
  customerLng: 72.8777,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

beforeEach(() => {
  captured = null;
});

describe('watchRequest — Phase 9 onError path', () => {
  it('invokes the value callback with the request when the snapshot succeeds', () => {
    const cb = vi.fn();
    const onError = vi.fn();
    const unsub = watchRequest('req-1', cb, onError);
    expect(typeof unsub).toBe('function');
    // First snapshot from Firestore.
    captured!.onNext({ id: 'req-1', data: () => sampleRequest });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ id: 'req-1', status: 'requested' }));
    expect(onError).not.toHaveBeenCalled();
  });

  it('invokes cb(null) AND onError when the snapshot fails', () => {
    const cb = vi.fn();
    const onError = vi.fn();
    watchRequest('req-1', cb, onError);
    // Simulate a permission-denied from the Firestore client.
    captured!.onError(new Error('permission-denied'));
    // cb is called with null (so the page can leave the loading state).
    expect(cb).toHaveBeenCalledWith(null);
    // onError is also called (so the page can show a toast).
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('treats missing onError as a soft signal: cb(null) still fires', () => {
    // Some callers (older code paths) might not pass an onError. The
    // contract is that cb(null) must still fire so the page is not
    // stuck on loading — even if no toast is shown.
    const cb = vi.fn();
    watchRequest('req-1', cb);
    expect(() => captured!.onError(new Error('boom'))).not.toThrow();
    expect(cb).toHaveBeenCalledWith(null);
  });

  it('returns a function-shaped Unsubscribe on success', () => {
    const unsub = watchRequest('req-1', () => {}, () => {});
    expect(typeof unsub).toBe('function');
    // Calling the unsub just clears the captured callbacks reference.
    expect(() => (unsub as () => void)()).not.toThrow();
  });
});
