// Spec model behind every customisable widget (chart, card, table) and every
// page filter. Specs are plain JSON so they can be stored in Postgres as-is.

/** A flat row every source is normalised into. `periodKey` (YYYY-MM) drives MoM/YoY/YTD. */
export type Row = Record<string, string | number | null>;

export type SourceId = "invoice" | "payment" | "export" | "kpi" | "export-target" | "payment-target" | `dataset:${string}`;

export type FieldKind = "dimension" | "measure" | "period";
export type ValueFormat = "idr" | "usd" | "tonnage" | "number" | "percent" | "percent-round" | "delta-percent" | "days" | "miliar";

export type FieldDef = {
  id: string;
  label: string;
  kind: FieldKind;
  /** Default number format for measures. */
  format?: ValueFormat;
  /** One plain-language sentence shown behind the "?" help. */
  help?: string;
  /** Lower is better (e.g. outstanding, aging) — flips the colour of change badges. */
  lowerIsBetter?: boolean;
  /** Fixed order of a dimension's values (e.g. Current, Bucket 1 … Bucket 4). */
  order?: string[];
};

export type SourceDef = {
  id: SourceId;
  label: string;
  description: string;
  fields: FieldDef[];
};

/** "monthly-avg" = total ÷ number of months with data. */
export type Aggregation = "sum" | "count" | "avg" | "min" | "max" | "distinct" | "monthly-avg";

export type Measure = {
  field: string;
  agg: Aggregation;
  label?: string;
  color?: PaletteColor;
  axis?: "left" | "right";
  /** Combo charts: draw this measure as a line over the bars. */
  asLine?: boolean;
  /** Read this measure from another source of the page (joined on the dimension, e.g. the period). */
  source?: SourceId;
  /** Show this measure divided by another one per group (e.g. realisation ÷ target). */
  divideBy?: { field: string; agg: Aggregation; source?: SourceId };
};

export type FilterOp = "in" | "not-in" | "contains" | "gte" | "lte";
export type FilterRule = { field: string; op: FilterOp; values: (string | number)[] };

export type ChartKind =
  | "bar"
  | "bar-h"
  | "stacked"
  | "line"
  | "area"
  | "combo"
  | "pie"
  | "doughnut"
  | "scatter"
  | "radar"
  | "card"
  | "table"
  | "gauge";

export type PaletteColor = "turquoise" | "coral" | "sun" | "teal" | "mint" | "turquoise-soft" | "coral-soft" | "sun-soft" | "slate";

/** How the time axis / headline number is compared (see lib/chart-builder/time-intel.ts). */
export type Comparison = "none" | "mom" | "yoy" | "ytd" | "target";
/** What a chart whose dimension is the period plots. */
export type TimeSeriesMode = "monthly" | "ytd-cumulative" | "ytd-vs-last-year" | "yoy-growth" | "mom-change" | "vs-last-year";

export type CardDisplay = "value" | "value-change" | "progress";

/**
 * How a card turns its measure (A) and its target (B) into the headline:
 * ratio = A ÷ B, difference = A − B, remaining = max(0, B − A),
 * share = A of the rows in `share` ÷ A of all rows, split = share of each value of `split`,
 * top = the label of the largest group of `topField`.
 */
export type CardCompute = "value" | "ratio" | "difference" | "remaining" | "share" | "split" | "top";

/**
 * Presentation. "auto" draws with the dashboard's own components (ranking bars,
 * donut with legend, trend lines, KPI cards) whenever the chart type has one;
 * "standard" always uses the generic chart. The rest are special panels.
 */
export type WidgetView =
  | "auto"
  | "standard"
  | "report"
  | "export"
  | "grouped-bars"
  | "variance-bars"
  | "movement"
  | "kpi-summary"
  | "kpi-table"
  | "map";

