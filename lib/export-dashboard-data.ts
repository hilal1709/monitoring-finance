import type { ExportViewRecord } from "@/lib/export-dashboard-types";

export type RankedValue = {
  label: string;
  value: number;
  count: number;
};

export type MonthlyExportPoint = {
  key: string;
  label: string;
  sales: number;
  payment: number;
  outstanding: number;
  tonnage: number;
};

export function isPaid(record: ExportViewRecord) {
  return Boolean(record.paymentDate) || record.paymentStatus.toLowerCase() === "paid";
}

export function total(records: ExportViewRecord[], value: (record: ExportViewRecord) => number) {
  return records.reduce((sum, record) => sum + value(record), 0);
}

export function rankRecords(
  records: ExportViewRecord[],
  label: (record: ExportViewRecord) => string,
  value: (record: ExportViewRecord) => number,
  limit = 8,
) {
  const grouped = new Map<string, { value: number; count: number }>();

  for (const record of records) {
    const key = label(record).trim() || "Unmapped";
    const item = grouped.get(key) ?? { value: 0, count: 0 };
    item.value += value(record);
    item.count += 1;
    grouped.set(key, item);
  }

  return [...grouped.entries()]
    .map(([groupLabel, item]) => ({ label: groupLabel, ...item }))
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value))
    .slice(0, limit);
}

export function monthlyPoints(records: ExportViewRecord[]) {
  const grouped = new Map<string, MonthlyExportPoint>();

  for (const record of records) {
    const item = grouped.get(record.periodKey) ?? {
      key: record.periodKey,
      label: record.periodLabel,
      sales: 0,
      payment: 0,
      outstanding: 0,
      tonnage: 0,
    };
    item.sales += record.usdValue;
    item.tonnage += record.tonnage;

    if (isPaid(record)) {
      item.payment += record.usdValue;
    } else {
      item.outstanding += record.usdValue;
    }

    grouped.set(record.periodKey, item);
  }

  return [...grouped.values()].sort((left, right) => left.key.localeCompare(right.key));
}
