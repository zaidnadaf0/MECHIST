import { useNavigate } from 'react-router-dom';
import { isDemo, demoRole } from '@/lib/demo';
import { useAuth } from '@/app/AuthProvider';

/** Fixed banner shown on every route while demo preview is active. */
export function DemoBanner() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  if (!isDemo()) return null;
  const role = demoRole();
  const go = (r: 'customer' | 'mechanic' | 'admin') => {
    if (r === role) return;
    try { localStorage.setItem('mechist.demo.v1', r); } catch { /* ignore */ }
    navigate(r === 'admin' ? '/admin' : r === 'mechanic' ? '/mechanic' : '/dashboard');
    window.location.reload();
  };
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-2 bg-warning-500/95 px-3 py-1.5 text-center text-xs font-medium text-ink-900">
      <span>DEMO PREVIEW — sample browser data, not real. Backend: Firestore DB missing.</span>
      <span className="inline-flex gap-1">
        {(['customer', 'mechanic', 'admin'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => go(r)}
            className={`rounded px-2 py-0.5 font-mono ${r === role ? 'bg-ink-900 text-white' : 'bg-white/60 hover:bg-white'}`}
          >
            {r}
          </button>
        ))}
      </span>
      <button
        type="button"
        onClick={() => void signOut().then(() => navigate('/'))}
        className="rounded bg-ink-900 px-2 py-0.5 text-white"
      >
        Exit demo
      </button>
    </div>
  );
}
