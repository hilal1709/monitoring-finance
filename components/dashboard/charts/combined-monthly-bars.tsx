"use client";

import { COLORS, GroupedHorizontalBarChart } from "@/components/charts";
import { EmptyChart } from "@/components/charts/empty-chart";
import { PeriodModeSelector } from "@/components/dashboard/period-mode-selector";
import { formatTrendValue, periodTrendPoints } from "@/lib/dashboard-data";
import type { PeriodMode } from "@/lib/dashboard-types";
import type { DashboardSection } from "@/lib/monitoring-dashboard-types";

export function CombinedMonthlyBars({
  invoice,
  payment,
  periodMode,
  onPeriodModeChange,
}: {
  invoice: DashboardSection;
  payment: DashboardSection;
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
}) {
  const monthMap = new Map<string, { label: string; invoice: number; payment: number }>();

  for (const point of periodTrendPoints(invoice, periodMode)) {
    const item = monthMap.get(point.key) ?? { label: point.label, invoice: 0, payment: 0 };
    item.invoice += point.value;
    monthMap.set(point.key, item);
  }

  for (const point of periodTrendPoints(payment, periodMode)) {
    const item = monthMap.get(point.key) ?? { label: point.label, invoice: 0, payment: 0 };
    item.payment += point.value;
    monthMap.set(point.key, item);
  }

  const points = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => ({ key, ...value }));

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-teal">
        <span>Billing vs Payment Trend</span>
        <span className="flex flex-wrap items-center gap-3">
          <PeriodModeSelector value={periodMode} onChange={onPeriodModeChange} />
          <span className="inline-flex items-center gap-1">
            <span className="size-3 rounded-sm bg-sun" /> Invoice
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-3 rounded-sm bg-teal" /> Payment
          </span>
        </span>
      </div>
      {points.length > 0 ? (
        <GroupedHorizontalBarChart
          key={periodMode}
          labels={points.map((point) => point.label)}
          series={[
            { label: "Invoice", data: points.map((point) => point.invoice), color: COLORS.yellow },
            { label: "Payment", data: points.map((point) => point.payment), color: COLORS.teal },
          ]}
          format={(value) => formatTrendValue(value, periodMode)}
        />
      ) : (
        <EmptyChart text="Tidak ada data pembanding" />
      )}
    </div>
  );
}
