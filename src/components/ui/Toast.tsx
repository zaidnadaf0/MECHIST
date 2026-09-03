import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cx } from '@/lib/utils';

type ToastTone = 'info' | 'success' | 'warning' | 'danger';
interface Toast { id: string; title: string; description?: string; tone: ToastTone; }
interface ToastCtx { push: (t: Omit<Toast, 'id'>) => void; }

const ToastContext = createContext<ToastCtx | null>(null);

const accents: Record<ToastTone, string> = {
  info: 'bg-azure-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, ...t }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex w-[min(100%,22rem)] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className={cx('relative overflow-hidden rounded-xl border border-line-strong bg-surface-1/95 p-4 pl-5 shadow-pop backdrop-blur-md')}>
              <span aria-hidden className={cx('absolute inset-y-0 left-0 w-1', accents[t.tone])} />
              <div className="text-small font-medium text-fg-app">{t.title}</div>
              {t.description && <div className="mt-1 text-xs text-fg-muted">{t.description}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
