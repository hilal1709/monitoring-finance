import type {
  DashboardRecord,
  DashboardSection,
  PersistedDashboardReport,
  PersistedDashboardReports,
  RankedItem,
  SectionMonthlyPoint,
  WorkbookRole,
} from "@/lib/monitoring-dashboard-types";
import type {
  FilterKey,
  LoadedReport,
  PeriodMode,
  ReportFilters,
  TrendPoint,
} from "@/lib/dashboard-types";
import { monthLabels, monthOrder, paymentTargetPenerimaan } from "@/lib/dashboard-constants";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/dashboard-format";

export function monthlyAverage(section: DashboardSection) {
  return section.monthly.length > 0 ? section.monthly.reduce((total, point) => total + point.value, 0) / section.monthly.length : 0;
}

export function itemByLabel(items: RankedItem[], label: string) {
  return items.find((item) => item.label.toLowerCase() === label.toLowerCase());
}

export function listLabels(items: RankedItem[], limit = 8) {
  return items.slice(0, limit).map((item) => item.label);
}

export function activeFilterCount(filters: ReportFilters) {
  return Object.values(filters).reduce((count, values) => count + (values?.length ?? 0), 0);
}

export function recordFilterValue(record: DashboardRecord, key: FilterKey) {
  if (key === "customerType") {
    return record.customerType;
  }

  if (key === "customerName") {
    return record.customerName;
  }

  if (key === "invoiceType") {
    return record.invoiceType;
  }

  if (key === "status") {
    return record.status;
  }

  if (key === "year") {
    return record.periodKey?.slice(0, 4) ?? record.periodLabel?.split(" ")[1] ?? "";
  }

  return record.periodLabel?.split(" ")[0] ?? "";
}

export function recordOptionSort(record: DashboardRecord, key: FilterKey, label: string) {
  if (key === "year") {
    return Number(label) || 0;
  }

  if (key === "month") {
    return monthOrder.get(label) ?? record.periodSort ?? 0;
  }

  return 0;
}

export function recordsTotal(records: DashboardRecord[]) {
  return records.reduce((total, record) => total + record.amount, 0);
}

export function rankRecords(
  records: DashboardRecord[],
  keyFn: (record: DashboardRecord) => string,
  limit = 8,
  order?: string[],
): RankedItem[] {
  const grouped = new Map<string, { value: number; count: number }>();
  const totalAmount = recordsTotal(records) || 1;
  const orderMap = new Map((order ?? []).map((label, index) => [label.toLowerCase(), index]));

  for (const record of records) {
    const label = keyFn(record) || "Unmapped";
    const item = grouped.get(label) ?? { value: 0, count: 0 };
    item.value += record.amount;
    item.count += 1;
    grouped.set(label, item);
  }

  return [...grouped.entries()]
    .map(([label, item]) => ({
      label,
      value: item.value,
      count: item.count,
      share: item.value / totalAmount,
    }))
    .sort((a, b) => {
      const aOrder = orderMap.get(a.label.toLowerCase());
      const bOrder = orderMap.get(b.label.toLowerCase());

      if (aOrder !== undefined || bOrder !== undefined) {
        return (aOrder ?? Number.MAX_SAFE_INTEGER) - (bOrder ?? Number.MAX_SAFE_INTEGER);
      }

      return b.value - a.value;
    })
    .slice(0, limit);
}

