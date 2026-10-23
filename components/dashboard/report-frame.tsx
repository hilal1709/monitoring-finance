"use client";

import { useMemo } from "react";
import { ChartHistogramIcon, CalculateIcon, PieChartIcon, Invoice03Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { DashboardCanvas, lazySource, type CanvasSources } from "@/components/dashboard-canvas/canvas";
import { toneCycle } from "@/components/dashboard-canvas/card-tones";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { HorizontalBars, StatusBars } from "@/components/dashboard/charts/horizontal-bars";
import { LineTrend } from "@/components/dashboard/charts/line-trend";
import { PaymentMovementSummary } from "@/components/dashboard/charts/payment-movement-summary";
import { TargetAchievementChart, TargetVsRealizationChart } from "@/components/dashboard/charts/target-charts";
import { FilterPanel } from "@/components/dashboard/filter-panel";
import { ReportKpi } from "@/components/dashboard/report-kpi";
import { builtinSources, monitoringRows, paymentTargetRows } from "@/lib/chart-builder/sources";
import type { CardCompute, FilterRule, PaletteColor, WidgetSpec } from "@/lib/chart-builder/types";
import {
  activeFilterCount,
  filterOptions,
  itemByLabel,
  listLabels,
  matchesFilters,
  monthlyAverage,
  paymentMovementSummary,
  paymentTargetPoints,
  periodScopeFromFilters,
  periodTrendPoints,
  sectionOf,
  withoutPeriodFilters,
} from "@/lib/dashboard-data";
import { compactFileName, formatCurrency, formatNumber, formatPercent, formatTimestamp } from "@/lib/dashboard-format";
import { monthLabels } from "@/lib/dashboard-constants";
import type { FilterKey, PeriodMode, ReportFilters } from "@/lib/dashboard-types";
import type { DashboardRecord, DashboardSection, UploadedWorkbookSummary, WorkbookRole } from "@/lib/monitoring-dashboard-types";

type FrameState = {
  role: WorkbookRole;
  section: DashboardSection;
  filters: ReportFilters;
  onToggleFilter: (key: FilterKey, value: string) => void;
  onClearFilter: (key?: FilterKey) => void;
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
};

const asRecords = (records: unknown[]) => records as DashboardRecord[];

type CardInput = Pick<WidgetSpec, "measures"> & { compute?: CardCompute; share?: FilterRule; split?: { field: string; values: string[] } };

/** The Invoice / Payment report as canvas built-ins: filters, cards, charts — each with the spec that reproduces it. */
function frameBuiltins(state: FrameState): BuiltinWidget[] {
  const { role, section, filters, onToggleFilter, onClearFilter, periodMode, onPeriodModeChange } = state;
  const isInvoice = role === "invoice";
  const view = (records: unknown[]) => sectionOf(asRecords(records), role);

  const filter = (key: FilterKey, title: string, items: string[], columns: 1 | 2 | 3 = 1, w24?: number): BuiltinWidget => ({
    id: `filter-${key}`,
    title: `Filter ${title}`,
    kind: "filter",
    w: 4,
    w24,
    h: 1,
    filter: { field: key, label: title, clear: () => onClearFilter(key) },
    render: () => <FilterPanel title={title} items={items} columns={columns} selected={filters[key]} onToggle={(value) => onToggleFilter(key, value)} onClear={() => onClearFilter(key)} compact />,
  });

  const years = filterOptions(section, "year", [...new Set(section.monthly.map((point) => point.label.split(" ")[1]).filter(Boolean))], Infinity);
  const months = filterOptions(section, "month", monthLabels, 12);
  const filterWidgets: BuiltinWidget[] = [
    filter("customerType", isInvoice ? "Cust. Typ" : "Custo. Typ", filterOptions(section, "customerType", listLabels(section.customerTypes, 2), 4), 2),
    filter("year", "Year", years.length > 0 ? years : ["2025", "2026"], Math.min(3, Math.max(1, years.length)) as 1 | 2 | 3),
    filter("invoiceType", "Invoice Typ", filterOptions(section, "invoiceType", listLabels(section.invoiceTypes, isInvoice ? 6 : 9), isInvoice ? 6 : 9)),
    // Invoice has five filters: the second row's two share the full width (no gap for the edit grid to fill).
    filter("customerName", isInvoice ? "Cust. Name" : "Cust.Name", filterOptions(section, "customerName", listLabels(section.topCustomers, isInvoice ? 7 : 8), isInvoice ? 7 : 8), 1, isInvoice ? 12 : undefined),
    filter("month", "Month", months.length > 0 ? months : monthLabels.slice(0, 3), 3, isInvoice ? 12 : undefined),
    ...(!isInvoice ? [filter("status", "Risk Status", filterOptions(section, "status", listLabels(section.statusMix, 6), 8), 2)] : []),
  ];

  const kpi = (
    id: string,
    title: string,
    icon: IconSvgElement,
    iconKey: string,
    w: number,
    index: number,
    value: (section: DashboardSection) => string,
    card: CardInput,
    detail?: (section: DashboardSection) => string,
  ): BuiltinWidget => ({
    id,
    title,
    kind: "card",
    source: role,
    w,
    // Invoice had five equal cards; 24 columns give 5+5+5+5+4.
    w24: isInvoice ? (index === 4 ? 4 : 5) : undefined,
    h: 2,
    newRow: index === 0,
    spec: {
      title,
      source: role,
      chart: "card",
      measures: card.measures,
      filters: [],
      comparison: "none",
      card: { display: "value", tone: toneCycle[index % 4], highlight: index === 0, icon: iconKey, compute: card.compute, share: card.share, split: card.split },
    },
    render: (records) => {
      const active = view(records);
      return <ReportKpi icon={icon} title={title} value={value(active)} detail={detail?.(active)} tone={toneCycle[index % 4]} compact highlight={index === 0} />;
    },
  });

  const amount = [{ field: "amount", agg: "sum" as const }];
  const share = (active: DashboardSection, label: string, list: "statusMix" | "customerTypes") => itemByLabel(active[list], label)?.share ?? 0;
  const shareOf = (label: string): CardInput => ({ measures: amount, compute: "share", share: { field: "status", op: "in", values: [label] } });
  const cards: BuiltinWidget[] = isInvoice
    ? [
        kpi("kpi-outstanding", "Total Outstanding", Wallet01Icon, "wallet", 3, 0, (active) => formatCurrency(active.totalAmount, true), { measures: amount }),
        kpi("kpi-invoices", "Total Invoice", Invoice03Icon, "invoice", 2, 1, (active) => formatNumber(active.rowCount), { measures: [{ field: "count", agg: "count" }] }),
        kpi("kpi-average", "Average Piutang / Bulan", CalculateIcon, "calculate", 3, 2, (active) => formatCurrency(monthlyAverage(active), true), { measures: [{ field: "amount", agg: "monthly-avg" }] }),
        kpi("kpi-bucket4", "% Bucket 4 (>365)", PieChartIcon, "pie", 2, 3, (active) => formatPercent(share(active, "Bucket 4", "statusMix")), shareOf("Bucket 4")),
        kpi(
          "kpi-customer-type",
          "Piutang by Customer Type",
          ChartHistogramIcon,
          "chart",
          2,
          4,
          (active) => `Group ${formatPercent(share(active, "Group", "customerTypes"))}`,
          { measures: amount, compute: "split", split: { field: "customerType", values: ["Group", "External"] } },
          (active) => `External ${formatPercent(share(active, "External", "customerTypes"))}`,
        ),
      ]
    : [
        kpi("kpi-payment", "Total Payment", Wallet01Icon, "wallet", 3, 0, (active) => formatCurrency(active.totalAmount, true), { measures: amount }),
        kpi("kpi-invoices", "Total Invoice", Invoice03Icon, "invoice", 3, 1, (active) => formatNumber(active.rowCount), { measures: [{ field: "count", agg: "count" }] }),
        kpi("kpi-average", "Average Payment", CalculateIcon, "calculate", 3, 2, (active) => formatCurrency(active.averageAmount, true), { measures: [{ field: "amount", agg: "avg" }] }),
        kpi("kpi-current", "% Current (<30 Day)", PieChartIcon, "pie", 3, 3, (active) => formatPercent(share(active, "No Risk", "statusMix")), shareOf("No Risk")),
      ];

  const chart = (
    id: string,
    title: string,
    w: number,
    h: number,
    render: (active: DashboardSection) => React.ReactNode,
    spec: Omit<WidgetSpec, "id" | "title" | "filters"> & { title?: string },
    newRow = false,
    w24?: number,
  ): BuiltinWidget => ({
    id,
    title,
    kind: "chart",
    source: role,
    w,
    w24,
    h,
    newRow,
    // The report always showed what the year/month filters selected, trends included.
    spec: { title, filters: [], ...spec, options: { followPeriodFilter: true, ...spec.options } },
    render: (records) => render(view(records)),
  });

  const donut = (dimension: string, options: NonNullable<WidgetSpec["options"]>, sort: WidgetSpec["sort"]) => ({ source: role, chart: "doughnut" as const, dimension, measures: amount, sort, limit: 8, options });
  const bars = (dimension: string, limit: number, sort: WidgetSpec["sort"], color: PaletteColor = "turquoise") => ({
    source: role,
    chart: "bar-h" as const,
    dimension,
    measures: [{ field: "amount", agg: "sum" as const, color }],
    sort,
    limit,
  });
  // Last 12 months on the axis; MoM/YoY/YTD look back over the whole history, as before.
  const trend = { source: role, chart: "line" as const, dimension: "periodKey", measures: amount, timeMode: "page" as const, limit: 12 };

  const charts: BuiltinWidget[] = isInvoice
    ? [
        chart("aging-donut", "Outstanding Aging by Bucket", 4, 6, (active) => <DonutChart title="Outstanding Aging by Bucket" items={active.statusMix} centerLabel="Aging" compact />, donut("status", { centerLabel: "Aging" }, "label"), true),
        chart("top-customers", "Top Customers by Outstanding", 4, 6, (active) => <HorizontalBars title="Top Customers by Outstanding" items={active.topCustomers} maxItems={6} tone="coral" />, bars("customerName", 6, "value-desc", "coral")),
        chart("invoice-types", "Outstanding by Invoice Type", 4, 6, (active) => <DonutChart title="Outstanding by Invoice Type" items={active.invoiceTypes} centerLabel="Type" compact />, donut("invoiceType", { centerLabel: "Type" }, "value-desc")),
        chart("trend", "Outstanding Trend", 12, 6, (active) => <LineTrend title="Outstanding Trend" points={periodTrendPoints(active, periodMode)} periodMode={periodMode} onPeriodModeChange={onPeriodModeChange} />, trend, true),
      ]
    : [
        chart("movement", "Payment Movement (MoM / YoY / YTD)", 12, 2, (active) => <PaymentMovementSummary summary={paymentMovementSummary(active)} />, { source: role, chart: "card", view: "movement", measures: amount }, true),
        chart("risk-bars", "Payment Aging by Risk", 4, 6, (active) => <StatusBars title="Payment Aging by Risk" items={active.statusMix} />, bars("status", 7, "label"), true),
        chart("top-customers", "Top Customers by Payment", 4, 6, (active) => <HorizontalBars title="Top Customers by Payment" items={active.topCustomers} maxItems={5} />, bars("customerName", 5, "value-desc")),
        chart(
          "risk-donut",
          "Payment Risk Composition",
          4,
          6,
          (active) => <DonutChart title="Payment Risk Composition" items={active.statusMix} centerLabel={formatPercent(itemByLabel(active.statusMix, "No Risk")?.share ?? 0)} compact />,
          donut("status", { centerShareOf: "No Risk" }, "label"),
        ),
        chart("trend", "Payment Trend", 5, 6, (active) => <LineTrend title="Payment Trend" points={periodTrendPoints(active, periodMode)} periodMode={periodMode} onPeriodModeChange={onPeriodModeChange} />, trend, true, 9),
        chart("target-achievement", "Target Achievement", 3, 6, (active) => <TargetAchievementChart points={paymentTargetPoints(active)} />, {
          title: "AR Persentase From Target",
          source: "payment-target",
          chart: "bar-h",
          view: "variance-bars",
          dimension: "periodKey",
          measures: [{ field: "amount", agg: "sum", source: role, divideBy: { field: "target", agg: "sum", source: "payment-target" } }],
          timeMode: "monthly",
          limit: 12,
          options: { monthOnly: true, followPeriodFilter: false },
        }, false, 6),
        chart("target-vs-realization", "Target vs Realization", 4, 6, (active) => <TargetVsRealizationChart points={paymentTargetPoints(active)} />, {
          title: "Target VS Realisasi",
          source: "payment-target",
          chart: "bar-h",
          view: "grouped-bars",
          dimension: "periodKey",
          measures: [
            { field: "target", agg: "sum", color: "sun", label: "Target" },
            { field: "amount", agg: "sum", source: role, color: "turquoise", label: "Realisasi" },
          ],
          timeMode: "monthly",
          limit: 12,
          options: { monthOnly: true, followPeriodFilter: false },
        }, false, 9),
      ];

  return [...filterWidgets, ...cards, ...charts];
}

export function ReportFrame({
  id,
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
  const selectedCount = activeFilterCount(filters);

  // Year/month filters become the canvas period scope so MoM/YoY/YTD widgets
  // can still see earlier months; every other filter narrows the rows directly.
  const otherFilters = useMemo(() => withoutPeriodFilters(filters), [filters]);
  const baseRecords = useMemo(() => {
    const records = section.records ?? [];
    return activeFilterCount(otherFilters) ? records.filter((record) => matchesFilters(record, otherFilters)) : records;
  }, [section, otherFilters]);
  const periodScope = useMemo(() => periodScopeFromFilters(baseRecords, filters), [baseRecords, filters]);
  const sources = useMemo<CanvasSources>(
    () => ({
      [role]: lazySource(builtinSources[role], baseRecords, monitoringRows),
      // Monthly payment targets, joined with the payment records on the period.
      ...(role === "payment" ? { "payment-target": lazySource(builtinSources["payment-target"], section.records ?? [], paymentTargetRows) } : {}),
    }),
    [role, baseRecords, section],
  );
  const builtins = useMemo(
    () => frameBuiltins({ role, section, filters, onToggleFilter, onClearFilter, periodMode, onPeriodModeChange }),
    [role, section, filters, onToggleFilter, onClearFilter, periodMode, onPeriodModeChange],
  );

  return (
    <section id={id} data-animate-block className="overflow-hidden rounded-lg border border-[#174D55]/14 bg-[#FFFFFF] shadow-[0_22px_45px_rgba(26,83,92,0.11)]">
      <DashboardCanvas className="p-2" builtins={builtins} sources={sources} primarySource={role} periodMode={periodMode} onPeriodModeChange={onPeriodModeChange} periodScope={periodScope} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#174D55]/14 bg-[#F7FFF7] px-3 py-2 text-xs font-semibold text-[#174D55]/90">
        <span>
          {compactFileName(file.name)} - {file.sheetName}
        </span>
        <span>
          {selectedCount > 0 ? `${selectedCount} filter aktif - ` : null}
          Generated {formatTimestamp(generatedAt)}
        </span>
      </div>
    </section>
  );
}
