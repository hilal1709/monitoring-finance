import type { FilterConfig, FilterRule, FilterState, Row, WidgetSpec } from "@/lib/chart-builder/types";

// Widget rules (always on) + page filters (unless the widget ignores them or
// the filter targets other widgets) + a cross-filter from a clicked chart.

/** Group label of a cell; empty values group as "Unmapped", as the dashboards always did. */
export function cellText(value: Row[string] | undefined) {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text || "Unmapped";
}

export function matchesRule(row: Row, rule: FilterRule) {
  const value = row[rule.field];
  switch (rule.op) {
    case "in":
      return rule.values.length === 0 || rule.values.map(String).includes(cellText(value));
    case "not-in":
      return !rule.values.map(String).includes(cellText(value));
    case "contains":
      return rule.values.some((needle) => cellText(value).toLowerCase().includes(String(needle).toLowerCase()));
    case "gte":
      return value !== null && value >= (typeof value === "number" ? Number(rule.values[0]) : String(rule.values[0]));
    case "lte":
      return value !== null && value <= (typeof value === "number" ? Number(rule.values[0]) : String(rule.values[0]));
  }
}

export type CrossFilter = { widgetId: string; field: string; value: string } | null;

/** Page filters that apply to `widgetId`, as plain rules. */
export function pageRulesFor(widgetId: string, spec: Pick<WidgetSpec, "ignoreFilters"> | undefined, configs: FilterConfig[], state: FilterState): FilterRule[] {
  const ignored = new Set(spec?.ignoreFilters ?? []);
  if (ignored.has("*")) return [];
  const rules: FilterRule[] = [];
  for (const config of configs) {
    if (config.control === "reference-period" || config.control === "period-mode" || ignored.has(config.id)) continue;
    if (config.targets && !config.targets.includes(widgetId)) continue;
    const values = state[config.id] ?? config.defaultValues ?? [];
    if (values.length === 0) continue;
    if (config.control === "period-range") {
      if (values[0]) rules.push({ field: config.field, op: "gte", values: [values[0]] });
      if (values[1]) rules.push({ field: config.field, op: "lte", values: [values[1]] });
    } else if (config.control === "search") {
      rules.push({ field: config.field, op: "contains", values });
    } else {
      rules.push({ field: config.field, op: "in", values });
    }
  }
  return rules;
}

export function applyRules(rows: Row[], rules: FilterRule[]) {
  if (rules.length === 0) return rows;
  return rows.filter((row) => rules.every((rule) => matchesRule(row, rule)));
}

/** Distinct values of `field`, sorted (periods/numbers ascending, text by frequency). */
export function distinctValues(rows: Row[], field: string, limit = 200) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const text = cellText(row[field]);
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  const values = [...counts.keys()];
  const ordered = field === "periodKey" || field === "year" ? values.sort() : values.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  return ordered.slice(0, limit);
}
