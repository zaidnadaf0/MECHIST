/**
 * @vitest-environment node
 *
 * Phase 9 regression tests — admin.ts
 *
 * The Phase 9 fix changed `setUserRole` from `Promise<boolean>` to
 * `Promise<'ok' | 'forbidden' | 'error'>` so the admin UI can show the
 * right copy when the rules reject the write (admin claims must be
 * server-minted; a self-update of `users/{uid}.role` is permission-denied).
 *
 * These tests verify the result mapping for the three outcomes:
 *   1. successful write            -> 'ok'
 *   2. permission-denied            -> 'forbidden'
 *   3. any other Firestore failure  -> 'error'
 *
 * Firestore is mocked — we never talk to a real backend.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// `admin.ts` imports `doc`, `serverTimestamp`, and `updateDoc` from the
// Firebase SDK. We mock the whole module so the call is a controllable
// function rather than a real network request.
vi.mock('firebase/firestore', () => ({
  doc: () => ({ __doc: true }),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  updateDoc: vi.fn(),
  // The other named imports in admin.ts aren't exercised by these tests
  // but the module still has to be importable.
  collection: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(),
  where: vi.fn(),
}));

// `admin.ts` also imports `db` from `@/app/firebase`. The function `db()`
// returns a handle or `null`; if null, the module throws. We return a
// non-null sentinel so the call enters the try-branch where the real
// result-mapping logic lives.
vi.mock('@/app/firebase', () => ({
  db: () => ({ __handle: true }),
}));

import { updateDoc } from 'firebase/firestore';
import { setUserRole } from './admin';

const mockedUpdateDoc = vi.mocked(updateDoc);

beforeEach(() => {
  mockedUpdateDoc.mockReset();
});

describe('setUserRole — Phase 9 result mapping', () => {
  it('returns "ok" when updateDoc resolves', async () => {
    mockedUpdateDoc.mockResolvedValueOnce(undefined as never);
    const result = await setUserRole('uid-1', 'customer');
    expect(result).toBe('ok');
    expect(mockedUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it('returns "ok" for the second valid role value (mechanic)', async () => {
    mockedUpdateDoc.mockResolvedValueOnce(undefined as never);
    const result = await setUserRole('uid-2', 'mechanic');
    expect(result).toBe('ok');
  });

  it('returns "forbidden" when error.code is "permission-denied"', async () => {
    mockedUpdateDoc.mockRejectedValueOnce(
      Object.assign(new Error('Missing or insufficient permissions.'), {
        code: 'permission-denied',
      }),
    );
    const result = await setUserRole('uid-3', 'admin');
    expect(result).toBe('forbidden');
  });

  it('returns "forbidden" when error.code is "firestore/permission-denied"', async () => {
    mockedUpdateDoc.mockRejectedValueOnce(
      Object.assign(new Error('PERMISSION_DENIED'), {
        code: 'firestore/permission-denied',
      }),
    );
    const result = await setUserRole('uid-4', 'admin');
    expect(result).toBe('forbidden');
  });

  it('returns "forbidden" when only the error message contains PERMISSION_DENIED', async () => {
    // Some SDK versions don't set `code`; they only set the message.
    mockedUpdateDoc.mockRejectedValueOnce(
      new Error('Firestore: PERMISSION_DENIED: ...'),
    );
    const result = await setUserRole('uid-5', 'admin');
    expect(result).toBe('forbidden');
  });

  it('returns "error" on any other failure (e.g. unavailable)', async () => {
    mockedUpdateDoc.mockRejectedValueOnce(
      Object.assign(new Error('Service unavailable.'), {
        code: 'unavailable',
      }),
    );
    const result = await setUserRole('uid-6', 'customer');
    expect(result).toBe('error');
  });

  it('returns "error" when updateDoc throws a plain Error with no code', async () => {
    mockedUpdateDoc.mockRejectedValueOnce(new Error('boom'));
    const result = await setUserRole('uid-7', 'mechanic');
    expect(result).toBe('error');
  });
});
