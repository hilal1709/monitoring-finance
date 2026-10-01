"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function OverviewMonthDropdown({
  items,
  selected,
  onToggle,
  onClear,
}: {
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const selectedSet = new Set(selected);
  const selectedLabel = selected.length === 0 ? "Semua bulan" : selected.length === 1 ? selected[0] : `${selected.length} bulan aktif`;

  // Group available period labels ("Mon YYYY") by year, preserving the incoming chronological order.
  const yearMap = new Map<string, string[]>();
  for (const item of items) {
    const year = item.split(" ")[1] ?? item;
    const list = yearMap.get(year) ?? [];
    list.push(item);
    yearMap.set(year, list);
  }
  const years = [...yearMap.keys()];

  const [open, setOpen] = useState(false);
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Keep the active year valid: prefer the year of the latest selection, else the most recent year.
  const resolvedYear =
    activeYear && yearMap.has(activeYear)
      ? activeYear
      : ((selected.length > 0 ? selected[selected.length - 1].split(" ")[1] : null) ?? years[years.length - 1] ?? null);
  const monthsForYear = resolvedYear ? (yearMap.get(resolvedYear) ?? []) : [];

  // Month chips pop in whenever the year changes or the panel opens.
  useEffect(() => {
    if (!open || !gridRef.current || prefersReducedMotion()) return;
    animate(gridRef.current.children, [{ opacity: 0, scale: "0.85" }, { opacity: 1, scale: "1" }], { duration: 0.3, stagger: 0.025, ease: ease.backStrong });
  }, [open, resolvedYear]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full min-w-[12rem] items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-semibold text-teal transition-all hover:border-turquoise/50 hover:shadow-[0_6px_16px_-10px_rgba(26,83,92,0.6)]",
            open && "border-turquoise bg-turquoise/5",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon icon={Calendar03Icon} className="size-4" />
            <span className="truncate">Bulan</span>
          </span>
          <span className={cn("truncate rounded-full px-2 py-0.5 text-xs font-bold", selected.length ? "bg-sun" : "bg-muted")}>{selectedLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal/90">Filter Bulan</p>
            <p className="text-[11px] text-muted-foreground">Pilih tahun lalu bulannya.</p>
          </div>
          {selected.length > 0 ? (
            <button type="button" onClick={onClear} className="rounded-md px-2 py-1 text-[10px] font-bold text-coral-ink transition-colors hover:bg-coral/10">
              Reset
            </button>
          ) : null}
        </div>

        {years.length > 0 && resolvedYear ? (
          <SegmentedControl
            className="mb-3"
            size="xs"
            ariaLabel="Pilih tahun"
            value={resolvedYear}
            onChange={setActiveYear}
            options={years.map((year) => {
              const activeCount = (yearMap.get(year) ?? []).filter((label) => selectedSet.has(label)).length;
              return { value: year, label: activeCount > 0 ? `${year} (${activeCount})` : year };
            })}
          />
        ) : null}

        <div ref={gridRef} className="grid grid-cols-3 gap-2 text-xs">
          {monthsForYear.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={selectedSet.has(item)}
              onClick={() => onToggle(item)}
              className={cn(
                "min-h-9 rounded-lg border px-2 py-1 text-left font-medium transition-all active:scale-95",
                selectedSet.has(item) ? "border-sun bg-sun font-bold text-teal" : "border-border bg-muted text-teal hover:border-turquoise/50 hover:bg-turquoise/10",
              )}
            >
              {item.split(" ")[0]}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
