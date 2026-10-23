import type { BuiltinRef, ChartKind, FilterConfig, LayoutItem, PageLayout, WidgetSpec } from "@/lib/chart-builder/types";

// Layouts are written by browsers without auth, so everything read back is
// sanitised: unknown shapes are dropped instead of breaking the page.

const CHARTS = new Set<ChartKind>(["bar", "bar-h", "stacked", "line", "area", "combo", "pie", "doughnut", "scatter", "radar", "card", "table", "gauge"]);
const CONTROLS = new Set(["multi", "segmented", "search", "period-range", "reference-period", "period-mode"]);
const MAX_WIDGETS = 80;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, max = 160) => (typeof value === "string" ? value.slice(0, max) : undefined);
const int = (value: unknown, min: number, max: number) => (typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : undefined);

function sanitizeItem(value: unknown, scale: number): LayoutItem | null {
  if (!isObject(value)) return null;
  const i = text(value.i, 80);
  const x = int(typeof value.x === "number" ? value.x * scale : value.x, 0, 23);
  const y = int(value.y, 0, 10_000);
  const w = int(typeof value.w === "number" ? value.w * scale : value.w, 1, 24);
  const h = int(value.h, 1, 60);
  if (!i || x === undefined || y === undefined || w === undefined || h === undefined) return null;
  return { i, x, y, w: Math.min(w, 24 - x), h, ...(value.hidden === true ? { hidden: true } : {}) };
}

function sanitizeWidget(value: unknown): WidgetSpec | BuiltinRef | null {
  if (!isObject(value)) return null;
  if (typeof value.builtin === "string") return { builtin: value.builtin.slice(0, 80) };
  const id = text(value.id, 80);
  const title = text(value.title) ?? "";
  const source = text(value.source, 80);
  const chart = value.chart as ChartKind;
  if (!id || !source || !CHARTS.has(chart)) return null;
  if (!/^(invoice|payment|export|kpi|export-target|payment-target|dataset:[\w-]+)$/.test(source)) return null;
  const measures = Array.isArray(value.measures) ? value.measures.filter(isObject).slice(0, 6) : [];
  const filters = Array.isArray(value.filters) ? value.filters.filter(isObject).slice(0, 20) : [];
  // The remaining fields are optional enums/numbers the renderer reads defensively;
  // re-serialising through JSON drops functions or prototypes.
  return JSON.parse(JSON.stringify({ ...value, id, title, source, chart, measures, filters })) as WidgetSpec;
}

function sanitizeFilter(value: unknown): FilterConfig | null {
  if (!isObject(value)) return null;
  const id = text(value.id, 80);
  const field = text(value.field, 80);
  const label = text(value.label, 80) ?? "";
  if (!id || !field || !CONTROLS.has(String(value.control))) return null;
  const strings = (input: unknown) => (Array.isArray(input) ? input.filter((item): item is string => typeof item === "string").slice(0, 200) : undefined);
  return {
    id,
    field,
    label,
    control: value.control as FilterConfig["control"],
    ...(strings(value.defaultValues) ? { defaultValues: strings(value.defaultValues) } : {}),
    ...(strings(value.targets) ? { targets: strings(value.targets) } : {}),
  };
}

export function sanitizeLayout(value: unknown, view: string): PageLayout | null {
  if (!isObject(value)) return null;
  // Version 1 layouts were saved on a 12-column grid.
  const scale = value.version === 2 ? 1 : 2;
  const items = (Array.isArray(value.items) ? value.items : []).map((item) => sanitizeItem(item, scale)).filter((item): item is LayoutItem => item !== null).slice(0, MAX_WIDGETS);
  const widgets: PageLayout["widgets"] = {};
  if (isObject(value.widgets)) {
    for (const [key, widget] of Object.entries(value.widgets).slice(0, MAX_WIDGETS)) {
      const clean = sanitizeWidget(widget);
      if (clean) widgets[key.slice(0, 80)] = clean;
    }
  }
  const filters = (Array.isArray(value.filters) ? value.filters : []).map(sanitizeFilter).filter((item): item is FilterConfig => item !== null).slice(0, 30);
  return { version: 2, view, items, widgets, filters, crossFilter: value.crossFilter === true };
}
