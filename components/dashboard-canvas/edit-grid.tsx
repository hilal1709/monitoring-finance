"use client";

import { GridLayout, useContainerWidth, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { GRID_COLS, GRID_GAP, ROW_HEIGHT } from "@/components/dashboard-canvas/layout-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { LayoutItem } from "@/lib/chart-builder/types";

// Drag & resize grid for edit mode. Loaded only when the user presses
// "Atur Dashboard", so react-grid-layout never reaches the initial page JS.

export default function EditGrid({
  items,
  minSizes,
  renderItem,
  onChange,
}: {
  items: LayoutItem[];
  minSizes: Record<string, { minW?: number; minH?: number }>;
  renderItem: (id: string) => React.ReactNode;
  onChange: (items: LayoutItem[]) => void;
}) {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const visible = items.filter((item) => !item.hidden);
  const layout: Layout = visible.map((item) => ({ ...item, ...minSizes[item.i] }));

  return (
    <TooltipProvider delayDuration={200}>
    <div ref={containerRef} className="canvas-edit-grid">
      {mounted ? (
        <GridLayout
          width={width}
          layout={layout}
          gridConfig={{ cols: GRID_COLS, rowHeight: ROW_HEIGHT, margin: [GRID_GAP, GRID_GAP], containerPadding: [0, 0] }}
          dragConfig={{ enabled: true, handle: "[data-drag-handle]", cancel: "[data-no-drag]" }}
          resizeConfig={{ enabled: true, handles: ["se", "e", "s"] }}
          onLayoutChange={(next) => {
            const byId = new Map(next.map((item) => [item.i, item]));
            const changed = items.map((item) => {
              const moved = byId.get(item.i);
              return moved ? { ...item, x: moved.x, y: moved.y, w: moved.w, h: moved.h } : item;
            });
            if (changed.some((item, index) => item.x !== items[index].x || item.y !== items[index].y || item.w !== items[index].w || item.h !== items[index].h)) onChange(changed);
          }}
        >
          {visible.map((item) => (
            <div key={item.i} className="h-full">
              {renderItem(item.i)}
            </div>
          ))}
        </GridLayout>
      ) : null}
    </div>
    </TooltipProvider>
  );
}
