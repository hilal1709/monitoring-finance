"use client";

import { useState } from "react";
import { Tick02Icon, ArrowDown01Icon, FilterIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
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
  const selectedLabel = selected.length === 0 ? "Semua" : selected.length === 1 ? selected[0] : `${selected.length} dipilih`;

  // Options cascade in when the popover opens.
  const staggerIn = (node: HTMLDivElement | null) => {
    if (!node || prefersReducedMotion()) return;
    animate(node.querySelectorAll("[data-filter-option]"), [{ opacity: 0, translate: "0 6px" }, { opacity: 1, translate: "0 0" }], { duration: 0.25, stagger: 0.015, ease: ease.out });
  };

  return (
    <div className={cn("relative self-start", compact ? "h-9" : "h-11")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card text-left font-semibold text-teal transition-all hover:border-turquoise/50 hover:shadow-[0_6px_16px_-10px_rgba(26,83,92,0.6)]",
              compact ? "min-h-9 px-2 py-1.5 text-[11px]" : "min-h-11 px-3 py-2 text-xs",
              open && "border-turquoise bg-turquoise/5",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Icon icon={FilterIcon} className={cn("size-3.5 transition-colors", selected.length ? "text-coral-ink" : "text-teal")} />
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-black uppercase tracking-[0.16em] text-teal/90">{title}</span>
                <span className="block truncate" title={selectedLabel}>
                  {selectedLabel}
                </span>
              </span>
            </span>
            <Icon icon={ArrowDown01Icon} className={cn("size-4 text-teal/90 transition-transform duration-300", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent ref={staggerIn} align="start" className="w-[min(19rem,calc(100vw-2rem))] p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-teal/90">{title}</span>
            {selected.length > 0 ? (
              <button type="button" onClick={onClear} className="rounded px-2 py-1 text-[10px] font-bold text-coral-ink transition-colors hover:bg-coral/10">
                Reset
              </button>
            ) : null}
          </div>

          <div className={cn("grid max-h-56 gap-1 overflow-y-auto pr-1", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-2 sm:grid-cols-3")}>
            {items.map((item) => {
              const active = selectedSet.has(item);

              return (
                <button
                  key={`${title}-${item}`}
                  data-filter-option
                  type="button"
                  aria-pressed={active}
                  title={item}
                  onClick={() => onToggle?.(item)}
                  className={cn(
                    "grid min-h-8 grid-cols-[14px_minmax(0,1fr)] items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[11px] font-medium transition-all active:scale-95",
                    active ? "border-sun bg-sun text-teal" : "border-border bg-muted text-teal hover:border-turquoise/50 hover:bg-turquoise/10",
                  )}
                >
                  <span className={cn("grid size-3.5 place-items-center rounded border transition-colors", active ? "border-teal bg-teal text-mint" : "border-teal/30")}>
                    {active ? <Icon icon={Tick02Icon} className="size-2.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="truncate">{item}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
