import { applyRules, cellText } from "@/lib/chart-builder/filters";
import { fieldOf } from "@/lib/chart-builder/sources";
import { achievement, compare, periodLabel, timeSeries, type ComparisonResult, type PeriodTotals } from "@/lib/chart-builder/time-intel";
import type { Aggregation, CardCompute, Comparison, FilterRule, Measure, PaletteColor, Row, SourceDef, SourceId, TimeSeriesMode, ValueFormat, WidgetSpec } from "@/lib/chart-builder/types";
import type { PeriodMode } from "@/lib/dashboard-types";

// Spec + rows → numbers ready to draw. Pure functions, no React.

export type PageContext = {
  /** The page's MoM/YoY/YTD selector, for widgets set to follow it. */
  periodMode?: PeriodMode;
  /** Lets classic trend panels switch the page selector from inside the chart. */
  onPeriodModeChange?: (value: PeriodMode) => void;
  /** "Periode acuan" picked on the page; defaults to the latest month with data. */
  referencePeriod?: string | null;
  /** Page filter rules that apply to this widget (see filters.pageRulesFor). */
  rules?: FilterRule[];
  /** Other sources of the page, for measures/targets that read from them. */
  resolve?: (source: SourceId) => { def: SourceDef; rows: Row[] } | undefined;
  /** Page wording for the current period, e.g. "Semester 2 berjalan (Jul–Agu 2026)" / "S2". */
  periodLabel?: string;
  periodTag?: string;
};

export type ChartSeries = {
  id: string;
  label: string;
  color: PaletteColor;
  values: (number | null)[];
  /** Total over every group, before `limit` (shares are relative to it). */
  total: number;
  axis?: "left" | "right";
  asLine?: boolean;
  dashed?: boolean;
};

export type ChartData = {
  labels: string[];
  /** Raw group values behind each label (period keys for time series), used for click-to-filter. */
  keys: string[];
  series: ChartSeries[];
  format: ValueFormat;
  isTime: boolean;
  timeMode?: TimeSeriesMode;
  /** Source rows behind each label (dimension charts), for "n rows" tooltips. */
  counts?: number[];
  empty: boolean;
};

export const seriesColors: PaletteColor[] = ["turquoise", "coral", "sun", "teal", "turquoise-soft", "coral-soft", "sun-soft", "slate"];

const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type Acc = { sum: number; weight: number; min: number; max: number; distinct: Set<string>; byPeriod?: Map<string, number> };

function newAcc(): Acc {
  return { sum: 0, weight: 0, min: Infinity, max: -Infinity, distinct: new Set() };
}

function addToAcc(acc: Acc, row: Row, field: string, agg: Aggregation) {
  const weight = Number(row.count ?? 1) || 1;
  const raw = row[field];
  acc.weight += weight;
  if (agg === "distinct") {
    acc.distinct.add(cellText(raw));
    return;
  }
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) return;
  acc.sum += value;
  acc.min = Math.min(acc.min, value);
  acc.max = Math.max(acc.max, value);
  if (agg === "monthly-avg" && typeof row.periodKey === "string") {
    acc.byPeriod ??= new Map();
    acc.byPeriod.set(row.periodKey, (acc.byPeriod.get(row.periodKey) ?? 0) + value);
  }
}

function readAcc(acc: Acc | undefined, agg: Aggregation): number | null {
  if (!acc || acc.weight === 0) return null;
  switch (agg) {
    case "sum":
      return acc.sum;
    case "count":
      return acc.weight;
    case "avg":
      return acc.sum / acc.weight;
    case "min":
      return Number.isFinite(acc.min) ? acc.min : null;
    case "max":
      return Number.isFinite(acc.max) ? acc.max : null;
    case "distinct":
      return acc.distinct.size;
    case "monthly-avg": {
      const months = [...(acc.byPeriod?.values() ?? [])];
      return months.length ? months.reduce((total, value) => total + value, 0) / months.length : 0;
    }
  }
}

function aggregate(rows: Row[], field: string, agg: Aggregation) {
  const acc = newAcc();
  for (const row of rows) addToAcc(acc, row, field, agg);
  return readAcc(acc, agg);
}

