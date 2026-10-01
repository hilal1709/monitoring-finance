"use client";

import { COLORS, HorizontalBarChart } from "@/components/charts";
import { EmptyChart } from "@/components/charts/empty-chart";
import { ChartTitle } from "@/components/dashboard/charts/chart-primitives";
import { rankedItemTooltip } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/dashboard-format";
import type { RankedItem } from "@/lib/monitoring-dashboard-types";

const barTones = {
  turquoise: COLORS.turquoise,
  coral: COLORS.coral,
  yellow: COLORS.yellow,
  teal: COLORS.teal,
} as const;

export type BarTone = keyof typeof barTones;

export function HorizontalBars({ title, items, maxItems = 8, tone = "turquoise" }: { title?: string; items: RankedItem[]; maxItems?: number; tone?: BarTone }) {
  const visible = items.slice(0, maxItems);

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-card p-2">
      {title ? <ChartTitle title={title} /> : null}
      {visible.length > 0 ? (
        <HorizontalBarChart
          items={visible.map((item) => ({ label: item.label, value: item.value, tooltip: rankedItemTooltip(item) }))}
          color={barTones[tone]}
          negativeColor={tone === "coral" ? COLORS.teal : COLORS.coral}
          format={(value) => formatCurrency(value, true)}
        />
      ) : (
        <EmptyChart />
      )}
    </div>
  );
}

export function StatusBars({ title, items }: { title: string; items: RankedItem[] }) {
  return <HorizontalBars title={title} items={items} maxItems={7} />;
}