export function monthlyFromRecords(records: DashboardRecord[], limit?: number): SectionMonthlyPoint[] {
  const grouped = new Map<string, { label: string; sort: number; value: number }>();

  for (const record of records) {
    if (!record.periodKey || !record.periodLabel || record.periodSort === null) {
      continue;
    }

    const item = grouped.get(record.periodKey) ?? {
      label: record.periodLabel,
      sort: record.periodSort,
      value: 0,
    };

    item.value += record.amount;
    grouped.set(record.periodKey, item);
  }

  const points = [...grouped.entries()]
    .map(([key, item]) => ({ key, label: item.label, value: item.value, sort: item.sort }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => ({ key: item.key, label: item.label, value: item.value }));

  return typeof limit === "number" ? points.slice(-limit) : points;
}

export function latestRecordPeriod(records: DashboardRecord[]) {
  const latest = records
    .filter((record) => record.periodLabel && record.periodSort !== null)
    .sort((a, b) => (b.periodSort ?? 0) - (a.periodSort ?? 0))[0];

  return latest?.periodLabel ?? "-";
}

export function sectionFromRecords(records: DashboardRecord[], statusOrder: string[]): DashboardSection {
  const totalAmount = recordsTotal(records);

  return {
    rowCount: records.length,
    totalAmount,
    averageAmount: records.length > 0 ? totalAmount / records.length : 0,
    latestPeriod: latestRecordPeriod(records),
    statusMix: rankRecords(records, (record) => record.status, 8, statusOrder),
    customerTypes: rankRecords(records, (record) => record.customerType, 6),
    invoiceTypes: rankRecords(records, (record) => record.invoiceType, 8),
    topCustomers: rankRecords(records, (record) => record.customerName, 8),
    monthly: monthlyFromRecords(records, 12),
    records,
  };
}

export function matchesFilters(record: DashboardRecord, filters: ReportFilters) {
  const entries = Object.entries(filters) as [FilterKey, string[] | undefined][];

  return entries.every(([key, selected]) => {
    if (!selected || selected.length === 0) {
      return true;
    }

    return selected.includes(recordFilterValue(record, key));
  });
}

export function filteredSection(section: DashboardSection, filters: ReportFilters, statusOrder: string[]) {
  const records = section.records ?? [];

  if (records.length === 0 || activeFilterCount(filters) === 0) {
    return section;
  }

  return sectionFromRecords(records.filter((record) => matchesFilters(record, filters)), statusOrder);
}

export function filteredSectionByPeriodLabels(section: DashboardSection, periodLabels: string[], statusOrder: string[]) {
  if (periodLabels.length === 0 || !section.records?.length) {
    return section;
  }

  const selected = new Set(periodLabels);

  return sectionFromRecords(
    section.records.filter((record) => record.periodLabel && selected.has(record.periodLabel)),
    statusOrder,
  );
}

export function overviewPeriodLabels(invoice?: DashboardSection, payment?: DashboardSection) {
  const records = [...(invoice?.records ?? []), ...(payment?.records ?? [])];
  return monthlyFromRecords(records).map((point) => point.label);
}

export function filterOptions(section: DashboardSection, key: FilterKey, fallback: string[], limit = 8) {
  const records = section.records ?? [];

  if (records.length === 0) {
    return fallback;
  }

  const grouped = new Map<string, { value: number; count: number; sort: number }>();

  for (const record of records) {
    const label = recordFilterValue(record, key);

    if (!label) {
      continue;
    }

    const item = grouped.get(label) ?? { value: 0, count: 0, sort: recordOptionSort(record, key, label) };
    item.value += record.amount;
    item.count += 1;
    grouped.set(label, item);
  }

  return [...grouped.entries()]
    .sort((a, b) => {
      if (key === "year" || key === "month") {
        return a[1].sort - b[1].sort;
      }

      return b[1].value - a[1].value;
    })
    .slice(0, limit)
    .map(([label]) => label);
}

export function sectionMonthlyPoints(section: DashboardSection) {
  return section.records?.length ? monthlyFromRecords(section.records) : section.monthly;
}

export function formatTrendValue(value: number, periodMode: PeriodMode) {
  return periodMode === "yoy" ? formatPercent(value) : formatCurrency(value, true);
}

export function periodTrendPoints(section: DashboardSection, periodMode: PeriodMode): TrendPoint[] {
  const monthly = sectionMonthlyPoints(section);

  if (periodMode === "mom") {
    return monthly.slice(-12).map((point) => ({ ...point, valueLabel: formatTrendValue(point.value, periodMode) }));
  }

  if (periodMode === "ytd") {
    const latestYear = monthly.at(-1)?.key.slice(0, 4);
    let running = 0;

    return monthly
      .filter((point) => point.key.startsWith(`${latestYear}-`))
      .map((point) => {
        running += point.value;

        return {
          ...point,
          key: `ytd-${point.key}`,
          value: running,
          valueLabel: formatTrendValue(running, periodMode),
        };
      });
  }

  const monthlyByKey = new Map(monthly.map((point) => [point.key, point]));

  return monthly
    .map((point) => {
      const [year, month] = point.key.split("-");
      const previous = monthlyByKey.get(`${Number(year) - 1}-${month}`);

      if (!previous || previous.value === 0) {
        return null;
      }

      const value = (point.value - previous.value) / Math.abs(previous.value);

      return {
        ...point,
        key: `yoy-${point.key}`,
        value,
        valueLabel: formatTrendValue(value, periodMode),
      };
    })
    .filter((point): point is TrendPoint => Boolean(point))
    .slice(-12);
}

export function paymentYearMonthTotals(records: DashboardRecord[]) {
  const totals = new Map<string, number>();

  for (const record of records) {
    if (!record.periodKey) {
      continue;
    }

    totals.set(record.periodKey, (totals.get(record.periodKey) ?? 0) + record.amount);
  }

  return totals;
}

export function latestPaymentPeriodKey(records: DashboardRecord[]) {
  return [...paymentYearMonthTotals(records).keys()].sort().at(-1) ?? null;
}

export function paymentMovementSummary(section: DashboardSection) {
  const totals = paymentYearMonthTotals(section.records ?? []);
  const latestKey = latestPaymentPeriodKey(section.records ?? []);

  if (!latestKey) {
    return { label: "-", mom: null, yoy: null, ytd: null };
  }

  const [yearStr, monthStr] = latestKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const latestValue = totals.get(latestKey) ?? 0;
  const sameYearKeys = [...totals.keys()].filter((key) => key.startsWith(`${year}-`)).sort();
  const previousKey = sameYearKeys.filter((key) => key < latestKey).at(-1);
  const previousValue = previousKey ? totals.get(previousKey) ?? 0 : 0;
  const previousYearValue = totals.get(`${year - 1}-${monthStr}`) ?? 0;
  let latestYtd = 0;
  let previousYtd = 0;

  for (let currentMonth = 1; currentMonth <= month; currentMonth += 1) {
    const keyMonth = String(currentMonth).padStart(2, "0");
    latestYtd += totals.get(`${year}-${keyMonth}`) ?? 0;
    previousYtd += totals.get(`${year - 1}-${keyMonth}`) ?? 0;
  }

  return {
    label: `${monthLabels[month - 1] ?? monthStr} ${year}`,
    mom: previousValue > 0 ? (latestValue - previousValue) / previousValue : null,
    yoy: previousYearValue > 0 ? (latestValue - previousYearValue) / previousYearValue : null,
    ytd: previousYtd > 0 ? (latestYtd - previousYtd) / previousYtd : null,
  };
}

export function paymentTargetPoints(section: DashboardSection) {
  const latestKey = latestPaymentPeriodKey(section.records ?? []);
  const latestYear = latestKey?.slice(0, 4);
  const totals = paymentYearMonthTotals(section.records ?? []);

  return paymentTargetPenerimaan.map((point, index) => {
    const monthNumber = index + 1;
    const key = latestYear ? `${latestYear}-${String(monthNumber).padStart(2, "0")}` : "";
    const realization = key ? totals.get(key) ?? 0 : 0;
    const variance = point.target > 0 ? (realization - point.target) / point.target : 0;
    const achievement = point.target > 0 ? realization / point.target : 0;

    return {
      ...point,
      key,
      realization,
      variance,
      achievement,
    };
  });
}

export function fromPersistedReport(report: PersistedDashboardReport): LoadedReport {
  return {
    id: report.id,
    generatedAt: report.generatedAt,
    file: report.file,
    section: report.section,
  };
}

export function loadedReportsFromPersisted(reports?: PersistedDashboardReports) {
  return {
    ...(reports?.invoice ? { invoice: fromPersistedReport(reports.invoice) } : {}),
    ...(reports?.payment ? { payment: fromPersistedReport(reports.payment) } : {}),
  } satisfies Partial<Record<WorkbookRole, LoadedReport>>;
}

export function rankedItemTooltip(item: RankedItem) {
  return `${item.label}: ${formatCurrency(item.value)} | ${formatPercent(item.share)} | ${formatNumber(item.count)} rows`;
}

export function chartBarWidth(value: number, max: number) {
  return value === 0 ? 0 : Math.max(2, (Math.abs(value) / max) * 100);
}
