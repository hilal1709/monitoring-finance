import { cn } from "@/lib/utils";
import { ChartTitle, HoverValue } from "@/components/dashboard/charts/chart-primitives";
import { paymentTargetPoints } from "@/lib/dashboard-data";
import { formatCurrency, formatDeltaPercent } from "@/lib/dashboard-format";

export function TargetAchievementChart({ points }: { points: ReturnType<typeof paymentTargetPoints> }) {
  const maxAbs = Math.max(...points.map((point) => Math.abs(point.variance)), 1);

  return (
    <div className="h-full rounded-lg border border-white/10 bg-[#0c1724] p-2">
      <ChartTitle title="AR Persentase From Target" />
      <div className="mt-2 space-y-1">
        {points.map((point) => {
          const positive = point.variance >= 0;

          return (
            <div key={point.month} tabIndex={0} title={`${point.month}: ${formatDeltaPercent(point.variance)} | Realisasi ${formatCurrency(point.realization, true)} | Target ${formatCurrency(point.target, true)}`} className="group relative grid grid-cols-[30px_1fr_48px] items-center gap-1.5 text-[10px] font-bold text-slate-100 outline-none">
              <span>{point.month}</span>
              <div className="relative h-5 overflow-hidden rounded border border-white/30 bg-white/[0.10]">
                <HoverValue text={`${point.month}: ${formatDeltaPercent(point.variance)} dari target`} />
                <div
                  className={cn("h-full border", positive ? "border-[#bbf7d0] bg-[#16a34a]" : "border-[#fecaca] bg-[#dc2626]")}
                  style={{ width: `${Math.max(2, Math.min(100, (Math.abs(point.variance) / maxAbs) * 100))}%` }}
                />
              </div>
              <span className={cn("text-right", positive ? "text-[#4ade80]" : "text-[#f87171]")}>{formatDeltaPercent(point.variance)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TargetVsRealizationChart({ points }: { points: ReturnType<typeof paymentTargetPoints> }) {
  const maxValue = Math.max(...points.flatMap((point) => [point.target, point.realization]), 1);

  return (
    <div className="h-full rounded-lg border border-white/10 bg-[#0c1724] p-2">
      <ChartTitle title="Target VS Realisasi" />
      <div className="mt-2 space-y-1">
        {points.map((point) => (
          <div key={point.month} tabIndex={0} title={`${point.month}: Target ${formatCurrency(point.target)} | Realisasi ${formatCurrency(point.realization)}`} className="group relative grid grid-cols-[30px_minmax(0,1fr)_72px] items-center gap-1.5 text-[10px] font-bold text-slate-100 outline-none">
            <span>{point.month}</span>
            <div className="space-y-0.5">
              <div className="relative h-3.5 overflow-hidden rounded border border-white/30 bg-white/[0.10]">
                <HoverValue text={`Target ${point.month}: ${formatCurrency(point.target, true)}`} />
                <div className="h-full border border-[#fde68a] bg-[#d97706]" style={{ width: `${Math.max(2, (point.target / maxValue) * 100)}%` }} />
              </div>
              <div className="relative h-3.5 overflow-hidden rounded border border-white/30 bg-white/[0.10]">
                <HoverValue text={`Realisasi ${point.month}: ${formatCurrency(point.realization, true)}`} />
                <div className="h-full border border-[#67e8f9] bg-[#0891b2]" style={{ width: `${Math.max(point.realization > 0 ? 2 : 0, (point.realization / maxValue) * 100)}%` }} />
              </div>
            </div>
            <div className="space-y-0.5 text-right text-[10px] font-black leading-4">
              <div className="text-[#facc15]">{formatCurrency(point.target, true)}</div>
              <div className="text-[#22d3ee]">{formatCurrency(point.realization, true)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 text-[10px] font-bold text-slate-200">
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 border border-white/70 bg-[#d97706]" /> Target</span>
        <span className="inline-flex items-center gap-1"><span className="h-3 w-3 border border-white/70 bg-[#0891b2]" /> Realisasi</span>
      </div>
    </div>
  );
}
