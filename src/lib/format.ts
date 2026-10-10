/**
 * Shared formatting utilities (Batch 1 — structure/nav foundations).
 *
 * Conventions (do not duplicate):
 * - money() is INR/₹ via the single implementation in `@/lib/authUI`
 *   (`inr`, en-IN locale). This module re-exports it under the `money`
 *   name so callers have one obvious import.
 * - Dates follow the existing Indian-clock helpers in `@/lib/authUI`
 *   (`istClock`/`istDateLong`); `relTime` below is the relative-time
 *   companion for inbox/activity timestamps.
 */
import { inr } from './authUI';

/** Indian rupee formatter — single implementation lives in `@/lib/authUI`. */
export { inr };
export const money = inr;

/**
 * Human-readable relative time ("Just now", "5m ago", "3h ago", "2d ago").
 * Accepts Date | epoch-ms | null | undefined. Invalid/missing input
 * returns '' so callers can fall back to an absolute date or omit.
 */
export function relTime(when: Date | number | null | undefined, now: number = Date.now()): string {
  const ts = when instanceof Date ? when.getTime() : when;
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return '';
  const diffMs = now - ts;
  if (diffMs < 0) return 'Just now';
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Short duration copy derived from a millisecond value ("2 min"). */
export function formatDurationShort(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  return `${m} min`;
}
/** Long duration copy derived from a millisecond value ("2 minutes"). */
export function formatDurationLong(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60_000));
  return m === 1 ? '1 minute' : `${m} minutes`;
}

/**
 * Server-authoritative offer deadline for display-only countdowns.
 * Uses the persisted `offerExpiresAt`; falls back to createdAt + window
 * for legacy docs that predate the field. Never decides eligibility —
 * `acceptJob` and the scheduled expiry own that.
 */
export function offerDeadlineMs(
  job: { offerExpiresAt?: number | null; createdAt: number },
  fallbackWindowMs: number,
): number {
  if (typeof job.offerExpiresAt === 'number' && Number.isFinite(job.offerExpiresAt)) {
    return job.offerExpiresAt;
  }
  return job.createdAt + fallbackWindowMs;
}

/** Remaining time formatted as m:ss, clamped at zero ("2:00", "0:07", "0:00"). */
export function formatCountdownMs(msLeft: number): string {
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Generic reusable debounce — no dependencies, preserves typing. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
): ((...args: A) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: A): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };
  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}