export function measureFormat(spec: Pick<WidgetSpec, "format" | "measures">, def: SourceDef | undefined, resolve?: PageContext["resolve"]): ValueFormat {
  if (spec.format) return spec.format;
  const first = spec.measures[0];
  if (!first) return "number";
  if (first.divideBy) return "percent";
  if (first.agg === "count" || first.agg === "distinct") return "number";
  const measureDef = first.source ? (resolve?.(first.source)?.def ?? def) : def;
  return fieldOf(measureDef, first.field)?.format ?? "number";
}

export function measureLabel(measure: Measure, def: SourceDef | undefined, resolve?: PageContext["resolve"]) {
  if (measure.label) return measure.label;
  const measureDef = measure.source ? (resolve?.(measure.source)?.def ?? def) : def;
  const label = fieldOf(measureDef, measure.field)?.label ?? measure.field;
  const name = label.charAt(0).toLowerCase() + label.slice(1);
  if (measure.agg === "count") return "Jumlah data";
  if (measure.agg === "distinct") return `Jumlah ${name} unik`;
  if (measure.agg === "avg") return `Rata-rata ${name}`;
  if (measure.agg === "monthly-avg") return `Rata-rata ${name} per bulan`;
  if (measure.agg === "min") return `Terendah ${name}`;
  if (measure.agg === "max") return `Tertinggi ${name}`;
  if (measure.divideBy) return `${label} ÷ ${fieldOf(measure.divideBy.source ? resolve?.(measure.divideBy.source)?.def : measureDef, measure.divideBy.field)?.label ?? measure.divideBy.field}`;
  return label;
}

/** Rules whose column exists in `def` (a filter on a column a source lacks doesn't empty it). */
function rulesFor(def: SourceDef | undefined, rules: FilterRule[]) {
  if (!def) return rules;
  const known = new Set([...def.fields.map((field) => field.id), "periodKey", "year", "month", "count"]);
  return rules.filter((rule) => known.has(rule.field));
}

export function widgetRows(spec: Pick<WidgetSpec, "filters">, rows: Row[], context: PageContext, def?: SourceDef) {
  return applyRules(applyRules(rows, rulesFor(def, spec.filters ?? [])), rulesFor(def, context.rules ?? []));
}

/** Rows of `source` for this widget — the widget's own source, or another page source. */
function sourceRows(spec: WidgetSpec, source: SourceId | undefined, primary: { def?: SourceDef; rows: Row[] }, context: PageContext) {
  if (!source || source === spec.source) return primary;
  const other = context.resolve?.(source);
  if (!other) return { def: undefined, rows: [] as Row[] };
  return { def: other.def, rows: widgetRows(spec, other.rows, context, other.def) };
}

/** Per-period values of one measure (for time intelligence); ratio measures divide per period. */
export function periodTotals(rows: Row[], measure: Pick<Measure, "field" | "agg">, divide?: { rows: Row[]; field: string; agg: Aggregation }): PeriodTotals {
  const group = (input: Row[], field: string, agg: Aggregation) => {
    const accs = new Map<string, Acc>();
    for (const row of input) {
      const key = row.periodKey;
      if (typeof key !== "string") continue;
      const acc = accs.get(key) ?? newAcc();
      addToAcc(acc, row, field, agg);
      accs.set(key, acc);
    }
    return accs;
  };
  const main = group(rows, measure.field, measure.agg);
  const below = divide ? group(divide.rows, divide.field, divide.agg) : null;
  const totals: PeriodTotals = new Map();
  if (!below) {
    for (const [key, acc] of main) totals.set(key, readAcc(acc, measure.agg) ?? 0);
    return totals;
  }
  // Ratios cover every period of either side: a month with a target but no realisation is 0%.
  for (const key of new Set([...main.keys(), ...below.keys()])) {
    const value = readAcc(main.get(key), measure.agg) ?? 0;
    const denominator = readAcc(below.get(key), divide!.agg) ?? 0;
    totals.set(key, denominator ? value / denominator : 0);
  }
  return totals;
}

