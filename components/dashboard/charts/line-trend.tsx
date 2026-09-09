import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { PeriodModeSelector } from "@/components/dashboard/period-mode-selector";
import { trendDelta } from "@/lib/dashboard-data";
import { formatDeltaPercent } from "@/lib/dashboard-format";
import { cn } from "@/lib/utils";
import type { PeriodMode, TrendPoint } from "@/lib/dashboard-types";

export function LineTrend({
  title,
  points,
  periodMode,
  onPeriodModeChange,
}: {
  title: string;
  points: TrendPoint[];
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
}) {
  const hasCompare = points.some((point) => point.compareValue != null);
  const values = points.map((point) => point.value);
  const compareValues = points.map((point) => point.compareValue).filter((value): value is number => value != null);
  const allValues = [...values, ...compareValues];
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = Math.max(max - min, 1);
  const pointX = (index: number) => (points.length === 1 ? 50 : 5 + (index / (points.length - 1)) * 90);
  const pointY = (value: number) => 36 - ((value - min) / range) * 28;
  const polyline = points.map((point, index) => `${pointX(index)},${pointY(point.value)}`).join(" ");
  const comparePolyline = points
    .map((point, index) => (point.compareValue != null ? `${pointX(index)},${pointY(point.compareValue)}` : null))
    .filter(Boolean)
    .join(" ");

  const delta = trendDelta(points, periodMode);
  const compareName = periodMode === "yoy" ? "Baseline 0%" : "Tahun lalu";

  return (
    <div className="h-full rounded-lg border border-white/10 bg-[#0c1724] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold text-slate-100">{title}</h4>
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                delta.direction === "up" && "bg-emerald-500/15 text-emerald-300",
                delta.direction === "down" && "bg-red-500/15 text-red-300",
                delta.direction === "flat" && "bg-slate-500/15 text-slate-300",
              )}
              title={`Perubahan vs ${compareName}`}
            >
              {delta.direction === "up" ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : delta.direction === "down" ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {formatDeltaPercent(delta.percent)}
            </span>
          ) : null}
        </div>
        <PeriodModeSelector value={periodMode} onChange={onPeriodModeChange} />
      </div>
      {points.length > 0 ? (
        <>
          <div className="relative h-40 w-full">
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
              {[8, 15, 22, 29, 36].map((y) => (
                <line key={y} x1="3" x2="98" y1={y} y2={y} stroke="rgba(226,232,240,0.55)" strokeWidth="0.35" />
              ))}
              {comparePolyline ? (
                <polyline points={comparePolyline} fill="none" stroke="#ef4444" strokeDasharray="2 1.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" />
              ) : null}
              <polyline points={polyline} fill="none" stroke="#22d3ee" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
            {points.map((point, index) => {
              const x = pointX(index);
              const y = pointY(point.value);

              return (
                <span
                  key={point.key}
                  className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-help rounded-full border-2 border-[#0c1724] bg-[#22d3ee]"
                  style={{ left: `${x}%`, top: `${(y / 44) * 100}%` }}
                  title={`${point.label}: ${point.valueLabel}${point.compareLabel != null ? ` (${compareName}: ${point.compareLabel})` : ""}`}
                />
              );
            })}
          </div>
          <div className="relative h-5 text-[11px] font-semibold text-slate-200">
            {points.map((point, index) => (
              <span
                key={point.key}
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-center"
                style={{ left: `${pointX(index)}%` }}
                title={`${point.label}: ${point.valueLabel}`}
              >
                {point.label.split(" ")[0]}
              </span>
            ))}
          </div>
          {hasCompare || periodMode === "yoy" ? (
            <div className="mt-1.5 flex items-center justify-end gap-3 text-[11px] font-semibold text-slate-200">
              <span className="inline-flex items-center gap-1">
                <span className="h-1 w-4 rounded-full bg-[#22d3ee]" /> Saat ini
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1 w-4 rounded-full border-t-2 border-dashed border-[#ef4444]" /> {compareName}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <div className="grid h-40 place-items-center text-center text-xs font-semibold text-slate-400">Tidak ada data pembanding</div>
      )}
    </div>
  );
}
