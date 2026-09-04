/**
 * MECHIST — Operations snapshot.
 *
 * Honest static view of operational status — concise three-pane read-out.
 * The values shown are illustrative; the real numbers are surfaced inside
 * the admin operations center.
 */
import { Activity, Radio, Signal, Wrench, MapPin } from 'lucide-react';
import { SectionShell, SectionHeading, Card, MetricChip } from '@/components/ui';
import { FadeIn } from '@/components/motion';

interface SparkPoint { v: number; }
const SPARK: SparkPoint[] = [
  { v: 18 }, { v: 22 }, { v: 19 }, { v: 28 }, { v: 25 }, { v: 32 },
  { v: 30 }, { v: 36 }, { v: 33 }, { v: 41 }, { v: 39 }, { v: 46 },
];

function Sparkline() {
  const max = Math.max(...SPARK.map((p) => p.v));
  const w = 200; const h = 48;
  const stepX = w / (SPARK.length - 1);
  const pts = SPARK.map((p, i) => {
    const x = (i * stepX).toFixed(1);
    const y = (h - (p.v / max) * (h - 6) - 3).toFixed(1);
    return `${x},${y}`;
  });
  const path = `M ${pts.join(' L ')}`;
  const fill = `${path} L ${w},${h} L 0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="op-spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(34 199 194)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="rgb(34 199 194)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#op-spark-fill)" />
      <path d={path} fill="none" stroke="rgb(34 199 194)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Mix { label: string; value: number; color: string; }

const MIX: Mix[] = [
  { label: 'Battery & EV',    value: 42, color: 'rgb(59 125 255)' },
  { label: 'Tyres & lift',    value: 28, color: 'rgb(34 199 194)' },
  { label: 'Engine / fuel',   value: 17, color: 'rgb(227 155 18)' },
  { label: 'Recovery / tow',  value: 13, color: 'rgb(117 84 245)' },
];

export function OperationsSnapshot() {
  return (
    <SectionShell id="operations" className="container section">
      <FadeIn>
        <SectionHeading
          hue="iris"
          eyebrow={<><Activity size={13} aria-hidden /> Operations · illustrative picture</>}
          title={<>The fleet at a glance. <span className="text-gradient-signal">No dashboards to wire up.</span></>}
          description="An illustrative snapshot of how the platform is performing. Live operational data is inside the admin operations center and on the live map."
        />
      </FadeIn>
      <p className="sr-only">Operational figures below are illustrative preview targets, not live telemetry. Live data is on the map and admin dashboards.</p>

      <div className="mt-10 grid gap-4 md:grid-cols-12">
        {/* Active incidents + sparkline */}
        <Card className="md:col-span-7 p-6">
          <div className="flex items-center justify-between border-b border-line-soft pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-aqua-500/10 text-aqua-300 ring-1 ring-inset ring-aqua-500/30">
                <Radio size={16} />
              </span>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-aqua-300">
                  Active requests · 24h
                </div>
                <div className="text-xs text-fg-muted">incident inflow</div>
              </div>
            </div>
            <MetricChip size="sm" tone="aqua" icon={Activity} label="+18% week over week" />
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="stat-num text-display-lg font-bold text-fg-app tabular-nums">238</span>
            <span className="pb-1.5 text-small text-fg-muted">units dispatched across 14 metros</span>
          </div>

          <div className="mt-4">
            <Sparkline />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-4 font-mono text-xs">
            <div>
              <div className="text-[10px] uppercase text-fg-subtle">On-site</div>
              <div className="mt-0.5 font-semibold text-fg-app">62%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-fg-subtle">In transit</div>
              <div className="mt-0.5 font-semibold text-aqua-400">26%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-fg-subtle">Awaiting accept</div>
              <div className="mt-0.5 font-semibold text-iris-400">12%</div>
            </div>
          </div>
        </Card>

        {/* Network availability */}
        <Card className="md:col-span-5 p-6">
          <div className="flex items-center justify-between border-b border-line-soft pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-azure-500/10 text-azure-300 ring-1 ring-inset ring-azure-500/30">
                <Signal size={16} />
              </span>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-azure-300">
                  Network availability
                </div>
                <div className="text-xs text-fg-muted">right now</div>
              </div>
            </div>
            <MetricChip size="sm" tone="success" icon={Wrench} label="98.4% online" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-lg border border-line-soft bg-surface-2/60 p-3">
              <div className="text-[10px] uppercase text-fg-subtle">MECHANICS</div>
              <div className="mt-0.5 text-small font-semibold text-fg-app">1,240</div>
            </div>
            <div className="rounded-lg border border-line-soft bg-surface-2/60 p-3">
              <div className="text-[10px] uppercase text-fg-subtle">CITIES LIVE</div>
              <div className="mt-0.5 text-small font-semibold text-fg-app">14</div>
            </div>
            <div className="rounded-lg border border-line-soft bg-surface-2/60 p-3">
              <div className="text-[10px] uppercase text-fg-subtle">ONBOARDING</div>
              <div className="mt-0.5 text-small font-semibold text-aqua-400">2 metros</div>
            </div>
            <div className="rounded-lg border border-line-soft bg-surface-2/60 p-3">
              <div className="text-[10px] uppercase text-fg-subtle">DISPATCH FEE</div>
              <div className="mt-0.5 text-small font-semibold text-success-500">$0</div>
            </div>
          </div>
        </Card>

        {/* Mix breakdown */}
        <Card className="md:col-span-12 p-6">
          <div className="flex items-center justify-between border-b border-line-soft pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-iris-500/10 text-iris-300 ring-1 ring-inset ring-iris-500/30">
                <MapPin size={16} />
              </span>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-iris-300">
                  Incident mix · 24h
                </div>
                <div className="text-xs text-fg-muted">problem category breakdown</div>
              </div>
            </div>
            <span className="font-mono text-[11px] text-fg-subtle">n = 238</span>
          </div>

          <div className="mt-5 space-y-3">
            {MIX.map((m) => (
              <div key={m.label} className="flex items-center gap-3 font-mono text-xs">
                <span className="w-32 shrink-0 text-fg-muted">{m.label}</span>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-app">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${m.value}%`, background: m.color, boxShadow: `0 0 10px ${m.color}55` }}
                  />
                </div>
                <span className="w-12 text-right font-semibold text-fg-app tabular-nums">{m.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </SectionShell>
  );
}
