import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { firebaseConfigured, auth as fbAuth } from './firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { fetchUserRole } from '@/lib/authProfile';

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
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<RoleStatus>('unknown');
  const [loading, setLoading] = useState<boolean>(firebaseConfigured);

  useEffect(() => {
    const a = fbAuth();
    if (!a) { setLoading(false); return; }
    const unsub = onAuthStateChanged(a, async (u) => {
      setUser(u);
      if (!u) { setRole('unknown'); setLoading(false); return; }
      // While we resolve the role we explicitly hold `role` at 'unknown'.
      // RequireAuth treats 'unknown' as "still loading" — it must not
      // bounce the user back to '/', which is what the previous null
      // state caused during the signup/profile race.
      try {
        const real = await fetchUserRole(u.uid);
        setRole(real as RoleStatus);
      } catch {
        setRole(null);
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
    const a = fbAuth();
    if (!a) { setUser(null); setRole('unknown'); return; }
    await fbSignOut(a);
    setUser(null);
    setRole('unknown');
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, role, loading, configured: firebaseConfigured, signIn, signUp, signOut,
  }), [user, role, loading, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
