"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { useDatasetSources } from "@/components/dashboard-canvas/use-datasets";
import type { PageContext } from "@/lib/chart-builder/aggregate";
import { applyRules, distinctValues, pageRulesFor, type CrossFilter } from "@/lib/chart-builder/filters";
import type { FilterRule, FilterState, PageLayout, Row, SourceDef, SourceId, WidgetSpec } from "@/lib/chart-builder/types";
import { isBuiltin } from "@/lib/chart-builder/types";
import type { PeriodMode } from "@/lib/dashboard-types";

// What a canvas renders for one layout — shared by view mode (the saved layout)
// and edit mode (the draft), so both show widgets exactly the same way.

// Custom widgets and slicers are separate chunks, fetched only when a layout has them.
const SpecWidget = dynamic(() => import("@/components/dashboard-canvas/spec-widget").then((module) => module.SpecWidget), {
  loading: () => <div className="h-full min-h-24 rounded-lg shimmer" aria-hidden />,
});
const Slicer = dynamic(() => import("@/components/dashboard-canvas/slicer").then((module) => module.Slicer), {
  loading: () => <div className="h-9 rounded-lg shimmer" aria-hidden />,
});

/** Rows of one source; `records[i]` is the original record behind `rows[i]`. */
export type CanvasSource = { def: SourceDef; readonly rows: Row[]; records: unknown[] };
export type CanvasSources = Partial<Record<SourceId, CanvasSource>>;

/**
 * A source whose builder rows are only computed the first time something reads
 * them (custom widgets, filters, the editor). Pages made of built-ins alone
 * never pay for the conversion.
 */
export function lazySource<T>(def: SourceDef, records: T[], toRows: (records: T[]) => Row[]): CanvasSource {
  let rows: Row[] | null = null;
  return {
    def,
    records,
    get rows() {
      rows ??= toRows(records);
      return rows;
    },
  };
}

const PERIOD_FIELDS = new Set(["periodKey", "year", "month"]);

/** Widgets that compare periods need the months before the reference month. */
export function isTimeAware(spec: WidgetSpec) {
  if (spec.dimension === "periodKey" && !spec.breakdown) return true;
  return (spec.chart === "card" || spec.chart === "gauge") && spec.comparison !== undefined && spec.comparison !== "none" && spec.comparison !== "target";
}

export type CanvasState = {
  pageSources: CanvasSources;
  builtinById: Map<string, BuiltinWidget>;
  filterState: FilterState;
  setFilterState: (update: (state: FilterState) => FilterState) => void;
  crossFilter: CrossFilter;
  setCrossFilter: (update: (current: CrossFilter) => CrossFilter) => void;
  periodMode: PeriodMode;
  setPeriodMode: (value: PeriodMode) => void;
  periodScope?: string[] | null;
  /** Page wording for the current period, shown by the KPI summary. */
  periodLabel?: string;
  periodTag?: string;
};

