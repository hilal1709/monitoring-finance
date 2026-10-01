"use client";

import { COLORS, HorizontalBarChart } from "@/components/charts";
import { EmptyChart } from "@/components/charts/empty-chart";
import type { RankedValue } from "@/lib/export-dashboard-data";

const barTones = {
  turquoise: COLORS.turquoise,
  coral: COLORS.coral,
  yellow: COLORS.yellow,
  teal: COLORS.teal,
} as const;

export function HorizontalBars({
  items,
  formatValue,
  emptyText = "Tidak ada data",
  tone = "turquoise",
}: {
  items: RankedValue[];
  formatValue: (value: number) => string;
  emptyText?: string;
  tone?: keyof typeof barTones;
}) {
  if (items.length === 0) return <EmptyChart text={emptyText} />;

  return (
    <div className="p-3">
      <HorizontalBarChart
        items={items.map((item) => ({ label: item.label, value: item.value }))}
        color={barTones[tone]}
        negativeColor={tone === "coral" ? COLORS.teal : COLORS.coral}
        format={formatValue}
      />
    </div>
  );
}
