"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { useCustomize, useRegisterCanvas } from "@/components/dashboard-canvas/customize-context";
import { useCanvasContent, type CanvasSources, type CanvasState } from "@/components/dashboard-canvas/canvas-content";
import { mergeLayout, readingOrder, type BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import type { CrossFilter } from "@/lib/chart-builder/filters";
import type { FilterState, SourceId } from "@/lib/chart-builder/types";
import { loadAos, refreshAos } from "@/lib/aos";
import type { PeriodMode } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

export { lazySource, type CanvasSource, type CanvasSources } from "@/components/dashboard-canvas/canvas-content";

// The whole edit mode (draft, dock, editors, guide) is one lazy chunk.
const CanvasEditor = dynamic(() => import("@/components/dashboard-canvas/canvas-editor"), {
  ssr: false,
  loading: () => <div className="h-96 rounded-lg shimmer" aria-hidden />,
});

/**
 * Customisable widget grid for one dashboard page. In view mode it is a plain
 * CSS grid of the saved layout; "Atur Dashboard" (page header) swaps in the
 * drag/resize editor, fetched on demand.
 */
export function DashboardCanvas({
  builtins,
  sources: pageSources,
  primarySource,
  periodMode: controlledPeriodMode,
  onPeriodModeChange,
  periodScope,
  periodLabel,
  periodTag,
  className,
}: {
  builtins: BuiltinWidget[];
  sources: CanvasSources;
  /** Source suggested first when adding a widget. */
  primarySource: SourceId;
  periodMode?: PeriodMode;
  onPeriodModeChange?: (value: PeriodMode) => void;
  /**
   * Period keys picked by the page's own period filter (null = all). Built-ins
   * and plain widgets are narrowed to them; MoM/YoY/YTD widgets keep the full
   * history and use the latest picked month as their reference month instead.
   */
  periodScope?: string[] | null;
  /** How the page names its current period (KPI summary sentence), e.g. "Semester 2 berjalan (Jul–Agu 2026)" and "S2". */
  periodLabel?: string;
  periodTag?: string;
  className?: string;
}) {
  useRegisterCanvas();
  const customize = useCustomize();
  const view = customize?.view ?? "page";
  const editing = customize?.editing ?? false;
  const builtinById = useMemo(() => new Map(builtins.map((widget) => [widget.id, widget])), [builtins]);
  const layout = useMemo(() => mergeLayout(customize?.layout, view, builtins), [customize?.layout, view, builtins]);

  const [filterState, setFilterState] = useState<FilterState>({});
  const [crossFilter, setCrossFilter] = useState<CrossFilter>(null);
  const [ownPeriodMode, setOwnPeriodMode] = useState<PeriodMode>("mom");
  const state: CanvasState = {
    pageSources,
    builtinById,
    filterState,
    setFilterState,
    crossFilter,
    setCrossFilter,
    periodMode: controlledPeriodMode ?? ownPeriodMode,
    setPeriodMode: onPeriodModeChange ?? setOwnPeriodMode,
    periodScope,
    periodLabel,
    periodTag,
  };
  const content = useCanvasContent(layout, state, { editing: false });

  // Rendered heights, so edit mode starts with every widget fully visible.
  const [measured] = useState(() => new Map<string, number>());
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing) return;
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.widgetContent;
        if (id) measured.set(id, entry.contentRect.height);
      }
    });
    grid.querySelectorAll<HTMLElement>("[data-widget-content]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [editing, layout, measured]);

  // Scroll reveal for widgets below the fold (AOS loads on the first scroll).
  useEffect(() => {
    if (editing) return;
    void loadAos().then(() => refreshAos());
  }, [editing, layout]);

  const visibleItems = readingOrder(layout.items.filter((item) => !item.hidden));

  return (
    <div className={cn("relative", editing && "pb-28", className)}>
      {crossFilter && !editing ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-teal">
          <span>Disaring dari grafik:</span>
          <button type="button" className="inline-flex items-center gap-1 rounded-full bg-sun px-2.5 py-1 font-bold" onClick={() => setCrossFilter(() => null)}>
            {crossFilter.value}
            <Icon icon={Cancel01Icon} className="size-3" />
            <span className="sr-only">Hapus saringan</span>
          </button>
        </div>
      ) : null}

      {editing ? (
        <CanvasEditor view={view} merged={layout} builtins={builtins} primarySource={primarySource} measured={measured} state={state} />
      ) : (
        // Phones: one column; tablets: two (small widgets side by side); desktop: the saved 12-column grid.
        <div ref={gridRef} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:auto-rows-[minmax(44px,auto)] lg:grid-cols-24">
          {visibleItems.map((item, index) => (
            <div
              key={item.i}
              data-aos={item.y > 10 ? "fade-up" : undefined}
              className={cn("min-w-0 lg:[grid-column:var(--gc)] lg:[grid-row:var(--gr)]", item.w > 8 && "sm:col-span-2")}
              style={{ "--gc": `${item.x + 1} / span ${item.w}`, "--gr": `${item.y + 1} / span ${item.h}`, order: index } as React.CSSProperties}
            >
              <div data-widget-content={item.i} className="h-full [&>*]:h-full">
                {content.renderContent(item.i)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
