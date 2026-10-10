/**
 * Shared star-rating display (Batch 5 consistency pass).
 *
 * Display-only: reads the persisted 1–5 rating (server-aggregated for
 * mechanics, customer-supplied for requests). Never computes an
 * aggregate on the client. Renders nothing when there is no rating —
 * callers decide the empty copy ("New on network", "No ratings yet").
 */
export function Stars({ value, size = 'sm', label }: { value: number; size?: 'xs' | 'sm' | 'md'; label?: string }) {
  const clamped = Math.max(0, Math.min(5, value));
  const px = size === 'xs' ? 12 : size === 'md' ? 20 : 16;
  return (
    <span
      role="img"
      aria-label={label ?? `Rated ${clamped.toFixed(1)} out of 5`}
      className="inline-flex items-center gap-0.5 text-gold-400"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width={px}
          height={px}
          viewBox="0 0 24 24"
          aria-hidden
          fill={i < Math.round(clamped) ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path d="M12 2 15 9l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
        </svg>
      ))}
    </span>
  );
}
