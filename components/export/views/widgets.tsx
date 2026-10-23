import type { IconSvgElement } from "@hugeicons/react";
import type { CardTone } from "@/components/dashboard-canvas/card-tones";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import type { ExportViewRecord } from "@/lib/export-dashboard-types";
import type { Aggregation, CardCompute, FilterRule, Measure, PaletteColor, SourceId, ValueFormat, WidgetSpec } from "@/lib/chart-builder/types";

// Helpers that turn the export views' cards and panels into canvas built-ins.
// Each carries the spec that reproduces it, so "Ubah" opens the same numbers
// in the editor and they only change when the user changes something.

type Records = (records: unknown[]) => ExportViewRecord[];
export const asExport: Records = (records) => records as ExportViewRecord[];

/** What a card computes, beyond a plain total of one column. */
export type CardSpec = {
  measures: Measure[];
  source?: SourceId;
  filters?: FilterRule[];
  compute?: CardCompute;
  target?: { field: string; source?: SourceId; agg?: Aggregation };
  topField?: string;
  ring?: boolean;
  format?: ValueFormat;
  /** KPI-sheet numbers never followed the toolbar filters. */
  ignoreFilters?: string[];
};

export function exportCard({
  id,
  title,
  icon,
  iconKey,
  tone,
  value,
  gauge,
  highlight,
  spec,
  w = 3,
}: {
  id: string;
  title: string;
  w?: number;
  icon: IconSvgElement;
  /** Key in components/dashboard-canvas/card-icons.ts, so the edited card keeps its icon. */
  iconKey: string;
  tone: CardTone;
  value: (records: ExportViewRecord[]) => string;
  gauge?: (records: ExportViewRecord[]) => number;
  highlight?: boolean;
  spec: CardSpec | { field: string; agg: Aggregation };
}): BuiltinWidget {
  const card: CardSpec = "field" in spec ? { measures: [spec] } : spec;
  return {
    id,
    title,
    kind: "card",
    source: "export",
    w,
    h: 2,
    spec: {
      title,
      source: card.source ?? "export",
      chart: "card",
      measures: card.measures,
      filters: card.filters ?? [],
      comparison: "none",
      format: card.format,
      ignoreFilters: card.ignoreFilters,
      card: { display: "value", tone, highlight, icon: iconKey, compute: card.compute, target: card.target, topField: card.topField, ring: card.ring },
    },
    render: (records) => <ExportKpi title={title} value={value(asExport(records))} icon={icon} tone={tone} highlight={highlight} gauge={gauge?.(asExport(records))} />,
  };
}

export function exportPanel({
  id,
  title,
  w,
  w24,
  h,
  newRow,
  spec,
  children,
}: {
  id: string;
  title: string;
  w: number;
  w24?: number;
  h: number;
  newRow?: boolean;
  spec?: Omit<WidgetSpec, "id" | "title" | "source" | "filters"> & { source?: SourceId; filters?: FilterRule[] };
  children: (records: ExportViewRecord[]) => React.ReactNode;
}): BuiltinWidget {
  return {
    id,
    title,
    kind: "chart",
    source: "export",
    w,
    w24,
    h,
    newRow,
    // Panels always showed only the toolbar's period, trends included.
    spec: spec ? { title, source: "export", filters: [], ...spec, options: { followPeriodFilter: true, ...spec.options } } : undefined,
    render: (records) => (
      <ChartPanel title={title} className="h-full">
        {children(asExport(records))}
      </ChartPanel>
    ),
  };
}

/** Spec of a ranked horizontal bar panel (largest by absolute value, like rankRecords). */
export function rankSpec(dimension: string, field: string, limit: number, color: PaletteColor = "turquoise"): Omit<WidgetSpec, "id" | "title" | "source" | "filters"> {
  return { chart: "bar-h", dimension, measures: [{ field, agg: "sum", color }], limit, sort: "abs-desc" };
}

/** Spec of a monthly trend panel over every month in view. */
export function trendSpec(measures: { field: string; color: PaletteColor; label?: string; source?: SourceId }[]): Omit<WidgetSpec, "id" | "title" | "source" | "filters"> {
  return { chart: "line", dimension: "periodKey", measures: measures.map((measure) => ({ ...measure, agg: "sum" as const })), timeMode: "monthly", limit: 240 };
}
