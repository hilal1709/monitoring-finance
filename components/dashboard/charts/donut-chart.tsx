"use client";

import { DoughnutChart } from "@/components/charts";
import { ChartTitle } from "@/components/dashboard/charts/chart-primitives";
import { PartitionBar } from "@/components/ui/partition-bar";
import { rankedItemTooltip } from "@/lib/dashboard-data";
import { formatPercent } from "@/lib/dashboard-format";
import { palette } from "@/lib/dashboard-constants";
import { cn } from "@/lib/utils";
import type { RankedItem } from "@/lib/monitoring-dashboard-types";

export function DonutChart({
  title,
  items,
  centerLabel,
  summary,
  compact = false,
  partition = false,
}: {
  title: string;
  items: RankedItem[];
  centerLabel?: string;
  summary?: string;
  compact?: boolean;
  /** Adds a proportional segment bar under the chart (for aging/risk mixes). */
  partition?: boolean;
}) {
  const visible = items.slice(0, 8);
  const colors = visible.map((_, index) => palette[index % palette.length]);

  return (
    <div className="h-full rounded-lg border border-border bg-card">
      <ChartTitle title={title} />
      {summary ? <div className="border-b border-border px-2 py-1.5 text-center text-[11px] font-bold text-teal">{summary}</div> : null}
      <div className={cn("flex flex-col items-center justify-center p-2 sm:flex-row md:flex-col 2xl:flex-row", compact ? "min-h-[138px] gap-2" : "min-h-[178px] gap-3")}>
        <DoughnutChart
          labels={visible.map((item) => item.label)}
          values={visible.map((item) => Math.max(item.value, 0))}
          colors={colors}
          tooltips={visible.map(rankedItemTooltip)}
          centerText={(centerLabel ?? "Total").replace(" ", "\n")}
          size={compact ? 124 : 150}
        />
        <div className="w-full min-w-0 max-w-[220px] space-y-0.5 text-[10px] text-teal/90 2xl:w-40">
          {visible.map((item, index) => (
            <div
              key={item.label}
              title={rankedItemTooltip(item)}
              className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-2 rounded px-1 transition-colors hover:bg-turquoise/10"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index] }} />
              <span className="min-w-0 break-words leading-tight">{item.label}</span>
              <span className="font-bold">{formatPercent(item.share)}</span>
            </div>
          ))}
        </div>
      </div>
      {partition ? (
        <div className="px-3 pb-3">
          <PartitionBar items={visible.map((item) => ({ label: item.label, share: item.share, tooltip: rankedItemTooltip(item) }))} colors={colors} />
        </div>
      ) : null}
    </div>
  );
}
