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
          <div className="relative h-6 min-w-0 overflow-hidden rounded border border-white/30 bg-[var(--surface-muted)]">
            <div
              className={cn("h-full min-w-0 rounded", item.value < 0 ? "bg-[#ef4444]" : "bg-[#06b6d4]")}
              style={{ width: `${Math.max(2, (Math.abs(item.value) / max) * 100)}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-[11px] font-bold tabular-nums text-[var(--app-fg)]">
            {formatValue(item.value)}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
