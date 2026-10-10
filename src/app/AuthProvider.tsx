import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { firebaseConfigured, auth as fbAuth } from './firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { fetchUserRole, readAdminClaim } from '@/lib/authProfile';
import { demoRole, demoUser, exitDemo, isDemo } from '@/lib/demo';

export type AppRole = 'customer' | 'mechanic' | 'admin' | null;
/**
 * Role resolution is tri-state:
 *   - 'unknown'  → user is signed in but we have not yet resolved the role
 *                  (the Firestore users/{uid}.role read is in flight). The
 *                  route guards must NOT bounce the user during this window.
 *   - 'customer' | 'mechanic' | 'admin'  → resolved.
 *   - null        → resolution completed and the user genuinely has no role.
 */
export type RoleStatus = 'unknown' | 'customer' | 'mechanic' | 'admin' | null;

export interface AuthState {
  user: User | null;
  role: RoleStatus;
  /**
   * Admin authority from the Firebase ID-token custom claim (Phase 1C).
   *   - null  → unknown (resolving, or no signed-in user).
   *   - true  → token carries admin === true (authoritative admin).
   *   - false → signed in without the claim (never an admin, even when
   *             users/{uid}.role reads 'admin' — that field is a hint).
   * In demo preview there is no token; it mirrors the demo role.
   */
  isAdmin: boolean | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Force-refresh the ID token (picks up a freshly granted/revoked claim)
   * and re-resolve role + claim. Single-shot by design — call it from an
   * explicit user action or a permission-denied recovery path, never in a
   * render loop or on a timer.
   */
  refreshAdminClaim: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<RoleStatus>('unknown');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(firebaseConfigured);

  useEffect(() => {
    // Demo preview (BACKUP-style): no Firebase round-trip. Role comes from
    // the demo flag so every portal is visible without a live database.
    if (isDemo()) {
      const r = demoRole();
      setUser(demoUser(r));
      setRole(r);
      setIsAdmin(r === 'admin');
      setLoading(false);
      return;
    }
    const a = fbAuth();
    if (!a) { setLoading(false); return; }
    const unsub = onAuthStateChanged(a, async (u) => {
      setUser(u);
      if (!u) { setRole('unknown'); setIsAdmin(null); setLoading(false); return; }
      // While we resolve the role we explicitly hold `role` at 'unknown'.
      // RequireAuth treats 'unknown' as "still loading" — it must not
      // bounce the user back to '/', which is what the previous null
      // state caused during the signup/profile race.
      try {
        const [real, claim] = await Promise.all([fetchUserRole(u.uid), readAdminClaim(u)]);
        setRole(real as RoleStatus);
        setIsAdmin(claim);
      } catch {
        setRole(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const a = fbAuth();
    if (!a) throw new Error('Firebase is not configured. Add your keys to .env.local.');
    await signInWithEmailAndPassword(a, email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const a = fbAuth();
    if (!a) throw new Error('Firebase is not configured. Add your keys to .env.local.');
    await createUserWithEmailAndPassword(a, email, password);
  }, []);

  const signOut = useCallback(async () => {
    if (isDemo()) { exitDemo(); setUser(null); setRole('unknown'); setIsAdmin(null); return; }
    const a = fbAuth();
    if (!a) { setUser(null); setRole('unknown'); setIsAdmin(null); return; }
    await fbSignOut(a);
    setUser(null);
    setRole('unknown');
    setIsAdmin(null);
  }, []);

  const refreshAdminClaim = useCallback(async () => {
    const a = fbAuth();
    const u = a?.currentUser;
    if (!u) { setIsAdmin(null); return; }
    try {
      // Force-refresh picks up a freshly granted/revoked claim without a
      // full sign-out/sign-in cycle.
      await u.getIdToken(true);
      const [real, claim] = await Promise.all([fetchUserRole(u.uid), readAdminClaim(u)]);
      setRole(real as RoleStatus);
      setIsAdmin(claim);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, role, isAdmin, loading, configured: firebaseConfigured, signIn, signUp, signOut, refreshAdminClaim,
  }), [user, role, isAdmin, loading, signIn, signUp, signOut, refreshAdminClaim]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