export type WidgetSpec = {
  id: string;
  title: string;
  subtitle?: string;
  source: SourceId;
  chart: ChartKind;
  /** Group-by field; the period field turns the chart into a time series. */
  dimension?: string;
  /** Second group-by that splits each bar/line into colours. */
  breakdown?: string;
  measures: Measure[];
  filters: FilterRule[];
  /** value-desc = largest first; abs-desc = largest regardless of sign; label = A–Z / fixed order (top `limit` by value, then ordered). */
  sort?: "value-desc" | "abs-desc" | "value-asc" | "label";
  limit?: number;
  format?: ValueFormat;
  /** "page" follows the page's MoM/YoY/YTD selector; anything else is locked. */
  comparison?: Comparison | "page";
  timeMode?: TimeSeriesMode | "page";
  /** Page filters this widget ignores ("*" = all of them). */
  ignoreFilters?: string[];
  card?: {
    display: CardDisplay;
    tone?: "turquoise" | "mint" | "coral" | "sun";
    highlight?: boolean;
    sparkline?: boolean;
    /** Fixed target, or a measure field (e.g. KPI target) summed with the same filters. */
    target?: number | { field: string; source?: SourceId; agg?: Aggregation };
    compute?: CardCompute;
    /** compute "share": the rows counted in the numerator. */
    share?: FilterRule;
    /** compute "split": the dimension and the values shown (first = headline, rest = detail line). */
    split?: { field: string; values: string[] };
    /** compute "top": the dimension whose largest group is shown. */
    topField?: string;
    /** Icon of the classic KPI card (see components/dashboard-canvas/card-icons.ts). */
    icon?: string;
    /** Classic card with a ring around the icon filled to A ÷ B. */
    ring?: boolean;
  };
  options?: {
    legend?: boolean;
    dataLabels?: boolean;
    smooth?: boolean;
    targetLine?: number;
    /** Adds a straight trend line fitted to the first measure (time charts). */
    trendline?: boolean;
    /** Keep the page period filter even for MoM/YoY/YTD charts (e.g. a KPI semester view). */
    followPeriodFilter?: boolean;
    /** Donut: label in the hole. */
    centerLabel?: string;
    /** Donut: "Label: share%" line above the chart for this group. */
    summaryOf?: { label: string; caption: string };
    /** Time charts: show only the month on the axis (no year). */
    monthOnly?: boolean;
    /** Donut: show this group's share in the hole instead of `centerLabel`. */
    centerShareOf?: string;
    /** Time charts: compute MoM/YoY/YTD from the last N months with data only (the original dashboards used 12). */
    historyMonths?: number;
    /** Append the page's period wording to the title (e.g. "… - Semester 2 berjalan (Jul–Agu 2026)"). */
    appendPeriodLabel?: boolean;
  };
  view?: WidgetView;
};

/** A hand-built widget that ships with a page (map, gauge, existing panels). */
export type BuiltinRef = { builtin: string };

export type LayoutItem = { i: string; x: number; y: number; w: number; h: number; hidden?: boolean };

export type FilterControl = "multi" | "segmented" | "search" | "period-range" | "reference-period" | "period-mode";

export type FilterConfig = {
  id: string;
  /** Field id within the page's source (or the shared "periodKey"). */
  field: string;
  label: string;
  control: FilterControl;
  defaultValues?: string[];
  /** Widget ids this filter applies to; omitted = every widget. */
  targets?: string[];
};

export type PageLayout = {
  /** 2 = 24-column grid (version 1 layouts used 12 columns and are scaled up when read). */
  version: 2;
  view: string;
  items: LayoutItem[];
  widgets: Record<string, WidgetSpec | BuiltinRef>;
  filters: FilterConfig[];
  /** Click a bar/slice to filter the other widgets. */
  crossFilter?: boolean;
};

export function isBuiltin(widget: WidgetSpec | BuiltinRef): widget is BuiltinRef {
  return "builtin" in widget;
}

/** Values a page currently filters on, keyed by FilterConfig.id. */
export type FilterState = Record<string, string[]>;
