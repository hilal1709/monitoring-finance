"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterPanel({
  title,
  items,
  columns = 1,
  selected = [],
  onToggle,
  onClear,
  compact = false,
}: {
  title: string;
  items: string[];
  columns?: 1 | 2 | 3;
  selected?: string[];
  onToggle?: (item: string) => void;
  onClear?: () => void;
  compact?: boolean;
}) {
  const selectedSet = new Set(selected);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = selected.length === 0 ? "Semua" : selected.length === 1 ? selected[0] : `${selected.length} dipilih`;

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

  return (
    <div ref={containerRef} className={cn("relative self-start", compact ? "h-9" : "h-11")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0c1724] text-left font-semibold text-slate-100 transition-colors hover:border-[#7dd3fc]/35 hover:bg-white/[0.04]",
          compact ? "min-h-9 px-2 py-1.5 text-[11px]" : "min-h-11 px-3 py-2 text-xs",
          open && "border-[#7dd3fc]/45 bg-white/[0.05]",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Filter className="h-3.5 w-3.5 shrink-0 text-[#ffd166]" />
          <span className="min-w-0">
            <span className="block truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</span>
            <span className="block truncate text-[#ffd166]" title={selectedLabel}>{selectedLabel}</span>
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-[min(19rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-[#09111d] p-2 shadow-[0_20px_45px_rgba(0,0,0,0.45)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</span>
            {selected.length > 0 ? (
              <button type="button" onClick={onClear} className="rounded px-2 py-1 text-[10px] font-bold text-[#ffd166] hover:bg-[#ffd166]/10">
                Clear
              </button>
            ) : null}
          </div>

          <div className={cn("grid max-h-56 gap-1 overflow-y-auto pr-1", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-3")}>
            {items.map((item) => {
              const active = selectedSet.has(item);

              return (
                <button
                  key={`${title}-${item}`}
                  type="button"
                  aria-pressed={active}
                  title={item}
                  onClick={() => onToggle?.(item)}
                  className={cn(
                    "grid min-h-8 grid-cols-[14px_minmax(0,1fr)] items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[11px] font-medium transition-colors",
                    active ? "border-[#ffd166]/50 bg-[#ffd166] text-[#211600]" : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-[#7dd3fc]/35 hover:bg-[#7dd3fc]/10",
                  )}
                >
                  <span className={cn("grid h-3.5 w-3.5 place-items-center rounded border", active ? "border-[#211600]/40 bg-[#211600]/10" : "border-white/20")}>
                    {active ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="truncate">{item}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
