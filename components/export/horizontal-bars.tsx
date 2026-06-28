"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { RankedValue } from "@/lib/export-dashboard-data";

export function HorizontalBars({
  items,
  formatValue,
  emptyText = "Tidak ada data",
}: {
  items: RankedValue[];
  formatValue: (value: number) => string;
  emptyText?: string;
}) {
  const max = Math.max(...items.map((item) => Math.abs(item.value)), 1);

  if (items.length === 0) {
    return <div className="grid min-h-40 place-items-center p-4 text-xs text-[var(--muted-fg)]">{emptyText}</div>;
  }

  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 p-3">
      {items.map((item) => (
        <Fragment key={item.label}>
          <span className="truncate text-right text-[11px] font-semibold text-[var(--app-fg)]" title={item.label}>{item.label}</span>
          <div className="relative h-5 min-w-0 overflow-hidden rounded bg-[var(--surface-muted)]">
            <div
              className={cn("h-full min-w-0 rounded", item.value < 0 ? "bg-[#ff7b72]" : "bg-gradient-to-r from-[#4cc9d8] to-[#70f0bf]")}
              style={{ width: `${Math.max(2, (Math.abs(item.value) / max) * 100)}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-[10px] font-medium tabular-nums text-[var(--app-fg)]">
            {formatValue(item.value)}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
