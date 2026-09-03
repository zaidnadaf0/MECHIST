import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { cx } from '@/lib/utils';

export interface HeroVideoDialogProps {
  /** Children are rendered as the trigger thumbnail. */
  children: ReactNode;
  /** Public URL of the muted autoplay preview. */
  videoSrc: string;
  /** Optional poster image shown on the trigger. */
  posterSrc?: string;
  /** Optional accessible title. */
  title?: string;
  className?: string;
}

/**
 * HeroVideoDialog — Magic-UI-style trigger that opens a centered
 * modal with an inline HTML5 muted-loop video. Reduced-motion users
 * still get the dialog but the entrance has no scale/spring.
 */
export function HeroVideoDialog({
  children,
  videoSrc,
  posterSrc,
  title = 'Product preview',
  className,
}: HeroVideoDialogProps) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={`Open video: ${title}`}
        onClick={() => setOpen(true)}
        className={cx(
          'group/hv relative isolate inline-flex items-center justify-center',
          'rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-app',
          className,
        )}
      >
        {children}
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center rounded-2xl bg-aqua-500/0 transition-colors duration-300 group-hover/hv:bg-aqua-500/10"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-ink-900 shadow-2xl ring-1 ring-line-soft transition-transform duration-300 group-hover/hv:scale-110">
            <Play size={20} className="ml-0.5" fill="currentColor" />
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-ink-900/85 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <motion.div
              className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-line-soft bg-surface-1 shadow-2xl"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25, ease: [0.21, 0.5, 0.4, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close video"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-ink-900/70 text-white hover:bg-ink-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-300"
              >
                <X size={16} />
              </button>
              <video
                src={videoSrc}
                poster={posterSrc}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="block w-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