export function useCanvasContent(layout: PageLayout, state: CanvasState, { editing }: { editing: boolean }) {
  const { pageSources, builtinById, filterState, setFilterState, crossFilter, setCrossFilter, periodMode, setPeriodMode, periodScope, periodLabel, periodTag } = state;
  const { datasetSources, addDatasetSource } = useDatasetSources(layout);
  const sources = useMemo<CanvasSources>(() => ({ ...pageSources, ...datasetSources }), [pageSources, datasetSources]);

  // Page filters list values from the page's own data (uploaded datasets have their own columns).
  const needsRows = layout.filters.length > 0;
  const allRows = useMemo(() => (needsRows ? Object.values(pageSources).flatMap((source) => source?.rows ?? []) : []), [pageSources, needsRows]);
  const periodOptions = useMemo(() => distinctValues(allRows, "periodKey").filter((value) => value !== "Unmapped"), [allRows]);
  const scopeRule = useMemo<FilterRule | null>(() => (periodScope?.length ? { field: "periodKey", op: "in", values: periodScope } : null), [periodScope]);
  const referencePeriod = useMemo(() => {
    const config = layout.filters.find((filter) => filter.control === "reference-period");
    const picked = config ? (filterState[config.id]?.[0] ?? config.defaultValues?.[0] ?? null) : null;
    return picked ?? (periodScope?.length ? [...periodScope].sort().at(-1)! : null);
  }, [layout.filters, filterState, periodScope]);

  const rulesFor = useCallback(
    (id: string, spec?: Pick<WidgetSpec, "ignoreFilters">, timeAware = false): FilterRule[] => {
      const rules = pageRulesFor(id, spec, layout.filters, filterState);
      if (scopeRule && !timeAware && !spec?.ignoreFilters?.includes("*")) rules.push(scopeRule);
      if (crossFilter && crossFilter.widgetId !== id && !spec?.ignoreFilters?.includes("*")) rules.push({ field: crossFilter.field, op: "in", values: [crossFilter.value] });
      return rules;
    },
    [layout.filters, filterState, crossFilter, scopeRule],
  );

  // Context shared by every custom widget (and the editor preview): other page
  // sources for cross-source measures, the page selector and period wording.
  const baseContext = useMemo<PageContext>(
    () => ({
      periodMode,
      onPeriodModeChange: setPeriodMode,
      referencePeriod,
      periodLabel,
      periodTag,
      resolve: (id) => {
        const source = sources[id];
        return source ? { def: source.def, rows: source.rows } : undefined;
      },
    }),
    [periodMode, setPeriodMode, referencePeriod, periodLabel, periodTag, sources],
  );

  /** The context a custom widget computes with (page filters, semester scope, reference month). */
  const contextFor = useCallback(
    (id: string, widget: WidgetSpec): PageContext => {
      const timeAware = isTimeAware(widget) && !widget.options?.followPeriodFilter;
      const rules = rulesFor(id, widget, timeAware);
      if (!timeAware) return { ...baseContext, rules };
      // A Year/Month filter picks the reference month of a MoM/YoY/YTD widget instead of cutting its history.
      const periodRules = rules.filter((rule) => PERIOD_FIELDS.has(rule.field));
      const otherRules = rules.filter((rule) => !PERIOD_FIELDS.has(rule.field));
      let reference = baseContext.referencePeriod ?? null;
      const rows = sources[widget.source]?.rows;
      if (periodRules.length && rows) {
        // Latest month that passes both the canvas period filters and the page's own period filter.
        reference = null;
        for (const row of applyRules(rows, scopeRule ? [...periodRules, scopeRule] : periodRules)) if (typeof row.periodKey === "string" && (!reference || row.periodKey > reference)) reference = row.periodKey;
      }
      return { ...baseContext, referencePeriod: reference, rules: otherRules };
    },
    [rulesFor, baseContext, sources, scopeRule],
  );

  // Per widget: the records a built-in renders, or the context a custom widget
  // computes with. Built once per layout/filter change so that unrelated state
  // (open modals, the editor) doesn't make charts recompute.
  const widgetInputs = useMemo(() => {
    const filtered = new Map<string, unknown[]>();
    const recordsOf = (source: SourceId, rules: FilterRule[]) => {
      const entry = sources[source];
      if (!entry) return [];
      if (rules.length === 0) return entry.records;
      const key = `${source}:${JSON.stringify(rules)}`;
      let records = filtered.get(key);
      if (!records) {
        const keep = new Set(applyRules(entry.rows, rules));
        records = entry.records.filter((_, index) => keep.has(entry.rows[index]));
        filtered.set(key, records);
      }
      return records;
    };
    const records = new Map<string, Partial<Record<SourceId, unknown[]>>>();
    const contexts = new Map<string, PageContext>();
    for (const item of layout.items) {
      const widget = layout.widgets[item.i];
      if (!widget) continue;
      if (isBuiltin(widget)) {
        const builtin = builtinById.get(widget.builtin);
        if (!builtin) continue;
        const rules = rulesFor(item.i);
        const ids = [...new Set([builtin.source, ...(builtin.sources ?? [])])].filter((source): source is SourceId => Boolean(source));
        records.set(item.i, Object.fromEntries(ids.map((source) => [source, recordsOf(source, rules)])));
      } else {
        contexts.set(item.i, contextFor(item.i, widget));
      }
    }
    return { records, contexts };
  }, [layout.items, layout.widgets, sources, builtinById, rulesFor, contextFor]);

  function renderContent(id: string) {
    const filter = layout.filters.find((item) => item.id === id);
    if (filter) {
      const options = filter.control === "period-range" || filter.control === "reference-period" ? periodOptions : distinctValues(allRows, filter.field, 60);
      return (
        <Slicer
          config={filter}
          options={options}
          values={filterState[filter.id] ?? filter.defaultValues ?? []}
          onChange={(values) => setFilterState((current) => ({ ...current, [filter.id]: values }))}
          periodMode={periodMode}
          onPeriodModeChange={setPeriodMode}
        />
      );
    }
    const widget = layout.widgets[id];
    if (!widget) return null;
    if (isBuiltin(widget)) {
      const builtin = builtinById.get(widget.builtin);
      if (!builtin) return null;
      const bySource = widgetInputs.records.get(id) ?? {};
      return builtin.render(builtin.source ? (bySource[builtin.source] ?? []) : [], bySource);
    }
    const source = sources[widget.source];
    const dimension = widget.dimension;
    return (
      <SpecWidget
        spec={widget}
        def={source?.def}
        rows={source?.rows}
        context={widgetInputs.contexts.get(id) ?? baseContext}
        onSelect={
          layout.crossFilter && dimension && !editing
            ? (value) => setCrossFilter((current) => (current?.widgetId === id && current.value === value ? null : { widgetId: id, field: dimension, value }))
            : undefined
        }
      />
    );
  }

  function titleOf(id: string) {
    const filter = layout.filters.find((item) => item.id === id);
    if (filter) return `Filter: ${filter.label}`;
    const widget = layout.widgets[id];
    if (!widget) return id;
    return isBuiltin(widget) ? (builtinById.get(widget.builtin)?.title ?? id) : widget.title;
  }

  return { sources, addDatasetSource, referencePeriod, baseContext, contextFor, renderContent, titleOf };
}
