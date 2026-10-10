/**
 * @vitest-environment node
 *
 * Phase 1C regression tests — admin claim authority.
 *
 * The security contract: functional admin access requires BOTH the profile
 * hint (users/{uid}.role === 'admin') for routing AND the Firebase ID-token
 * custom claim (token.admin === true) for authority. A doc-role admin
 * WITHOUT the claim gets nothing.
 *
 * Covered here (no backend — pure logic + mocked token reads):
 *   - isAdminAuthorized() gate matrix (TEST 4: claim recognized; TEST 6:
 *     role alone grants nothing; TEST 7: revoked claim loses access).
 *   - readAdminClaim() cached token read (true / false / missing / null
 *     user / throw-safety).
 *
 * Live claim mint/revoke/revocation-propagation (TEST 2/3/8/9/10) require
 * the emulator or a real project and are verified manually — see
 * docs/ADMIN_BOOTSTRAP.md. Firestore rule text is covered by
 * scripts/check-rules.mjs (R001/R030/R031).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getIdTokenResult: vi.fn(),
}));

vi.mock('@/app/firebase', () => ({
  db: () => ({ __handle: true }),
  auth: () => null,
}));

vi.mock('@/lib/demo', () => ({
  demoRole: () => 'customer',
  isDemo: () => false,
}));

import { isAdminAuthorized, readAdminClaim } from './authProfile';

function mockUser(claims: Record<string, unknown> | null) {
  return {
    getIdTokenResult: vi.fn(async (_force?: boolean) =>
      claims === null ? { claims: {} } : { claims },
    ),
  };
}

describe('isAdminAuthorized — claim + hint gate', () => {
  it('TEST 4: admin hint + admin claim grants access', () => {
    expect(isAdminAuthorized('admin', true)).toBe(true);
  });

  it('TEST 6: users.role alone grants nothing without the claim', () => {
    expect(isAdminAuthorized('admin', false)).toBe(false);
    expect(isAdminAuthorized('admin', null)).toBe(false);
    expect(isAdminAuthorized('admin', undefined)).toBe(false);
  });

  it('claim alone without the admin hint grants nothing', () => {
    expect(isAdminAuthorized('customer', true)).toBe(false);
    expect(isAdminAuthorized('mechanic', true)).toBe(false);
    expect(isAdminAuthorized(null, true)).toBe(false);
    expect(isAdminAuthorized(undefined, true)).toBe(false);
  });

  it('TEST 7: neither hint nor claim grants nothing', () => {
    expect(isAdminAuthorized('customer', false)).toBe(false);
    expect(isAdminAuthorized(null, null)).toBe(false);
    expect(isAdminAuthorized(undefined, undefined)).toBe(false);
  });
});

describe('readAdminClaim — cached token read', () => {
  it('returns true when the cached token carries admin === true', async () => {
    const u = mockUser({ admin: true });
    await expect(readAdminClaim(u)).resolves.toBe(true);
    expect(u.getIdTokenResult).toHaveBeenCalledWith(false);
  });

  it('returns false when the claim is missing (revoked or never granted)', async () => {
    await expect(readAdminClaim(mockUser({}))).resolves.toBe(false);
    await expect(readAdminClaim(mockUser(null))).resolves.toBe(false);
    await expect(readAdminClaim(mockUser({ admin: false }))).resolves.toBe(false);
  });

  it('returns null with no signed-in user', async () => {
    await expect(readAdminClaim(null)).resolves.toBe(null);
    await expect(readAdminClaim(undefined)).resolves.toBe(null);
  });

  it('returns false instead of throwing when the token read fails', async () => {
    const u = { getIdTokenResult: vi.fn(async () => { throw new Error('network'); }) };
    await expect(readAdminClaim(u)).resolves.toBe(false);
  });
});
