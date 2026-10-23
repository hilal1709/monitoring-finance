// Single source of truth for MoM / YoY / YTD across every data source.
// All periods are "YYYY-MM" keys.
//
//   MoM = reference month vs the month before (January vs December last year)
//   YoY = reference month vs the same month last year
//   YTD = Jan..reference month this year vs Jan..same month last year
//
// The reference month is the latest month with data, unless the page picks one.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export type PeriodTotals = Map<string, number>;

export type ComparisonMode = "mom" | "yoy" | "ytd";

export type ComparisonResult = {
  mode: ComparisonMode;
  reference: string;
  current: number;
  previous: number | null;
  delta: number | null;
  /** Ratio (0.12 = +12%); null when there is nothing to compare against. */
  percent: number | null;
  currentLabel: string;
  previousLabel: string;
};

export type TimePoint = { key: string; label: string; value: number; compare: number | null };

export function isPeriodKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function periodKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function splitPeriod(key: string) {
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) };
}

export function shiftMonths(key: string, months: number) {
  const { year, month } = splitPeriod(key);
  const index = year * 12 + (month - 1) + months;
  return periodKey(Math.floor(index / 12), (index % 12) + 1);
}

export function periodLabel(key: string) {
  const { year, month } = splitPeriod(key);
  return `${MONTHS[month - 1] ?? key} ${year}`;
}

/** "Jan–Sep 2026" */
export function ytdLabel(key: string) {
  const { year, month } = splitPeriod(key);
  return month === 1 ? `Jan ${year}` : `Jan–${MONTHS[month - 1]} ${year}`;
}

export function sumByPeriod<T>(rows: T[], period: (row: T) => string | null | undefined, value: (row: T) => number): PeriodTotals {
  const totals: PeriodTotals = new Map();
  for (const row of rows) {
    const key = period(row);
    if (!isPeriodKey(key)) continue;
    totals.set(key, (totals.get(key) ?? 0) + value(row));
  }
  return totals;
}

/** Latest month with data, or `selected` when the page picked one that exists. */
export function referencePeriod(totals: PeriodTotals, selected?: string | null): string | null {
  if (selected && isPeriodKey(selected)) return selected;
  let latest: string | null = null;
  for (const key of totals.keys()) if (!latest || key > latest) latest = key;
  return latest;
}

function ytdTotal(totals: PeriodTotals, reference: string) {
  const { year, month } = splitPeriod(reference);
  let sum = 0;
  let seen = false;
  for (let current = 1; current <= month; current += 1) {
    const value = totals.get(periodKey(year, current));
    if (value === undefined) continue;
    sum += value;
    seen = true;
  }
  return seen ? sum : null;
}

export function compare(totals: PeriodTotals, mode: ComparisonMode, selected?: string | null): ComparisonResult | null {
  const reference = referencePeriod(totals, selected);
  if (!reference) return null;

  let current: number;
  let previous: number | null;
  let currentLabel: string;
  let previousLabel: string;

  if (mode === "ytd") {
    const lastYear = shiftMonths(reference, -12);
    current = ytdTotal(totals, reference) ?? 0;
    previous = ytdTotal(totals, lastYear);
    currentLabel = ytdLabel(reference);
    previousLabel = ytdLabel(lastYear);
  } else {
    const other = shiftMonths(reference, mode === "mom" ? -1 : -12);
    current = totals.get(reference) ?? 0;
    previous = totals.get(other) ?? null;
    currentLabel = periodLabel(reference);
    previousLabel = periodLabel(other);
  }

  const delta = previous === null ? null : current - previous;
  const percent = previous === null || previous === 0 ? null : (current - previous) / Math.abs(previous);
  return { mode, reference, current, previous, delta, percent, currentLabel, previousLabel };
}

/** Change against a target: percent = actual / target (1 = 100% achieved). */
export function achievement(actual: number, target: number | null | undefined) {
  if (!target) return null;
  return actual / target;
}

export type SeriesMode = "monthly" | "ytd-cumulative" | "ytd-vs-last-year" | "yoy-growth" | "mom-change" | "vs-last-year";

/**
 * Points for a chart whose x-axis is the period. `compare` is the matching
 * last-year value where the mode has one (for a second line / tooltip).
 * `limit` keeps the last N months (default 12) for the monthly-style modes.
 */
export function timeSeries(totals: PeriodTotals, mode: SeriesMode, options: { selected?: string | null; limit?: number } = {}): TimePoint[] {
  const reference = referencePeriod(totals, options.selected);
  if (!reference) return [];
  const limit = options.limit ?? 12;
  const keys = [...totals.keys()].filter((key) => key <= reference).sort();

  if (mode === "ytd-cumulative" || mode === "ytd-vs-last-year") {
    const { year, month } = splitPeriod(reference);
    const points: TimePoint[] = [];
    let running = 0;
    let lastRunning = 0;
    const hasLastYear = keys.some((item) => item.startsWith(`${year - 1}-`));
    for (let current = 1; current <= month; current += 1) {
      const key = periodKey(year, current);
      const month = totals.get(key);
      running += month ?? 0;
      const lastYearMonth = totals.get(periodKey(year - 1, current));
      lastRunning += lastYearMonth ?? 0;
      // Months without data this year are skipped; months without data last year have nothing to compare.
      if (month === undefined) continue;
      points.push({ key, label: periodLabel(key), value: running, compare: hasLastYear && lastYearMonth !== undefined ? lastRunning : null });
    }
    return points;
  }

  const window = keys.slice(-limit);

  if (mode === "yoy-growth" || mode === "mom-change") {
    return window.flatMap((key) => {
      const other = totals.get(shiftMonths(key, mode === "mom-change" ? -1 : -12));
      if (other === undefined || other === 0) return [];
      const value = ((totals.get(key) ?? 0) - other) / Math.abs(other);
      return [{ key, label: periodLabel(key), value, compare: null }];
    });
  }

  return window.map((key) => ({
    key,
    label: periodLabel(key),
    value: totals.get(key) ?? 0,
    compare: mode === "vs-last-year" ? (totals.get(shiftMonths(key, -12)) ?? null) : null,
  }));
}

export const comparisonHelp: Record<ComparisonMode | "target", string> = {
  mom: "Month on Month: bulan acuan dibanding bulan sebelumnya (Januari dibanding Desember tahun lalu).",
  yoy: "Year on Year: bulan acuan dibanding bulan yang sama tahun lalu.",
  ytd: "Year to Date: total Januari s.d. bulan acuan, dibanding rentang bulan yang sama tahun lalu.",
  target: "Pencapaian: nilai aktual dibagi target.",
};