/**
 * Charts that follow the page selector keep the dashboards' behaviour: "MoM"
 * shows the monthly values with the same month last year alongside, "YoY" the
 * growth vs last year, "YTD" the running total vs last year's.
 */
export function resolveTimeMode(spec: Pick<WidgetSpec, "timeMode">, context: PageContext): TimeSeriesMode {
  if (spec.timeMode && spec.timeMode !== "page") return spec.timeMode;
  if (context.periodMode === "yoy") return "yoy-growth";
  if (context.periodMode === "ytd") return "ytd-vs-last-year";
  return "vs-last-year";
}

export function resolveComparison(spec: Pick<WidgetSpec, "comparison">, context: PageContext): Comparison {
  if (spec.comparison === "page") return context.periodMode ?? "mom";
  return spec.comparison ?? "none";
}

type Group = { key: string; values: (number | null)[] };

function orderIndex(order: string[] | undefined, dimension: string) {
  const list = order ?? (dimension === "month" ? MONTH_ORDER : undefined);
  if (!list) return null;
  const index = new Map(list.map((label, position) => [label.toLowerCase(), position]));
  return (key: string) => index.get(key.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
}

function sortAndLimit(groups: Group[], spec: Pick<WidgetSpec, "sort" | "limit">, dimension: string, order: string[] | undefined): Group[] {
  const head = (group: Group) => group.values[0] ?? 0;
  const byValue = {
    "value-desc": (a: Group, b: Group) => head(b) - head(a),
    "value-asc": (a: Group, b: Group) => head(a) - head(b),
    "abs-desc": (a: Group, b: Group) => Math.abs(head(b)) - Math.abs(head(a)),
  };
  const fixed = orderIndex(order, dimension);
  const byLabel = (a: Group, b: Group) => (fixed ? fixed(a.key) - fixed(b.key) || a.key.localeCompare(b.key) : a.key.localeCompare(b.key, "id", { numeric: true }));
  const sort = spec.sort ?? (fixed || dimension === "year" || dimension === "periodKey" ? "label" : "abs-desc");

  if (sort !== "label") {
    const sorted = [...groups].sort(byValue[sort]);
    return spec.limit ? sorted.slice(0, spec.limit) : sorted;
  }
  // Time axes keep the latest months; other ordered axes keep the largest groups, then order them.
  if (dimension === "periodKey") {
    const sorted = [...groups].sort(byLabel);
    return spec.limit ? sorted.slice(-spec.limit) : sorted;
  }
  const kept = spec.limit ? [...groups].sort(byValue["abs-desc"]).slice(0, spec.limit) : groups;
  return [...kept].sort(byLabel);
}

/** Least-squares line through `values` (by index), like the KPI page's "Tren Aktual". */
function trendline(values: (number | null)[]) {
  const points = values.map((value) => value ?? 0);
  const count = points.length;
  const meanX = (count - 1) / 2;
  const meanY = count ? points.reduce((sum, value) => sum + value, 0) / count : 0;
  const denominator = points.reduce((sum, _, index) => sum + (index - meanX) ** 2, 0);
  const slope = denominator ? points.reduce((sum, value, index) => sum + (index - meanX) * (value - meanY), 0) / denominator : 0;
  return points.map((_, index) => meanY + slope * (index - meanX));
}

export function buildChartData(spec: WidgetSpec, def: SourceDef | undefined, allRows: Row[], context: PageContext): ChartData {
  const primary = { def, rows: widgetRows(spec, allRows, context, def) };
  const format = measureFormat(spec, def, context.resolve);
  const measures: Measure[] = spec.measures.length ? spec.measures : [{ field: "count", agg: "count" }];
  const dimension = spec.dimension;
  const rowsOf = (source?: SourceId) => sourceRows(spec, source, primary, context);
  // Labels come from the first measure of the widget's own source (e.g. months with records, not target months).
  const keyIndex = Math.max(0, measures.findIndex((measure) => !measure.source || measure.source === spec.source));

  // Time series: the period field on the x-axis gets MoM/YoY/YTD treatment.
  if (dimension === "periodKey" && !spec.breakdown) {
    const mode = resolveTimeMode(spec, context);
    const totalsOf = (measure: Measure) => {
      const own = rowsOf(measure.source);
      const divide = measure.divideBy ? { ...measure.divideBy, rows: rowsOf(measure.divideBy.source ?? measure.source).rows } : undefined;
      const totals = periodTotals(own.rows, measure, divide);
      const window = spec.options?.historyMonths;
      if (!window) return totals;
      const kept = new Set([...totals.keys()].sort().slice(-window));
      return new Map([...totals].filter(([key]) => kept.has(key)));
    };
    const pointsOf = measures.map((measure) => timeSeries(totalsOf(measure), mode, { selected: context.referencePeriod, limit: spec.limit ?? 12 }));
    const keys = pointsOf[keyIndex].map((point) => point.key);
    const labels = pointsOf[keyIndex].map((point) => (spec.options?.monthOnly ? point.label.split(" ")[0] : point.label));
    const series: ChartSeries[] = [];
    measures.forEach((measure, index) => {
      const byKey = new Map(pointsOf[index].map((point) => [point.key, point]));
      const label = measureLabel(measure, def, context.resolve);
      const ytd = mode === "ytd-vs-last-year" || mode === "ytd-cumulative";
      // A measure joined from another source counts a missing month as 0 (e.g. no target that month).
      const joined = Boolean(measure.source && measure.source !== spec.source);
      const values = keys.map((key) => byKey.get(key)?.value ?? (joined ? 0 : null));
      series.push({
        id: `m${index}`,
        label: ytd && !measure.label ? `${label} (YTD)` : label,
        color: measure.color ?? seriesColors[index % seriesColors.length],
        values,
        total: values.reduce<number>((sum, value) => sum + (value ?? 0), 0),
        axis: measure.axis,
        asLine: measure.asLine,
      });
      if (index === keyIndex && (mode === "ytd-vs-last-year" || mode === "vs-last-year")) {
        const compareValues = keys.map((key) => byKey.get(key)?.compare ?? null);
        series.push({
          id: `m${index}-ly`,
          label: ytd ? `${label} (YTD tahun lalu)` : `${label} tahun lalu`,
          color: "coral",
          values: compareValues,
          total: compareValues.reduce<number>((sum, value) => sum + (value ?? 0), 0),
          dashed: true,
          asLine: true,
        });
      }
    });
    if (spec.options?.trendline && series[0]) {
      // Fitted over every month of the source (page period filters ignored), then shown for the visible months.
      const all = context.resolve?.(spec.source);
      const history = all ? periodTotals(applyRules(all.rows, rulesFor(all.def, spec.filters ?? [])), measures[0]) : null;
      const historyKeys = history ? [...history.keys()].sort() : keys;
      const fitted = trendline(history ? historyKeys.map((key) => history.get(key) ?? 0) : series[0].values);
      const byKey = new Map(historyKeys.map((key, index) => [key, fitted[index]]));
      series.push({ id: "trend", label: "Tren Aktual", color: "teal", values: keys.map((key) => byKey.get(key) ?? null), total: 0, asLine: true });
    }
    const growth = mode === "yoy-growth" || mode === "mom-change";
    return { labels, keys, series, format: growth ? "percent" : format, isTime: true, timeMode: mode, empty: keys.length === 0 };
  }

  // No dimension: one bar/slice per measure.
  if (!dimension) {
    const values = measures.map((measure) => aggregate(rowsOf(measure.source).rows, measure.field, measure.agg));
    return {
      labels: measures.map((measure) => measureLabel(measure, def, context.resolve)),
      keys: measures.map((measure) => measure.field),
      series: [{ id: "m0", label: spec.title, color: "turquoise", values, total: values.reduce<number>((sum, value) => sum + (value ?? 0), 0) }],
      format,
      isTime: false,
      empty: primary.rows.length === 0,
    };
  }

  const order = fieldOf(def, dimension)?.order;

  // Dimension + breakdown: one series per breakdown value (top 8).
  if (spec.breakdown) {
    const breakdown = spec.breakdown;
    const measure = measures[0];
    const groups = new Map<string, Map<string, Acc>>();
    const totals = new Map<string, Acc>();
    for (const row of primary.rows) {
      const group = cellText(row[dimension]);
      const split = cellText(row[breakdown]);
      const inner = groups.get(group) ?? new Map<string, Acc>();
      const acc = inner.get(split) ?? newAcc();
      addToAcc(acc, row, measure.field, measure.agg);
      inner.set(split, acc);
      groups.set(group, inner);
      const total = totals.get(group) ?? newAcc();
      addToAcc(total, row, measure.field, measure.agg);
      totals.set(group, total);
    }
    const ordered = sortAndLimit(
      [...totals.entries()].map(([key, acc]) => ({ key, values: [readAcc(acc, measure.agg)] })),
      spec,
      dimension,
      order,
    ).map((group) => group.key);
    const splits = new Map<string, number>();
    for (const inner of groups.values()) for (const [split, acc] of inner) splits.set(split, (splits.get(split) ?? 0) + Math.abs(readAcc(acc, measure.agg) ?? 0));
    const splitOrder = [...splits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([split]) => split);
    return {
      labels: ordered.map((key) => (dimension === "periodKey" ? periodLabel(key) : key)),
      keys: ordered,
      series: splitOrder.map((split, index) => {
        const values = ordered.map((key) => readAcc(groups.get(key)?.get(split), measure.agg));
        return { id: `s${index}`, label: split, color: seriesColors[index % seriesColors.length], values, total: splits.get(split) ?? 0 };
      }),
      format,
      isTime: dimension === "periodKey",
      empty: ordered.length === 0,
    };
  }

  // Dimension only: one series per measure, each measure grouped over its own source.
  const grouped = measures.map((measure) => {
    const own = rowsOf(measure.source).rows;
    const accs = new Map<string, Acc>();
    for (const row of own) {
      const key = cellText(row[dimension]);
      const acc = accs.get(key) ?? newAcc();
      addToAcc(acc, row, measure.field, measure.agg);
      accs.set(key, acc);
    }
    const below = measure.divideBy ? new Map<string, Acc>() : null;
    if (below && measure.divideBy) {
      for (const row of rowsOf(measure.divideBy.source ?? measure.source).rows) {
        const key = cellText(row[dimension]);
        const acc = below.get(key) ?? newAcc();
        addToAcc(acc, row, measure.divideBy.field, measure.divideBy.agg);
        below.set(key, acc);
      }
    }
    const values = new Map<string, number | null>();
    const weights = new Map([...accs].map(([key, acc]) => [key, acc.weight]));
    for (const [key, acc] of accs) {
      const value = readAcc(acc, measure.agg);
      if (!below || !measure.divideBy) values.set(key, value);
      else {
        const denominator = readAcc(below.get(key), measure.divideBy.agg);
        values.set(key, denominator ? (value ?? 0) / denominator : null);
      }
    }
    const total = measure.divideBy ? 0 : (aggregate(own, measure.field, measure.agg === "monthly-avg" ? "sum" : measure.agg) ?? 0);
    return { values, total, weights };
  });
  const groups = sortAndLimit(
    [...grouped[keyIndex].values.keys()].map((key) => ({ key, values: grouped.map((entry) => entry.values.get(key) ?? null) })),
    spec,
    dimension,
    order,
  );
  return {
    labels: groups.map((group) => group.key),
    keys: groups.map((group) => group.key),
    series: measures.map((measure, index) => ({
      id: `m${index}`,
      label: measureLabel(measure, def, context.resolve),
      color: measure.color ?? seriesColors[index % seriesColors.length],
      values: groups.map((group) => group.values[index]),
      total: grouped[index].total,
      axis: measure.axis,
      asLine: measure.asLine,
    })),
    format,
    isTime: false,
    counts: groups.map((group) => grouped[keyIndex].weights.get(group.key) ?? 0),
    empty: groups.length === 0,
  };
}

export type CardData = {
  value: number | null;
  /** Text headline instead of a number (compute "top" / "split"). */
  text?: string;
  /** Second line of the classic card (compute "split"). */
  detail?: string;
  format: ValueFormat;
  label: string;
  comparison: Comparison;
  change: ComparisonResult | null;
  /** A ÷ B (1 = 100%), for target comparisons, rings and progress bars. */
  achievement: number | null;
  target: number | null;
  sparkline: number[];
  lowerIsBetter: boolean;
  empty: boolean;
};

export function buildCardData(spec: WidgetSpec, def: SourceDef | undefined, allRows: Row[], context: PageContext): CardData {
  const rows = widgetRows(spec, allRows, context, def);
  const primary = { def, rows };
  const measure: Measure = spec.measures[0] ?? { field: "count", agg: "count" };
  const own = sourceRows(spec, measure.source, primary, context).rows;
  const compute: CardCompute = spec.card?.compute ?? "value";
  const comparison = compute === "value" ? resolveComparison(spec, context) : "none";
  const totals = periodTotals(own, measure);

  const targetSpec = spec.card?.target;
  const target =
    typeof targetSpec === "number"
      ? targetSpec
      : targetSpec?.field
        ? aggregate(sourceRows(spec, targetSpec.source, primary, context).rows, targetSpec.field, targetSpec.agg ?? "sum")
        : null;

  let value: number | null;
  let text: string | undefined;
  let detail: string | undefined;
  let change: ComparisonResult | null = null;
  let format = measureFormat(spec, def, context.resolve);

  if (comparison === "mom" || comparison === "yoy" || comparison === "ytd") {
    change = compare(totals, comparison, context.referencePeriod);
    value = change?.current ?? null;
  } else {
    value = aggregate(own, measure.field, measure.agg);
  }

  if (compute === "ratio") {
    value = value === null ? null : achievement(value, target);
    format = spec.format ?? "percent";
  } else if (compute === "difference") {
    value = (value ?? 0) - (target ?? 0);
  } else if (compute === "remaining") {
    value = Math.max(0, (target ?? 0) - (value ?? 0));
  } else if (compute === "share" && spec.card?.share) {
    const part = aggregate(applyRules(own, [spec.card.share]), measure.field, measure.agg) ?? 0;
    value = value ? part / value : 0;
    format = spec.format ?? "percent";
  } else if (compute === "split" && spec.card?.split) {
    const split = spec.card.split;
    const whole = value ?? 0;
    const shares = split.values.map((label) => {
      const part = aggregate(applyRules(own, [{ field: split.field, op: "in", values: [label] }]), measure.field, measure.agg) ?? 0;
      return `${label} ${whole ? Math.round((part / whole) * 100) : 0}%`;
    });
    value = null;
    text = shares[0];
    detail = shares.slice(1).join(" · ") || undefined;
  } else if (compute === "top" && spec.card?.topField) {
    const field = spec.card.topField;
    const accs = new Map<string, Acc>();
    for (const row of own) {
      const key = cellText(row[field]);
      const acc = accs.get(key) ?? newAcc();
      addToAcc(acc, row, measure.field, measure.agg);
      accs.set(key, acc);
    }
    const top = [...accs.entries()].sort((a, b) => Math.abs(readAcc(b[1], measure.agg) ?? 0) - Math.abs(readAcc(a[1], measure.agg) ?? 0))[0];
    text = top?.[0] ?? "-";
    value = top ? readAcc(top[1], measure.agg) : null;
  }

  const sparkline = spec.card?.sparkline ? timeSeries(totals, "monthly", { selected: context.referencePeriod, limit: 12 }).map((point) => point.value) : [];
  const ratio = compute === "ratio" || compute === "share" ? value : value === null ? null : achievement(value, target);

  return {
    value,
    text,
    detail,
    format,
    label: measureLabel(measure, def, context.resolve),
    comparison,
    change,
    achievement: ratio,
    target,
    sparkline,
    lowerIsBetter: Boolean(fieldOf(def, measure.field)?.lowerIsBetter),
    empty: rows.length === 0 && own.length === 0,
  };
}
