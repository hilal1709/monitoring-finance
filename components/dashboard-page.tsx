"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  Filter,
  LayoutDashboard,
  Loader2,
  Menu,
  MoonStar,
  PieChart,
  ReceiptText,
  RefreshCcw,
  UploadCloud,
  SunMedium,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  DashboardRecord,
  DashboardSection,
  PersistedDashboardReport,
  PersistedDashboardReports,
  RankedItem,
  SectionMonthlyPoint,
  UploadedWorkbookSummary,
  WorkbookRole,
} from "@/lib/monitoring-dashboard-types";

type DashboardView = "overview" | WorkbookRole;
type FilterKey = "customerType" | "customerName" | "year" | "month" | "invoiceType" | "status";
type ReportFilters = Partial<Record<FilterKey, string[]>>;
type OverviewFilters = {
  periodLabels: string[];
};
type ThemeMode = "dark" | "light";
type PeriodMode = "mom" | "yoy" | "ytd";
type TrendPoint = SectionMonthlyPoint & {
  valueLabel: string;
};

type LoadedReport = {
  id?: number;
  generatedAt: string;
  file: UploadedWorkbookSummary;
  section: DashboardSection;
};

let dashboardReportsCache: Partial<Record<WorkbookRole, LoadedReport>> = {};

const navItems = [
  { label: "Overview", icon: LayoutDashboard, href: "/", view: "overview" },
  { label: "Invoice", icon: ReceiptText, href: "/invoice", view: "invoice" },
  { label: "Payment", icon: Wallet, href: "/payment", view: "payment" },
];

const uploadCards = [
  {
    role: "invoice" as const,
    title: "Invoice Workbook",
    description: "Upload file invoice monitoring. Sistem akan membaca sheet Billing Detail dan membuat Invoice Report Monitoring.",
  },
  {
    role: "payment" as const,
    title: "Payment Workbook",
    description: "Upload file payment monitoring. Sistem akan membaca sheet Detail Payment dan membuat Payment Report Monitoring.",
  },
];

