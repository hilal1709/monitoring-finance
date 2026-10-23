import type { ReactNode } from "react";
import type { FilterConfig, LayoutItem, PageLayout, SourceId, WidgetSpec } from "@/lib/chart-builder/types";

/** 24 columns: halves, thirds, quarters and near-fifths of the old CSS grids all fit. */
export const GRID_COLS = 24;
/** Built-ins give their width in twelfths, like the original `lg:grid-cols-*` layouts. */
const SPAN = GRID_COLS / 12;
export const ROW_HEIGHT = 44;
export const GRID_GAP = 8;

/** A hand-built widget that ships with a page. */
export type BuiltinWidget = {
  id: string;
  title: string;
  kind: "chart" | "card" | "filter" | "panel";
  /** Source whose (page-filtered) records `render` receives first. */
  source?: SourceId;
  /** More sources the widget reads, passed to `render` as its second argument. */
  sources?: SourceId[];
  /** Width in twelfths of the row (12 = full width). */
  w: number;
  /** Exact width in 24ths, when twelfths can't match the original (e.g. five equal cards). */
  w24?: number;
  h: number;
  /** Start a new row before this widget in the default layout. */
  newRow?: boolean;
  /** Equivalent spec: lets "Ubah" turn the widget into an editable custom one. */
  spec?: Omit<WidgetSpec, "id">;
  /** Built-in page filters: "Ubah" turns them into a canvas filter on this column (and clears the old one). */
  filter?: { field: string; label: string; clear: () => void };
  render: (records: unknown[], bySource: Partial<Record<SourceId, unknown[]>>) => ReactNode;
};

/** Left-to-right flow into a 12-column grid, wrapping like the original CSS grids did. */
export function packDefault(builtins: Pick<BuiltinWidget, "id" | "w" | "w24" | "h" | "newRow">[]): LayoutItem[] {
  const items: LayoutItem[] = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const widget of builtins) {
    const w = Math.min(widget.w24 ?? widget.w * SPAN, GRID_COLS);
    if (x + w > GRID_COLS || (widget.newRow && x > 0)) {
      y += rowHeight;
      x = 0;
      rowHeight = 0;
    }
    items.push({ i: widget.id, x, y, w, h: widget.h });
    x += w;
    rowHeight = Math.max(rowHeight, widget.h);
  }
  return items;
}

export function bottomOf(items: LayoutItem[]) {
  return items.filter((item) => !item.hidden).reduce((max, item) => Math.max(max, item.y + item.h), 0);
}

export function defaultLayout(view: string, builtins: BuiltinWidget[], filters: FilterConfig[] = []): PageLayout {
  return {
    version: 2,
    view,
    items: packDefault(builtins),
    widgets: Object.fromEntries(builtins.map((widget) => [widget.id, { builtin: widget.id }])),
    filters,
  };
}

/**
 * Saved layout + the page's current built-ins: widgets added to the page since
 * the save are appended, references to built-ins that no longer exist dropped.
 */
export function mergeLayout(saved: PageLayout | null | undefined, view: string, builtins: BuiltinWidget[]): PageLayout {
  if (!saved) return defaultLayout(view, builtins);
  const known = new Set(builtins.map((widget) => widget.id));
  const widgets: PageLayout["widgets"] = {};
  for (const [id, widget] of Object.entries(saved.widgets)) {
    if ("builtin" in widget ? known.has(widget.builtin) : true) widgets[id] = widget;
  }
  const filterIds = new Set(saved.filters.map((filter) => filter.id));
  const items = saved.items.filter((item) => widgets[item.i] || filterIds.has(item.i));
  const placed = new Set(items.map((item) => item.i));
  let y = bottomOf(items);
  for (const widget of builtins) {
    if (placed.has(widget.id) || widgets[widget.id]) continue;
    widgets[widget.id] = { builtin: widget.id };
    items.push({ i: widget.id, x: 0, y, w: widget.w24 ?? widget.w * SPAN, h: widget.h });
    y += widget.h;
  }
  return { ...saved, view, items, widgets };
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Tab order / mobile order: top-to-bottom, then left-to-right. */
export function readingOrder(items: LayoutItem[]) {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}
