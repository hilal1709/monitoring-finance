"use client";

import { COLORS, GroupedHorizontalBarChart, HorizontalBarChart } from "@/components/charts";
import { ChartTitle } from "@/components/dashboard/charts/chart-primitives";
import { paymentTargetPoints } from "@/lib/dashboard-data";
import { formatCurrency, formatDeltaPercent } from "@/lib/dashboard-format";

export function TargetAchievementChart({ points }: { points: ReturnType<typeof paymentTargetPoints> }) {
  return (
    <div className="h-full rounded-lg border border-border bg-card p-2">
      <ChartTitle title="AR Persentase From Target" />
      <div className="mt-2">
        <HorizontalBarChart
          rowHeight={26}
          labelWidth={40}
          color={COLORS.teal}
          negativeColor={COLORS.coral}
          items={points.map((point) => ({
            label: point.month,
            value: point.variance,
            tooltip: `${formatDeltaPercent(point.variance)} | Realisasi ${formatCurrency(point.realization, true)} | Target ${formatCurrency(point.target, true)}`,
          }))}
          format={(value) => formatDeltaPercent(value)}
        />
      </div>
    </div>
  );
}

export function TargetVsRealizationChart({ points }: { points: ReturnType<typeof paymentTargetPoints> }) {
  return (
    <div className="h-full rounded-lg border border-border bg-card p-2">
      <ChartTitle title="Target VS Realisasi" />
      <div className="mt-2">
        <GroupedHorizontalBarChart
          rowHeight={38}
          labels={points.map((point) => point.month)}
          series={[
            { label: "Target", data: points.map((point) => point.target), color: COLORS.yellow },
            { label: "Realisasi", data: points.map((point) => point.realization), color: COLORS.turquoise },
          ]}
          format={(value) => formatCurrency(value, true)}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-teal">
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded-sm bg-sun" /> Target
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-3 rounded-sm bg-turquoise" /> Realisasi
        </span>
      </div>
    </div>
  );
}
