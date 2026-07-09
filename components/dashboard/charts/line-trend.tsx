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
                <line key={y} x1="3" x2="98" y1={y} y2={y} stroke="rgba(148,163,184,0.28)" strokeWidth="0.25" />
              ))}
              {comparePolyline ? (
                <polyline points={comparePolyline} fill="none" stroke="#f87171" strokeDasharray="1.5 1.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.7" />
              ) : null}
              <polyline points={polyline} fill="none" stroke="#7dd3fc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.9" />
            </svg>
            {points.map((point, index) => {
              const x = pointX(index);
              const y = pointY(point.value);

              return (
                <span
                  key={point.key}
                  className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-help rounded-full bg-[#70f0bf]"
                  style={{ left: `${x}%`, top: `${(y / 44) * 100}%` }}
                  title={`${point.label}: ${point.valueLabel}${point.compareLabel != null ? ` (${compareName}: ${point.compareLabel})` : ""}`}
                />
              );
            })}
          </div>
          <div className="relative h-4 text-[10px] text-slate-400">
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
            <div className="mt-1.5 flex items-center justify-end gap-3 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="h-0.5 w-3 rounded-full bg-[#7dd3fc]" /> Saat ini
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-0.5 w-3 rounded-full border-t border-dashed border-[#f87171]" /> {compareName}
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
