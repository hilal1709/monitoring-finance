"use client";

import { useEffect, useRef, useState } from "react";
import { Filter } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape while the panel is open.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Keep the active year valid: prefer the year of the latest selection, else the most recent year.
  const resolvedYear = activeYear && yearMap.has(activeYear)
    ? activeYear
    : (selected.length > 0 ? selected[selected.length - 1].split(" ")[1] : null) ?? years[years.length - 1] ?? null;
  const monthsForYear = resolvedYear ? yearMap.get(resolvedYear) ?? [] : [];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-[12rem] items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0c1724] px-3 py-2 text-left text-sm font-semibold text-slate-100 transition-colors hover:border-[#7dd3fc]/35 hover:bg-white/[0.04]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-[#ffd166]" />
          <span className="truncate">Bulan</span>
        </span>
        <span className="truncate text-xs font-bold text-[#ffd166]">{selectedLabel}</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#09111d] p-3 shadow-[0_24px_50px_rgba(0,0,0,0.42)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Filter Bulan</p>
              <p className="text-[11px] text-slate-500">Pilih tahun lalu bulannya.</p>
            </div>
            {selected.length > 0 ? (
              <button type="button" onClick={onClear} className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold text-[#ffd166] hover:bg-[#ffd166]/10">
                Clear
              </button>
            ) : null}
          </div>

          {years.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {years.map((year) => {
                const activeCount = (yearMap.get(year) ?? []).filter((label) => selectedSet.has(label)).length;
                return (
                  <button
                    key={year}
                    type="button"
                    aria-pressed={year === resolvedYear}
                    onClick={() => setActiveYear(year)}
                    className={cn(
                      "min-h-8 rounded-lg border px-3 py-1 text-xs font-bold transition-colors",
                      year === resolvedYear ? "border-[#7dd3fc]/50 bg-[#7dd3fc]/15 text-[#7dd3fc]" : "border-white/10 bg-white/5 text-slate-200 hover:border-[#7dd3fc]/35 hover:bg-[#7dd3fc]/10",
                    )}
                  >
                    {year}
                    {activeCount > 0 ? <span className="ml-1 text-[#ffd166]">({activeCount})</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 text-xs">
            {monthsForYear.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={selectedSet.has(item)}
                onClick={() => onToggle(item)}
                className={cn(
                  "min-h-9 rounded-lg border px-2 py-1 text-left font-medium transition-colors",
                  selectedSet.has(item) ? "border-[#ffd166]/50 bg-[#ffd166] text-[#211600]" : "border-white/10 bg-white/5 text-slate-200 hover:border-[#7dd3fc]/35 hover:bg-[#7dd3fc]/10",
                )}
              >
                {item.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
