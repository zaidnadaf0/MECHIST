/**
 * MECHIST — Admin diagnostics strip (pixel-retroui accent).
 *
 * The MECHIST design system is "Signal" (azure / aqua / iris). The public
 * product is not pixel-art and never will be. The admin control room is the
 * one place where a deliberately different visual register is useful: ops
 * staff need to read system health at a glance, and a single strip in a
 * different voice makes the diagnostics area feel like a *console* rather
 * than a page in the product.
 *
 * Scoping rules (these are non-negotiable):
 *   1. Used in exactly one place: <AdminDashboard />.
 *   2. The whole `pixel-retroui` CSS bundle is imported ONLY by this file.
 *      Because AdminDashboard is `lazy()`-loaded in App.tsx, the 20K CSS
 *      + 22K font payload live in the admin chunk and never touch the
 *      public landing.
 *   3. The strip is wrapped in an ErrorBoundary so any retroui rendering
 *      failure falls back to plain in-house bars — the dashboard never
 *      crashes because of the accent.
 *   4. The strip is clearly framed: a "// system diagnostics" header and
 *      a "back to MECHIST" affordance so a reviewer (or future admin) can
 *      tell at a glance that this is an accent, not the visual style.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card, ProgressBar } from 'pixel-retroui';
// Side-effect import: the CSS lives in the admin chunk only because
// this file is only rendered from the lazy <AdminDashboard>.
import 'pixel-retroui/dist/index.css';

type DiagnosticRow = { label: string; count: number; cap: number; hint: string };

type LiveStats = { requests: number; mechanics: number; users: number } | null;

export function AdminDiagnosticsStrip({ stats }: { stats: LiveStats }) {
  return (
    <section
      aria-labelledby="admin-diagnostics-heading"
      className="my-8"
    >
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        <h2 id="admin-diagnostics-heading" className="font-normal">
          // system diagnostics
        </h2>
        <span className="text-fg-subtle">
          accent · pixel-retroui · v2.1.0
          <a
            href="#admin-actions"
            className="ml-3 underline-offset-2 hover:underline"
            style={{ color: '#9ab4ff' }}
          >
            back to MECHIST UI
          </a>
        </span>
      </header>

      <StripErrorBoundary>
        <StripBody stats={stats} />
      </StripErrorBoundary>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Body                                                                       */
/* -------------------------------------------------------------------------- */

function StripBody({ stats }: { stats: LiveStats }) {
  // No fake baseline: until the live listeners fire we say so. The bars
  // are count-vs-documented-cap visualisations, labelled as such — they
  // are not health scores.
  if (!stats) {
    return (
      <Card
        bg="#10141c"
        textColor="#d8e0ec"
        borderColor="#9ab4ff"
        shadowColor="#1f3a8a"
        className="w-full"
      >
        <div className="p-4 text-[11px] uppercase tracking-wider" style={{ color: '#7d8aa3' }}>
          Connecting to live stats…
        </div>
      </Card>
    );
  }
  const rows: DiagnosticRow[] = [
    { label: 'open requests', count: stats.requests, cap: 100, hint: 'status == requested, live' },
    { label: 'mechanics',     count: stats.mechanics, cap: 50,  hint: 'mechanic docs on roster (any state)' },
    { label: 'users',         count: stats.users,     cap: 200, hint: 'user docs on roster (any role)' },
  ];

  return (
    <Card
      bg="#10141c"
      textColor="#d8e0ec"
      borderColor="#9ab4ff"
      shadowColor="#1f3a8a"
      className="w-full"
    >
      <div className="grid gap-4 p-4 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-[11px] uppercase tracking-wider">
              <span style={{ color: '#9ab4ff' }}>{row.label}</span>
              <span style={{ color: '#d8e0ec' }}>{row.count} / {row.cap}</span>
            </div>
            <ProgressBar
              progress={clampPercent(row.count, row.cap)}
              size="md"
              color="#3b7dff"
              borderColor="#9ab4ff"
            />
            <div className="text-[10px]" style={{ color: '#7d8aa3' }}>
              {row.hint}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* In-house fallback (used if pixel-retroui itself throws)                    */
/* -------------------------------------------------------------------------- */

function StripFallback({ stats }: { stats: LiveStats }) {
  if (!stats) {
    return (
      <div
        className="rounded-lg border border-[#1f3a8a] bg-[#10141c] p-4"
        style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
      >
        <div className="text-[11px] uppercase tracking-wider text-[#7d8aa3]">
          Connecting to live stats…
        </div>
      </div>
    );
  }
  const rows: DiagnosticRow[] = [
    { label: 'open requests', count: stats.requests, cap: 100, hint: 'status == requested, live' },
    { label: 'mechanics',     count: stats.mechanics, cap: 50,  hint: 'mechanic docs on roster (any state)' },
    { label: 'users',         count: stats.users,     cap: 200, hint: 'user docs on roster (any role)' },
  ];
  return (
    <div
      className="rounded-lg border border-[#1f3a8a] bg-[#10141c] p-4"
      style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-[11px] uppercase tracking-wider text-[#9ab4ff]">
              <span>{r.label}</span>
              <span className="text-[#d8e0ec]">{r.count} / {r.cap}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-sm border border-[#9ab4ff]/60 bg-[#0b0e14]">
              <div className="h-full bg-[#3b7dff]" style={{ width: `${clampPercent(r.count, r.cap)}%` }} />
            </div>
            <div className="text-[10px] text-[#7d8aa3]">{r.hint}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-[#7d8aa3]">
        (rendered via in-house fallback — pixel-retroui threw during render)
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Local ErrorBoundary so a single component can't take the dashboard down    */
/* -------------------------------------------------------------------------- */

class StripErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in dev so the accent's failure mode is visible; the rest
    // of the dashboard is unaffected because this boundary is local.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[MECHIST] pixel-retroui diagnostics failed, using fallback', error, info);
    }
  }

  render() {
    if (this.state.failed) {
      // Re-render with the props the parent passed; since the boundary
      // wraps a single child that depends on `stats`, we read it back
      // from the last render via the children pattern below.
      return <StripFallback stats={(this.props.children as { props?: { stats?: LiveStats } })?.props?.stats ?? null} />;
    }
    return this.props.children;
  }
}

/**
 * Map a raw count to a 0-100 percentage with a soft cap so a single
 * huge value doesn't pin every bar to full. Tuned for the MECHIST
 * admin's expected operational scale (open requests ~100, mechanics
 * ~50, users ~200).
 */
function clampPercent(n: number, cap: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= cap) return 100;
  return Math.max(0, Math.min(100, Math.round((n / cap) * 100)));
}
