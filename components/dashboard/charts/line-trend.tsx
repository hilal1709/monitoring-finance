"use client";

import { ArrowDownRight01Icon, ArrowUpRight01Icon, MinusSignIcon } from "@hugeicons/core-free-icons";
import { COLORS, LineChart } from "@/components/charts";
import { EmptyChart } from "@/components/charts/empty-chart";
import { PeriodModeSelector } from "@/components/dashboard/period-mode-selector";
import { Icon } from "@/components/ui/icon";
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
  const delta = trendDelta(points, periodMode);
  const compareName = periodMode === "yoy" ? "Baseline 0%" : "Tahun lalu";
  // Points already carry their own display labels; reuse them for the tooltip and axis.
  const labelFor = new Map(points.map((point) => [point.value, point.valueLabel]));
  const format = (value: number) => labelFor.get(value) ?? new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);

  return (
    <div className="h-full rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-teal">{title}</h2>
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                delta.direction === "up" && "bg-turquoise/20 text-teal",
                delta.direction === "down" && "bg-coral/15 text-coral-ink",
                delta.direction === "flat" && "bg-teal/10 text-teal/90",
              )}
              title={`Perubahan vs ${compareName}`}
            >
              <Icon icon={delta.direction === "up" ? ArrowUpRight01Icon : delta.direction === "down" ? ArrowDownRight01Icon : MinusSignIcon} className="size-3" strokeWidth={2.4} />
              {formatDeltaPercent(delta.percent)}
            </span>
          ) : null}
        </div>
        <PeriodModeSelector value={periodMode} onChange={onPeriodModeChange} />
      </div>
      {points.length > 0 ? (
        <>
          <LineChart
            key={periodMode}
            height={168}
            labels={points.map((point) => point.label)}
            series={[
              { label: "Saat ini", data: points.map((point) => point.value), color: COLORS.turquoise, emphasis: true, fill: true },
              ...(hasCompare ? [{ label: compareName, data: points.map((point) => point.compareValue ?? null), color: COLORS.coral, dashed: true }] : []),
            ]}
            format={format}
          />
          {hasCompare || periodMode === "yoy" ? (
            <div className="mt-1.5 flex items-center justify-end gap-3 text-[11px] font-semibold text-teal">
              <span className="inline-flex items-center gap-1">
                <span className="h-1 w-4 rounded-full bg-turquoise" /> Saat ini
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1 w-4 rounded-full border-t-2 border-dashed border-coral" /> {compareName}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyChart text="Tidak ada data pembanding" />
      )}
    </div>
  );
}
