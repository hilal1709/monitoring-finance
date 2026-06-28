"use client";

import { Fragment } from "react";
import { ChartTitle, HoverValue } from "@/components/dashboard/charts/chart-primitives";
import { rankedItemTooltip } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/dashboard-format";
import type { RankedItem } from "@/lib/monitoring-dashboard-types";

export function HorizontalBars({ title, items, maxItems = 8 }: { title?: string; items: RankedItem[]; maxItems?: number }) {
  const visible = items.slice(0, maxItems);
  const max = Math.max(...visible.map((item) => item.value), 1);

  return (
    <div className="space-y-1.5 rounded-lg border border-white/10 bg-[#0c1724] p-2">
      {title ? <ChartTitle title={title} /> : null}
      <div className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 px-2 pb-2">
        {visible.map((item) => (
          <Fragment key={item.label}>
            <span className="truncate text-right text-[11px]" title={rankedItemTooltip(item)}>{item.label}</span>
            <div tabIndex={0} title={rankedItemTooltip(item)} className="group relative h-4 overflow-hidden rounded bg-white/[0.06] outline-none">
              <HoverValue text={rankedItemTooltip(item)} />
              <div
                className="h-full border border-[#2dd4bf]/40 bg-gradient-to-r from-[#0ea5e9] to-[#2dd4bf]"
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-right text-[9px] font-semibold text-[#ffd166]">{formatCurrency(item.value, true)}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function StatusBars({ title, items }: { title: string; items: RankedItem[] }) {
  return <HorizontalBars title={title} items={items} maxItems={7} />;
}