const palette = ["#4cc9d8", "#ef4444", "#f97316", "#facc15", "#2563eb", "#94a3b8", "#22c55e", "#a855f7"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthOrder = new Map(monthLabels.map((month, index) => [month, index + 1]));
const periodModeOptions: { value: PeriodMode; label: string }[] = [
  { value: "mom", label: "MoM" },
  { value: "yoy", label: "YoY" },
  { value: "ytd", label: "YTD" },
];
const statusOrders: Record<WorkbookRole, string[]> = {
  invoice: ["Current", "Bucket 1", "Bucket 2", "Bucket 3", "Bucket 4"],
  payment: ["No Risk", "Low Risk", "Warning", "Warning +", "High Risk", "High Risk +"],
};

function formatCurrency(value: number, compact = false) {
  if (compact) {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (abs >= 1_000_000_000_000) {
      return `${sign}Rp ${(abs / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
    }

    if (abs >= 1_000_000_000) {
      return `${sign}Rp ${(abs / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
    }

    if (abs >= 1_000_000) {
      return `${sign}Rp ${(abs / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
    }
  }

  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

function formatPercent(value: number) {
  return `${(value * 100).toLocaleString("id-ID", { maximumFractionDigits: 0 })}%`;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function compactFileName(name: string) {
  return name.length > 34 ? `${name.slice(0, 17)}...${name.slice(-11)}` : name;
}

function monthlyAverage(section: DashboardSection) {
  return section.monthly.length > 0 ? section.monthly.reduce((total, point) => total + point.value, 0) / section.monthly.length : 0;
}

function itemByLabel(items: RankedItem[], label: string) {
  return items.find((item) => item.label.toLowerCase() === label.toLowerCase());
}

function listLabels(items: RankedItem[], limit = 8) {
  return items.slice(0, limit).map((item) => item.label);
}

function activeFilterCount(filters: ReportFilters) {
  return Object.values(filters).reduce((count, values) => count + (values?.length ?? 0), 0);
}

function recordFilterValue(record: DashboardRecord, key: FilterKey) {
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

function recordOptionSort(record: DashboardRecord, key: FilterKey, label: string) {
  if (key === "year") {
    return Number(label) || 0;
  }

  if (key === "month") {
    return monthOrder.get(label) ?? record.periodSort ?? 0;
  }

  return 0;
}

function recordsTotal(records: DashboardRecord[]) {
  return records.reduce((total, record) => total + record.amount, 0);
}

function rankRecords(
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

function monthlyFromRecords(records: DashboardRecord[], limit?: number): SectionMonthlyPoint[] {
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

function latestRecordPeriod(records: DashboardRecord[]) {
  const latest = records
    .filter((record) => record.periodLabel && record.periodSort !== null)
    .sort((a, b) => (b.periodSort ?? 0) - (a.periodSort ?? 0))[0];

  return latest?.periodLabel ?? "-";
}

function sectionFromRecords(records: DashboardRecord[], statusOrder: string[]): DashboardSection {
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

function matchesFilters(record: DashboardRecord, filters: ReportFilters) {
  const entries = Object.entries(filters) as [FilterKey, string[] | undefined][];

  return entries.every(([key, selected]) => {
    if (!selected || selected.length === 0) {
      return true;
    }

    return selected.includes(recordFilterValue(record, key));
  });
}

function filteredSection(section: DashboardSection, filters: ReportFilters, statusOrder: string[]) {
  const records = section.records ?? [];

  if (records.length === 0 || activeFilterCount(filters) === 0) {
    return section;
  }

  return sectionFromRecords(records.filter((record) => matchesFilters(record, filters)), statusOrder);
}

function filteredSectionByPeriodLabels(section: DashboardSection, periodLabels: string[], statusOrder: string[]) {
  if (periodLabels.length === 0 || !section.records?.length) {
    return section;
  }

  const selected = new Set(periodLabels);

  return sectionFromRecords(
    section.records.filter((record) => record.periodLabel && selected.has(record.periodLabel)),
    statusOrder,
  );
}

function overviewPeriodLabels(invoice?: DashboardSection, payment?: DashboardSection) {
  const records = [...(invoice?.records ?? []), ...(payment?.records ?? [])];
  return monthlyFromRecords(records).map((point) => point.label);
}

function filterOptions(section: DashboardSection, key: FilterKey, fallback: string[], limit = 8) {
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

function sectionMonthlyPoints(section: DashboardSection) {
  return section.records?.length ? monthlyFromRecords(section.records) : section.monthly;
}

function formatTrendValue(value: number, periodMode: PeriodMode) {
  return periodMode === "yoy" ? formatPercent(value) : formatCurrency(value, true);
}

function periodTrendPoints(section: DashboardSection, periodMode: PeriodMode): TrendPoint[] {
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

function fromPersistedReport(report: PersistedDashboardReport): LoadedReport {
  return {
    id: report.id,
    generatedAt: report.generatedAt,
    file: report.file,
    section: report.section,
  };
}

function loadedReportsFromPersisted(reports?: PersistedDashboardReports) {
  return {
    ...(reports?.invoice ? { invoice: fromPersistedReport(reports.invoice) } : {}),
    ...(reports?.payment ? { payment: fromPersistedReport(reports.payment) } : {}),
  } satisfies Partial<Record<WorkbookRole, LoadedReport>>;
}

function cacheReports(reports: Partial<Record<WorkbookRole, LoadedReport>>) {
  dashboardReportsCache = {
    ...dashboardReportsCache,
    ...reports,
  };

  return dashboardReportsCache;
}

function ReportKpi({
  icon: Icon,
  title,
  value,
  detail,
  accent = "amber",
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  detail?: string;
  accent?: "amber" | "cyan" | "emerald";
  compact?: boolean;
}) {
  const accentClass = accent === "emerald" ? "text-[#70f0bf]" : accent === "cyan" ? "text-[#7dd3fc]" : "text-[#ffd166]";
  const accentPanel = accent === "emerald" ? "border-[#70f0bf]/25 bg-[#70f0bf]/10" : accent === "cyan" ? "border-[#7dd3fc]/25 bg-[#7dd3fc]/10" : "border-[#ffd166]/25 bg-[#ffd166]/10";

  return (
    <div className={cn("grid min-w-0 rounded-lg border border-white/10 bg-[#0c1724] shadow-[0_18px_35px_rgba(0,0,0,0.18)]", compact ? "min-h-16 grid-cols-[44px_minmax(0,1fr)]" : "min-h-24 grid-cols-[56px_minmax(0,1fr)]")}>
      <div className={cn("grid place-items-center rounded-lg border", compact ? "m-2" : "m-3", accentPanel, accentClass)}>
        <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </div>
      <div className={cn("flex min-w-0 flex-col justify-between pl-0", compact ? "p-2" : "p-3")}>
        <div className="max-w-full break-words text-[10px] font-semibold uppercase leading-snug tracking-[0.14em] text-slate-500" title={title}>
          {title}
        </div>
        <div className={cn("min-w-0 break-words text-right font-semibold leading-tight", compact ? "mt-1 text-lg" : "mt-2 text-xl", accentClass)} title={value}>
          {value}
        </div>
        {detail ? <div className="mt-1 text-right text-[10px] font-semibold leading-tight text-slate-400">{detail}</div> : null}
      </div>
    </div>
  );
}

function FilterPanel({
  title,
  items,
  columns = 1,
  selected = [],
  onToggle,
  onClear,
}: {
  title: string;
  items: string[];
  columns?: 1 | 2 | 3;
  selected?: string[];
  onToggle?: (item: string) => void;
  onClear?: () => void;
}) {
  const selectedSet = new Set(selected);

  return (
    <div className="rounded-lg border border-white/10 bg-[#0c1724] p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-300">
        <span>{title}</span>
        {selected.length > 0 ? (
          <button type="button" onClick={onClear} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#ffd166] hover:bg-[#ffd166]/10">
            Clear
          </button>
        ) : (
          <Filter className="h-3 w-3 text-slate-500" />
        )}
      </div>
      <div className={cn("grid gap-1", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-3")}>
        {items.map((item) => (
          <button
            key={`${title}-${item}`}
            type="button"
            aria-pressed={selectedSet.has(item)}
            onClick={() => onToggle?.(item)}
            className={cn(
              "min-h-8 truncate rounded-md border px-2 py-1 text-left text-xs font-medium transition-colors",
              selectedSet.has(item) ? "border-[#ffd166]/50 bg-[#ffd166] text-[#211600]" : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-[#7dd3fc]/35 hover:bg-[#7dd3fc]/10",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChartTitle({ title }: { title: string }) {
  return <h4 className="border-b border-white/10 px-3 py-2 text-center text-xs font-black uppercase text-slate-200">{title}</h4>;
}

function HoverValue({ text, align = "right" }: { text: string; align?: "right" | "center" }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute bottom-full z-30 mb-1 max-w-[260px] whitespace-nowrap rounded bg-[#06113a] px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        align === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
      )}
    >
      {text}
    </span>
  );
}

function rankedItemTooltip(item: RankedItem) {
  return `${item.label}: ${formatCurrency(item.value)} | ${formatPercent(item.share)} | ${formatNumber(item.count)} rows`;
}

function DonutChart({ title, items, centerLabel, summary, compact = false }: { title: string; items: RankedItem[]; centerLabel?: string; summary?: string; compact?: boolean }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const gradient = items
    .map((item, index) => {
      const start = items.slice(0, index).reduce((sum, current) => sum + (current.value / total) * 360, 0);
      const end = start + (item.value / total) * 360;

      return `${palette[index % palette.length]} ${start}deg ${end}deg`;
    })
    .join(", ");
  const background = gradient ? `conic-gradient(${gradient})` : "#e5e7eb";

  return (
    <div className="h-full rounded-lg border border-white/10 bg-[#0c1724]">
      <ChartTitle title={title} />
      {summary ? <div className="border-b border-white/10 px-3 py-2 text-center text-xs font-bold text-[#ffd166]">{summary}</div> : null}
      <div className={cn("flex flex-col items-center justify-center gap-4 p-3 2xl:flex-row", compact ? "min-h-[160px]" : "min-h-[220px]")}>
        <div className={cn("relative grid shrink-0 place-items-center rounded-full border border-white/10", compact ? "h-32 w-32" : "h-44 w-44")} style={{ background }}>
          <div className={cn("grid place-items-center rounded-full border border-white/10 bg-[#0c1724] text-center text-xs font-bold text-slate-100", compact ? "h-16 w-16" : "h-20 w-20")}>
            {centerLabel ?? "Total"}
          </div>
        </div>
        <div className="w-full min-w-0 max-w-[240px] space-y-1 text-[10px] text-slate-300 2xl:w-44">
          {items.slice(0, 8).map((item, index) => (
            <div key={item.label} tabIndex={0} title={rankedItemTooltip(item)} className="group relative grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-2 outline-none">
              <HoverValue text={rankedItemTooltip(item)} />
              <span className="h-2 w-2 shrink-0" style={{ backgroundColor: palette[index % palette.length] }} />
              <span className="min-w-0 break-words leading-tight">{item.label}</span>
              <span className="font-bold">{formatPercent(item.share)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HorizontalBars({ title, items, maxItems = 8, showValue = true }: { title?: string; items: RankedItem[]; maxItems?: number; showValue?: boolean }) {
  const visible = items.slice(0, maxItems);
  const max = Math.max(...visible.map((item) => item.value), 1);

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-[#0c1724] p-3">
      {title ? <ChartTitle title={title} /> : null}
      {visible.map((item) => (
        <div key={item.label} tabIndex={0} title={rankedItemTooltip(item)} className="group relative grid grid-cols-[150px_1fr] items-center gap-2 text-[10px] font-bold text-slate-300 outline-none">
          <span className="truncate text-right">{item.label}</span>
          <div className="relative h-5 overflow-hidden rounded bg-white/[0.06]">
            <HoverValue text={rankedItemTooltip(item)} />
            <div
              className="h-full border border-[#2dd4bf]/40 bg-gradient-to-r from-[#0ea5e9] to-[#2dd4bf]"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
            <span className={cn("absolute right-1 top-0.5 text-[10px] font-semibold text-slate-100", !showValue && "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100")}>
              {formatCurrency(item.value, true)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBars({ title, items }: { title: string; items: RankedItem[] }) {
  return <HorizontalBars title={title} items={items} maxItems={7} showValue={false} />;
}

function PeriodModeSelector({ value, onChange }: { value: PeriodMode; onChange: (value: PeriodMode) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-black text-slate-200">
      {periodModeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-7 px-3 transition-colors",
            value === option.value ? "bg-[#ffd166] text-[#211600]" : "hover:bg-white/[0.08]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function OverviewMonthDropdown({
  items,
  selected,
  onToggle,
  onClear,
}: {
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const selectedSet = new Set(selected);
  const selectedLabel = selected.length === 0 ? "Semua bulan" : selected.length === 1 ? selected[0] : `${selected.length} bulan aktif`;

  return (
    <details className="group relative">
      <summary className="flex list-none items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0c1724] px-3 py-2 text-left text-sm font-semibold text-slate-100 transition-colors hover:border-[#7dd3fc]/35 hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-[#ffd166]" />
          <span className="truncate">Bulan</span>
        </span>
        <span className="truncate text-xs font-bold text-[#ffd166]">{selectedLabel}</span>
      </summary>
      <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#09111d] p-3 shadow-[0_24px_50px_rgba(0,0,0,0.42)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Filter Bulan</p>
            <p className="text-[11px] text-slate-500">Pilih satu atau beberapa bulan untuk memadatkan overview.</p>
          </div>
          {selected.length > 0 ? (
            <button type="button" onClick={onClear} className="rounded-md border border-white/10 px-2 py-1 text-[10px] font-bold text-[#ffd166] hover:bg-[#ffd166]/10">
              Clear
            </button>
          ) : null}
        </div>
        <div className="grid max-h-64 grid-cols-3 gap-2 overflow-auto pr-1 text-xs">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={selectedSet.has(item)}
              onClick={() => onToggle(item)}
              className={cn(
                "min-h-9 rounded-lg border px-2 py-1 text-left font-medium transition-colors",
                selectedSet.has(item) ? "border-[#ffd166]/50 bg-[#ffd166] text-[#211600]" : "border-white/10 bg-white/5 text-slate-200 hover:border-[#7dd3fc]/35 hover:bg-[#7dd3fc]/10",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}

function LineTrend({
  title,
  points,
  periodMode,
  onPeriodModeChange,
}: {
  title: string;
  points: TrendPoint[];
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
}) {
  const values = points.map((point) => point.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const polyline = points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : 5 + (index / (points.length - 1)) * 90;
      const y = 36 - ((point.value - min) / range) * 28;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="h-full rounded-lg border border-white/10 bg-[#0c1724] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-100">{title}</h4>
        <PeriodModeSelector value={periodMode} onChange={onPeriodModeChange} />
      </div>
      {points.length > 0 ? (
        <>
          <svg className="h-56 w-full overflow-visible" viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
            {[8, 15, 22, 29, 36].map((y) => (
              <line key={y} x1="3" x2="98" y1={y} y2={y} stroke="rgba(148,163,184,0.28)" strokeWidth="0.25" />
            ))}
            <line x1="3" x2="98" y1="28" y2="28" stroke="#ef4444" strokeDasharray="1 1" strokeWidth="0.35" />
            <polyline points={polyline} fill="none" stroke="#7dd3fc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.9" />
            {points.map((point, index) => {
              const x = points.length === 1 ? 50 : 5 + (index / (points.length - 1)) * 90;
              const y = 36 - ((point.value - min) / range) * 28;

              return (
                <circle key={point.key} cx={x} cy={y} r="1.25" fill="#70f0bf" className="cursor-help">
                  <title>{`${point.label}: ${point.valueLabel}`}</title>
                </circle>
              );
            })}
          </svg>
          <div className="grid grid-cols-6 gap-1 text-center text-[10px] text-slate-400 md:grid-cols-12">
            {points.map((point) => (
              <span key={point.key} className="truncate" title={`${point.label}: ${point.valueLabel}`}>
                {point.label.split(" ")[0]}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="grid h-56 place-items-center text-center text-xs font-semibold text-slate-400">Tidak ada data pembanding</div>
      )}
    </div>
  );
}

function chartBarWidth(value: number, max: number) {
  return value === 0 ? 0 : Math.max(2, (Math.abs(value) / max) * 100);
}

function CombinedMonthlyBars({
  invoice,
  payment,
  periodMode,
  onPeriodModeChange,
}: {
  invoice: DashboardSection;
  payment: DashboardSection;
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
}) {
  const monthMap = new Map<string, { label: string; invoice: number; payment: number }>();

  for (const point of periodTrendPoints(invoice, periodMode)) {
    const item = monthMap.get(point.key) ?? { label: point.label, invoice: 0, payment: 0 };
    item.invoice += point.value;
    monthMap.set(point.key, item);
  }

  for (const point of periodTrendPoints(payment, periodMode)) {
    const item = monthMap.get(point.key) ?? { label: point.label, invoice: 0, payment: 0 };
    item.payment += point.value;
    monthMap.set(point.key, item);
  }

  const points = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => ({ key, ...value }));
  const max = Math.max(...points.flatMap((point) => [Math.abs(point.invoice), Math.abs(point.payment)]), 1);

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-[#0c1724] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-100">
        <span>Billing vs Payment Trend</span>
        <span className="flex flex-wrap items-center gap-3">
          <PeriodModeSelector value={periodMode} onChange={onPeriodModeChange} />
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 bg-[#ffd166]" /> Invoice</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 bg-[#70f0bf]" /> Payment</span>
        </span>
      </div>
      {points.length > 0 ? (
        points.map((point) => (
          <div key={point.key} className="grid grid-cols-[64px_1fr] items-center gap-3 text-[10px] font-bold text-slate-300">
            <span className="truncate text-right">{point.label}</span>
            <div className="grid gap-1">
              <div tabIndex={0} title={`Invoice ${point.label}: ${formatTrendValue(point.invoice, periodMode)}`} className="group relative h-4 overflow-hidden rounded bg-white/[0.06] outline-none">
                <HoverValue text={`Invoice ${point.label}: ${formatTrendValue(point.invoice, periodMode)}`} />
                <div
                  className={cn("h-full border", point.invoice < 0 ? "border-[#b91c1c] bg-[#ff9f8e]" : "border-[#b88700] bg-[#ffd166]")}
                  style={{ width: `${chartBarWidth(point.invoice, max)}%` }}
                />
                <span className="absolute right-1 top-0 text-[9px] text-slate-100">{formatTrendValue(point.invoice, periodMode)}</span>
              </div>
              <div tabIndex={0} title={`Payment ${point.label}: ${formatTrendValue(point.payment, periodMode)}`} className="group relative h-4 overflow-hidden rounded bg-white/[0.06] outline-none">
                <HoverValue text={`Payment ${point.label}: ${formatTrendValue(point.payment, periodMode)}`} />
                <div
                  className={cn("h-full border", point.payment < 0 ? "border-[#b91c1c] bg-[#ff9f8e]" : "border-[#0f766e] bg-[#70f0bf]")}
                  style={{ width: `${chartBarWidth(point.payment, max)}%` }}
                />
                <span className="absolute right-1 top-0 text-[9px] text-slate-100">{formatTrendValue(point.payment, periodMode)}</span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="grid min-h-40 place-items-center text-center text-xs font-semibold text-slate-400">Tidak ada data pembanding</div>
      )}
    </div>
  );
}

function CombinedOverview({
  invoice,
  payment,
  periodMode,
  onPeriodModeChange,
  periodFilters,
  onTogglePeriodFilter,
  onClearPeriodFilter,
}: {
  invoice: LoadedReport;
  payment: LoadedReport;
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
  periodFilters: OverviewFilters;
  onTogglePeriodFilter: (value: string) => void;
  onClearPeriodFilter: () => void;
}) {
  const invoiceSection = filteredSectionByPeriodLabels(invoice.section, periodFilters.periodLabels, statusOrders.invoice);
  const paymentSection = filteredSectionByPeriodLabels(payment.section, periodFilters.periodLabels, statusOrders.payment);
  const outstanding = invoiceSection.totalAmount;
  const paid = paymentSection.totalAmount;
  const coverage = outstanding > 0 ? paid / outstanding : 0;
  const exposure = outstanding - paid;
  const invoiceBucket4 = itemByLabel(invoiceSection.statusMix, "Bucket 4")?.share ?? 0;
  const currentPayment = itemByLabel(paymentSection.statusMix, "No Risk")?.share ?? 0;
  const selectedPeriodCount = periodFilters.periodLabels.length;
  const availablePeriods = overviewPeriodLabels(invoice.section, payment.section);
  const kpis = [
    { title: "Total Outstanding", value: formatCurrency(outstanding, true), icon: ReceiptText, accent: "amber" as const },
    { title: "Total Payment", value: formatCurrency(paid, true), icon: Wallet, accent: "emerald" as const },
    { title: "Cash Coverage", value: formatPercent(coverage), icon: PieChart, accent: "cyan" as const },
    { title: "Net Exposure", value: formatCurrency(exposure, true), icon: Calculator, accent: "amber" as const },
  ];

  return (
    <section id="overview-dashboard" data-animate-block className="overflow-hidden rounded-lg border border-white/10 bg-[#0b1320] shadow-[0_22px_45px_rgba(0,0,0,0.28)]">
      <div className="flex min-h-11 items-center justify-center border-b border-white/10 bg-[#0c1724] px-4 py-2 text-center">
        <h2 className="text-lg font-black uppercase tracking-wide text-white md:text-2xl">
          Overview Report Monitoring <span className="text-[#ffd166]">|</span> <span className="text-sm text-[#ffd166] md:text-lg">Invoice + Payment</span>
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-[#07111f] p-2.5">
        <OverviewMonthDropdown
          items={availablePeriods.length > 0 ? availablePeriods : ["Jan 2025"]}
          selected={periodFilters.periodLabels}
          onToggle={onTogglePeriodFilter}
          onClear={onClearPeriodFilter}
        />
        {selectedPeriodCount > 0 ? (
          <span className="text-xs font-semibold text-[#ffd166]">{selectedPeriodCount} bulan aktif</span>
        ) : null}
      </div>

      <div className="grid gap-2.5 p-2.5 xl:grid-cols-4">
        {kpis.map((item) => (
          <ReportKpi key={item.title} {...item} compact />
        ))}
      </div>

      <div className="grid gap-2.5 p-2.5 pt-0 xl:grid-cols-[0.95fr_0.95fr_1.25fr]">
        <DonutChart
          title="Invoice Aging by Bucket"
          items={invoiceSection.statusMix}
          centerLabel="Invoice Aging"
          summary={`Bucket 4 (>365): ${formatPercent(invoiceBucket4)}`}
          compact
        />
        <DonutChart
          title="Payment Risk Composition"
          items={paymentSection.statusMix}
          centerLabel="Payment Risk"
          summary={`Current: ${formatPercent(currentPayment)}`}
          compact
        />
        <CombinedMonthlyBars invoice={invoiceSection} payment={paymentSection} periodMode={periodMode} onPeriodModeChange={onPeriodModeChange} />
      </div>

      <div className="grid gap-2.5 p-2.5 pt-0 xl:grid-cols-2">
        <div>
          <div className="rounded-t-lg border border-b-0 border-white/10 bg-[#0c1724] p-2 text-center text-sm font-black uppercase text-[#ffd166]">Top Billing Customers</div>
          <HorizontalBars items={invoiceSection.topCustomers} maxItems={5} />
        </div>
        <div>
          <div className="rounded-t-lg border border-b-0 border-white/10 bg-[#0c1724] p-2 text-center text-sm font-black uppercase text-[#70f0bf]">Top Payment Customers</div>
          <HorizontalBars items={paymentSection.topCustomers} maxItems={5} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#07111f] px-3 py-2 text-xs font-semibold text-slate-400">
        <span>{compactFileName(invoice.file.name)} + {compactFileName(payment.file.name)}</span>
        <span>Invoice {formatNumber(invoice.file.rowCount)} rows - Payment {formatNumber(payment.file.rowCount)} rows</span>
      </div>
    </section>
  );
}

function ReportFrame({
  id,
  title,
  section,
  file,
  generatedAt,
  role,
  filters,
  onToggleFilter,
  onClearFilter,
  periodMode,
  onPeriodModeChange,
}: {
  id: string;
  title: string;
  section: DashboardSection;
  file: UploadedWorkbookSummary;
  generatedAt: string;
  role: WorkbookRole;
  filters: ReportFilters;
  onToggleFilter: (key: FilterKey, value: string) => void;
  onClearFilter: (key?: FilterKey) => void;
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
}) {
  const isInvoice = role === "invoice";
  const statusOrder = statusOrders[role];
  const activeSection = filteredSection(section, filters, statusOrder);
  const selectedCount = activeFilterCount(filters);
  const primaryShare = isInvoice ? itemByLabel(activeSection.statusMix, "Bucket 4")?.share ?? 0 : itemByLabel(activeSection.statusMix, "No Risk")?.share ?? 0;
  const groupShare = itemByLabel(activeSection.customerTypes, "Group")?.share ?? 0;
  const externalShare = itemByLabel(activeSection.customerTypes, "External")?.share ?? 0;
  const kpis = isInvoice
    ? [
        { title: "Total Outstanding", value: formatCurrency(activeSection.totalAmount, true), icon: Wallet },
        { title: "Total Invoice", value: formatNumber(activeSection.rowCount), icon: ReceiptText },
        { title: "Average Piutang / Bulan", value: formatCurrency(monthlyAverage(activeSection), true), icon: Calculator },
        { title: "% Bucket 4 (>365)", value: formatPercent(primaryShare), icon: PieChart },
        { title: "Piutang by Customer Type", value: `Group ${formatPercent(groupShare)}`, detail: `External ${formatPercent(externalShare)}`, icon: BarChart3 },
      ]
    : [
        { title: "Total Payment", value: formatCurrency(activeSection.totalAmount, true), icon: Wallet },
        { title: "Total Invoice", value: formatNumber(activeSection.rowCount), icon: ReceiptText },
        { title: "Average Payment", value: formatCurrency(activeSection.averageAmount, true), icon: Calculator },
        { title: "% Current (<30 Day)", value: formatPercent(primaryShare), icon: PieChart },
      ];
  const years = filterOptions(section, "year", [...new Set(section.monthly.map((point) => point.label.split(" ")[1]).filter(Boolean))], Infinity);
  const months = filterOptions(section, "month", monthLabels, 12);
  const customerTypes = filterOptions(section, "customerType", listLabels(section.customerTypes, 2), 4);
  const customerNames = filterOptions(section, "customerName", listLabels(section.topCustomers, isInvoice ? 7 : 8), isInvoice ? 7 : 8);
  const invoiceTypes = filterOptions(section, "invoiceType", listLabels(section.invoiceTypes, isInvoice ? 6 : 9), isInvoice ? 6 : 9);
  const statuses = filterOptions(section, "status", listLabels(section.statusMix, 6), 8);
  const trendPoints = periodTrendPoints(activeSection, periodMode);

  return (
    <section id={id} data-animate-block className="overflow-hidden rounded-lg border border-white/10 bg-[#0b1320] shadow-[0_22px_45px_rgba(0,0,0,0.28)]">
      <div className="flex min-h-14 items-center justify-center border-b border-white/10 bg-[#0c1724] px-4 text-center">
        <h2 className="text-xl font-black uppercase tracking-wide text-white md:text-3xl">
          {title} <span className="text-[#ffd166]">|</span> <span className="text-base text-[#ffd166] md:text-xl">Commercial Finance 2 - Section Non Cemen</span>
        </h2>
      </div>

      <div className={cn("grid gap-3 p-3", isInvoice ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
        {kpis.map((item) => (
          <ReportKpi key={item.title} {...item} accent={isInvoice ? "amber" : "cyan"} />
        ))}
      </div>

      <div className={cn("grid gap-3 p-3 pt-0", isInvoice ? "xl:grid-cols-[1.25fr_1.3fr_1.3fr_0.8fr]" : "xl:grid-cols-[1.1fr_0.9fr_1.1fr_0.95fr]")}>
        <div className="grid gap-3">
          <FilterPanel
            title={isInvoice ? "Cust. Typ" : "Custo. Typ"}
            items={customerTypes}
            columns={2}
            selected={filters.customerType}
            onToggle={(value) => onToggleFilter("customerType", value)}
            onClear={() => onClearFilter("customerType")}
          />
          <FilterPanel
            title={isInvoice ? "Cust. Name" : "Cust.Name"}
            items={customerNames}
            selected={filters.customerName}
            onToggle={(value) => onToggleFilter("customerName", value)}
            onClear={() => onClearFilter("customerName")}
          />
        </div>

        <div className="grid gap-3">
          <FilterPanel
            title="Year"
            items={years.length > 0 ? years : ["2025", "2026"]}
            columns={Math.min(3, Math.max(1, years.length)) as 1 | 2 | 3}
            selected={filters.year}
            onToggle={(value) => onToggleFilter("year", value)}
            onClear={() => onClearFilter("year")}
          />
          <FilterPanel
            title="Month"
            items={months.length > 0 ? months : monthLabels.slice(0, 3)}
            columns={3}
            selected={filters.month}
            onToggle={(value) => onToggleFilter("month", value)}
            onClear={() => onClearFilter("month")}
          />
          {!isInvoice ? (
            <FilterPanel
              title="Risk Status"
              items={statuses}
              columns={2}
              selected={filters.status}
              onToggle={(value) => onToggleFilter("status", value)}
              onClear={() => onClearFilter("status")}
            />
          ) : null}
        </div>

        <div className="grid gap-3">
          <FilterPanel
            title="Invoice Typ"
            items={invoiceTypes}
            selected={filters.invoiceType}
            onToggle={(value) => onToggleFilter("invoiceType", value)}
            onClear={() => onClearFilter("invoiceType")}
          />
        </div>

        {isInvoice ? (
          <DonutChart title="Outstanding Aging by Bucket" items={activeSection.statusMix} centerLabel="Aging" />
        ) : (
          <StatusBars title="Payment Aging by Risk" items={activeSection.statusMix} />
        )}
      </div>

      <div className={cn("grid gap-3 p-3 pt-0", isInvoice ? "xl:grid-cols-[0.9fr_1fr_1.25fr]" : "xl:grid-cols-[1fr_0.9fr]")}>
        {isInvoice ? (
          <>
            <HorizontalBars title="Top Customers by Outstanding" items={activeSection.topCustomers} maxItems={8} showValue={false} />
            <DonutChart title="Outstanding by Invoice Type" items={activeSection.invoiceTypes} centerLabel="Type" />
            <StatusBars title="Outstanding Aging by Bucket" items={activeSection.statusMix} />
          </>
        ) : (
          <>
            <DonutChart title="Payment Risk Composition" items={activeSection.statusMix} centerLabel={formatPercent(primaryShare)} />
            <HorizontalBars title="Top Customers by Payment" items={activeSection.topCustomers} maxItems={5} />
          </>
        )}
      </div>

      <div className={cn("grid gap-3 p-3 pt-0", isInvoice ? "xl:grid-cols-[0.7fr_1.55fr]" : "xl:grid-cols-[1fr_1fr]")}>
        {isInvoice ? <HorizontalBars title="Outstanding by Invoice Type" items={activeSection.invoiceTypes} maxItems={8} showValue={false} /> : null}
        <LineTrend title={isInvoice ? "Outstanding Trend" : "Payment Trend"} points={trendPoints} periodMode={periodMode} onPeriodModeChange={onPeriodModeChange} />
        {!isInvoice ? <DonutChart title="Payment by Customer Type" items={activeSection.customerTypes} centerLabel="Type" /> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#07111f] px-3 py-2 text-xs font-semibold text-slate-400">
        <span>{compactFileName(file.name)} - {file.sheetName}</span>
        <span>
          {selectedCount > 0 ? `${selectedCount} filter aktif - ` : null}
          Generated {formatTimestamp(generatedAt)}
        </span>
      </div>
    </section>
  );
}

function UploadCard({
  role,
  title,
  description,
  isLoading,
  loaded,
  error,
  onPick,
  onDrop,
}: {
  role: WorkbookRole;
  title: string;
  description: string;
  isLoading: boolean;
  loaded?: LoadedReport;
  error?: string;
  onPick: () => void;
  onDrop: (files: FileList) => void;
}) {
  const Icon = role === "invoice" ? ReceiptText : Wallet;
  const accent = role === "invoice" ? "text-[#ffd166] border-[#ffd166]/30 bg-[#ffd166]/10" : "text-[#70f0bf] border-[#70f0bf]/30 bg-[#70f0bf]/10";

  return (
    <Card
      data-animate-block
      id={role === "invoice" ? "upload-invoice" : "upload-payment"}
      className="border-white/10 bg-[#0c1724]/90 shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(event.dataTransfer.files);
      }}
    >
      <CardHeader className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className={cn("grid h-12 w-12 place-items-center rounded-lg border", accent)}>
            <Icon className="h-6 w-6" />
          </div>
          {loaded ? (
            <Badge className="border border-[#70f0bf]/25 bg-[#70f0bf]/10 text-[#70f0bf]">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Saved
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-2xl text-white">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <Button type="button" onClick={onPick} disabled={isLoading} className="w-full rounded-lg bg-[#ffd166] text-[#211600] hover:bg-[#ffe29a]">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {isLoading ? "Processing" : `Upload ${role === "invoice" ? "Invoice" : "Payment"}`}
        </Button>
        {loaded ? (
          <div className="rounded-lg border border-white/10 bg-[#07111f] p-3 text-sm">
            <p className="truncate font-medium text-white">{compactFileName(loaded.file.name)}</p>
            <p className="mt-1 text-slate-500">{formatNumber(loaded.file.rowCount)} rows - {formatCurrency(loaded.file.totalAmount, true)}</p>
            {loaded.id ? <p className="mt-1 text-xs text-[#70f0bf]">Database upload #{loaded.id}</p> : null}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f] p-4 text-center text-sm text-slate-500">Drop file .xlsx di sini</div>
        )}
        {error ? <p className="rounded-lg border border-[#ff9f8e]/25 bg-[#ff9f8e]/10 p-3 text-sm text-[#ffb4a6]">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage({
  view = "overview",
  initialReports,
}: {
  view?: DashboardView;
  initialReports?: PersistedDashboardReports;
}) {
  const [reports, setReports] = useState<Partial<Record<WorkbookRole, LoadedReport>>>(() => {
    const loadedReports = loadedReportsFromPersisted(initialReports);

    return cacheReports(loadedReports);
  });
  const [errors, setErrors] = useState<Partial<Record<WorkbookRole, string>>>({});
  const [filters, setFilters] = useState<Record<WorkbookRole, ReportFilters>>({ invoice: {}, payment: {} });
  const [overviewFilters, setOverviewFilters] = useState<OverviewFilters>({ periodLabels: [] });
  const [periodMode, setPeriodMode] = useState<PeriodMode>("mom");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof document === "undefined") {
      return "dark";
    }

    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  });
  const [loadingRole, setLoadingRole] = useState<WorkbookRole | null>(null);
  const [isLoadingStoredReports, setIsLoadingStoredReports] = useState(!initialReports);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);
  const hasAnyReport = Boolean(reports.invoice || reports.payment);
  const activeRole = view === "invoice" || view === "payment" ? view : null;
  const activeUploadCards = activeRole ? uploadCards.filter((card) => card.role === activeRole) : uploadCards;
  const pageTitle = activeRole === "invoice" ? "Invoice Report Monitoring" : activeRole === "payment" ? "Payment Report Monitoring" : "Overview Dashboard";
  const overviewReady = Boolean(reports.invoice && reports.payment);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("deptcontrol-theme");
    const nextTheme: ThemeMode = storedTheme === "light" ? "light" : "dark";
    setThemeMode(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem("deptcontrol-theme", themeMode);
  }, [themeMode]);

  function toggleFilter(role: WorkbookRole, key: FilterKey, value: string) {
    setFilters((current) => {
      const roleFilters = current[role];
      const selected = roleFilters[key] ?? [];
      const nextSelected = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
      const nextRoleFilters: ReportFilters = { ...roleFilters };

      if (nextSelected.length > 0) {
        nextRoleFilters[key] = nextSelected;
      } else {
        delete nextRoleFilters[key];
      }

      return {
        ...current,
        [role]: nextRoleFilters,
      };
    });
  }

  function clearFilters(role: WorkbookRole, key?: FilterKey) {
    setFilters((current) => {
      if (!key) {
        return {
          ...current,
          [role]: {},
        };
      }

      const nextRoleFilters: ReportFilters = { ...current[role] };
      delete nextRoleFilters[key];

      return {
        ...current,
        [role]: nextRoleFilters,
      };
    });
  }

  function openWorkbookPicker(role: WorkbookRole) {
    if (role === "invoice") {
      invoiceInputRef.current?.click();
      return;
    }

    paymentInputRef.current?.click();
  }

  function resetDashboard() {
    dashboardReportsCache = {};
    setReports({});
    setErrors({});
    setFilters({ invoice: {}, payment: {} });
    setOverviewFilters({ periodLabels: [] });
  }

  function toggleOverviewPeriodFilter(value: string) {
    setOverviewFilters((current) => {
      const nextSelected = current.periodLabels.includes(value)
        ? current.periodLabels.filter((item) => item !== value)
        : [...current.periodLabels, value];

      return { periodLabels: nextSelected };
    });
  }

  function clearOverviewPeriodFilter() {
    setOverviewFilters({ periodLabels: [] });
  }

  function toggleThemeMode() {
    setThemeMode((current) => (current === "dark" ? "light" : "dark"));
  }

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [view]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (initialReports) {
      setReports(loadedReportsFromPersisted(initialReports));
      setIsLoadingStoredReports(false);
      return;
    }

    const hasCachedRouteData = activeRole ? Boolean(dashboardReportsCache[activeRole]) : Boolean(dashboardReportsCache.invoice && dashboardReportsCache.payment);

    if (hasCachedRouteData) {
      setReports({ ...dashboardReportsCache });
      setIsLoadingStoredReports(false);
      return;
    }

    let cancelled = false;

    async function loadStoredReports() {
      setIsLoadingStoredReports(true);

      try {
        const response = await fetch(activeRole ? `/api/dashboard?role=${activeRole}` : "/api/dashboard");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Data upload tersimpan tidak bisa dimuat.");
        }

        if (cancelled) {
          return;
        }

        const storedReports = (payload.reports ?? {}) as PersistedDashboardReports;

        const loadedReports = loadedReportsFromPersisted(storedReports);

        setReports((current) => ({
          ...current,
          ...cacheReports(loadedReports),
        }));
      } catch (error) {
        if (!cancelled && activeRole) {
          setErrors((current) => ({
            ...current,
            [activeRole]: error instanceof Error ? error.message : "Data upload tersimpan tidak bisa dimuat.",
          }));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStoredReports(false);
        }
      }
    }

    void loadStoredReports();

    return () => {
      cancelled = true;
    };
  }, [activeRole, initialReports]);

  async function uploadRole(role: WorkbookRole, fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    setLoadingRole(role);
    setErrors((current) => ({ ...current, [role]: undefined }));

    try {
      const formData = new FormData();
      formData.append("role", role);
      formData.append("files", file);

      const response = await fetch("/api/dashboard", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      const persistedReport = payload.persistedReport as PersistedDashboardReport | undefined;
      const section = payload[role] as DashboardSection | undefined;
      const fileSummary = (payload.files as UploadedWorkbookSummary[] | undefined)?.find((item) => item.role === role);

      if (!response.ok || (!persistedReport && (!section || !fileSummary))) {
        throw new Error(payload.error ?? "Workbook tidak bisa diproses.");
      }

      const loadedReport = persistedReport
        ? fromPersistedReport(persistedReport)
        : {
            generatedAt: payload.generatedAt,
            file: fileSummary as UploadedWorkbookSummary,
            section: section as DashboardSection,
          };

      cacheReports({ [role]: loadedReport });
      setReports((current) => ({
        ...current,
        [role]: loadedReport,
      }));
      clearFilters(role);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [role]: error instanceof Error ? error.message : "Workbook tidak bisa diproses.",
      }));
    } finally {
      setLoadingRole(null);

      if (role === "invoice" && invoiceInputRef.current) {
        invoiceInputRef.current.value = "";
      }

      if (role === "payment" && paymentInputRef.current) {
        paymentInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <input
        ref={invoiceInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => void uploadRole("invoice", event.target.files)}
      />
      <input
        ref={paymentInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => void uploadRole("payment", event.target.files)}
      />

      {isMobileNavOpen ? (
        <div aria-label="Mobile navigation" aria-modal="true" className="fixed inset-0 z-50 md:hidden" role="dialog">
          <button aria-label="Close navigation" className="absolute inset-0 bg-black/60" type="button" onClick={() => setIsMobileNavOpen(false)} />
          <aside className="relative flex h-full w-80 max-w-[88vw] flex-col border-r border-white/10 bg-[#0c1724] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ffd166] text-[#211600]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-white">Commercial Finance 2</h1>
                  <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-500">Commercial Finance</p>
                </div>
              </div>
              <Button
                aria-label="Close navigation"
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                size="icon"
                type="button"
                variant="secondary"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="mt-8 flex flex-col gap-2 text-sm">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.view === view;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
                      active ? "bg-[#ffd166] text-[#211600]" : "text-slate-300 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-2 border-t border-white/10 pt-5">
              {hasAnyReport ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetDashboard();
                    setIsMobileNavOpen(false);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </Button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-white/10 bg-[#0c1724] md:block">
        <div className="flex h-full flex-col p-6">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ffd166] text-[#211600]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">Commercial Finance 2</h1>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Commercial Finance</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon;

              const active = item.view === view;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
                    active ? "bg-[#ffd166] text-[#211600]" : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <header className="fixed right-0 top-0 z-30 flex min-h-20 w-full items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--app-bg)_92%,transparent)] px-4 backdrop-blur md:w-[calc(100%-16rem)] md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-expanded={isMobileNavOpen}
            aria-label="Open navigation"
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 md:hidden"
            size="icon"
            type="button"
            variant="secondary"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-[0.16em] text-slate-500">AR Report Monitoring</p>
            <h2 className="truncate text-xl font-semibold text-white md:text-2xl">{pageTitle}</h2>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {hasAnyReport ? (
            <Button
              type="button"
              variant="secondary"
              onClick={resetDashboard}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--app-fg)] hover:bg-[var(--surface-4)]"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={toggleThemeMode}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--app-fg)] hover:bg-[var(--surface-4)]"
          >
            {themeMode === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            {themeMode === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
      </header>

      <main className="ml-0 min-h-screen px-4 pb-10 pt-24 md:ml-64 md:px-8">
        <div className="mx-auto max-w-[1500px] space-y-6">
          {activeRole ? (
            <section id="upload" className="grid gap-4 lg:grid-cols-1">
              {activeUploadCards.map((card) => (
                <UploadCard
                  key={card.role}
                  {...card}
                  isLoading={loadingRole === card.role}
                  loaded={reports[card.role]}
                  error={errors[card.role]}
                  onPick={() => openWorkbookPicker(card.role)}
                  onDrop={(files) => void uploadRole(card.role, files)}
                />
              ))}
            </section>
          ) : null}

          {isLoadingStoredReports ? (
            <Card data-animate-block className="border-white/10 bg-[#0c1724]/80">
              <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-[#ffd166]" />
                Memuat upload terakhir dari database...
              </CardContent>
            </Card>
          ) : null}

          {activeRole && !hasAnyReport && !isLoadingStoredReports ? (
            <Card data-animate-block className="border-white/10 bg-[#0c1724]/80">
              <CardContent className="grid gap-5 p-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#ffd166]">Separated Reports</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Upload file {activeRole === "invoice" ? "invoice" : "payment"}</h2>
                  <p className="mt-3 leading-7 text-slate-300">
                    Halaman ini khusus untuk {activeRole === "invoice" ? "Invoice Report Monitoring" : "Payment Report Monitoring"}. Setelah upload, dashboard langsung muncul di halaman ini.
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="min-h-44 rounded-lg border border-white/10 bg-[#07111f] p-3">
                    <div className="rounded-md border border-white/10 bg-[#0c1724] p-2 text-center text-lg font-black text-[#ffd166]">{activeRole === "invoice" ? "INVOICE REPORT" : "PAYMENT REPORT"}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="h-16 rounded-md border border-[#ffd166]/25 bg-[#ffd166]/10" />
                      <div className="h-16 rounded-md border border-[#7dd3fc]/25 bg-[#7dd3fc]/10" />
                      <div className="h-24 rounded-md border border-white/10 bg-white/[0.04]" />
                      <div className="h-24 rounded-full border border-[#70f0bf]/25 bg-[#70f0bf]/10" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeRole === null && !overviewReady && !isLoadingStoredReports ? (
            <Card data-animate-block className="border-white/10 bg-[#0c1724]/80">
              <CardContent className="grid gap-5 p-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#ffd166]">Combined Overview</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Upload invoice dan payment</h2>
                  <p className="mt-3 leading-7 text-slate-300">
                    Overview akan muncul setelah file invoice dan payment sudah masuk. Dashboard ini menggabungkan outstanding, payment, exposure, aging, risk, dan trend bulanan.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className={cn("min-h-44 rounded-lg border p-3", reports.invoice ? "border-[#70f0bf]/40 bg-[#70f0bf]/10" : "border-white/10 bg-[#07111f]")}>
                    <div className="rounded-md border border-white/10 bg-[#0c1724] p-2 text-center text-lg font-black text-[#ffd166]">INVOICE SOURCE</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="h-16 rounded-md border border-[#ffd166]/25 bg-[#ffd166]/10" />
                      <div className="h-16 rounded-md border border-[#7dd3fc]/25 bg-[#7dd3fc]/10" />
                      <div className="h-24 rounded-md border border-white/10 bg-white/[0.04]" />
                      <div className="h-24 rounded-full border border-[#70f0bf]/25 bg-[#70f0bf]/10" />
                    </div>
                  </div>
                  <div className={cn("min-h-44 rounded-lg border p-3", reports.payment ? "border-[#70f0bf]/40 bg-[#70f0bf]/10" : "border-white/10 bg-[#07111f]")}>
                    <div className="rounded-md border border-white/10 bg-[#0c1724] p-2 text-center text-lg font-black text-[#70f0bf]">PAYMENT SOURCE</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="h-16 rounded-md border border-[#70f0bf]/25 bg-[#70f0bf]/10" />
                      <div className="h-16 rounded-md border border-[#7dd3fc]/25 bg-[#7dd3fc]/10" />
                      <div className="h-24 rounded-full border border-[#94a3b8]/25 bg-[#94a3b8]/10" />
                      <div className="h-24 rounded-md border border-white/10 bg-white/[0.04]" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeRole === null && reports.invoice && reports.payment ? (
            <CombinedOverview
              invoice={reports.invoice}
              payment={reports.payment}
              periodMode={periodMode}
              onPeriodModeChange={setPeriodMode}
              periodFilters={overviewFilters}
              onTogglePeriodFilter={toggleOverviewPeriodFilter}
              onClearPeriodFilter={clearOverviewPeriodFilter}
            />
          ) : null}

          {activeRole === "invoice" && reports.invoice ? (
            <ReportFrame
              id="invoice-dashboard"
              title="Invoice Report Monitoring"
              role="invoice"
              section={reports.invoice.section}
              file={reports.invoice.file}
              generatedAt={reports.invoice.generatedAt}
              filters={filters.invoice}
              onToggleFilter={(key, value) => toggleFilter("invoice", key, value)}
              onClearFilter={(key) => clearFilters("invoice", key)}
              periodMode={periodMode}
              onPeriodModeChange={setPeriodMode}
            />
          ) : null}

          {activeRole === "payment" && reports.payment ? (
            <ReportFrame
              id="payment-dashboard"
              title="Payment Report Monitoring"
              role="payment"
              section={reports.payment.section}
              file={reports.payment.file}
              generatedAt={reports.payment.generatedAt}
              filters={filters.payment}
              onToggleFilter={(key, value) => toggleFilter("payment", key, value)}
              onClearFilter={(key) => clearFilters("payment", key)}
              periodMode={periodMode}
              onPeriodModeChange={setPeriodMode}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
