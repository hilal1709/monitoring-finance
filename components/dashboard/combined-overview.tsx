"use client";

import { useMemo } from "react";
import { CalculateIcon, PieChartIcon, Invoice03Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { DashboardCanvas, lazySource, type CanvasSources } from "@/components/dashboard-canvas/canvas";
import { toneCycle } from "@/components/dashboard-canvas/card-tones";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { CombinedMonthlyBars } from "@/components/dashboard/charts/combined-monthly-bars";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { HorizontalBars } from "@/components/dashboard/charts/horizontal-bars";
import { OverviewMonthDropdown } from "@/components/dashboard/overview-month-dropdown";
import { ReportKpi } from "@/components/dashboard/report-kpi";
import { builtinSources, monitoringRows } from "@/lib/chart-builder/sources";
import { itemByLabel, overviewPeriodLabels, sectionOf } from "@/lib/dashboard-data";
import { compactFileName, formatCurrency, formatNumber, formatPercent } from "@/lib/dashboard-format";
import type { CardCompute } from "@/lib/chart-builder/types";
import type { LoadedReport, OverviewFilters, PeriodMode } from "@/lib/dashboard-types";
import type { DashboardRecord, DashboardSection } from "@/lib/monitoring-dashboard-types";

type Sections = { invoice: DashboardSection; payment: DashboardSection };

function overviewBuiltins(periodMode: PeriodMode, onPeriodModeChange: (value: PeriodMode) => void): BuiltinWidget[] {
  const both = (bySource: Partial<Record<string, unknown[]>>): Sections => ({
    invoice: sectionOf((bySource.invoice ?? []) as DashboardRecord[], "invoice"),
    payment: sectionOf((bySource.payment ?? []) as DashboardRecord[], "payment"),
  });

  type CardInput = { source: "invoice" | "payment"; compute?: CardCompute; target?: { field: string; source: "invoice" | "payment" } };
  const kpi = (id: string, title: string, icon: IconSvgElement, iconKey: string, index: number, value: (sections: Sections) => string, spec: CardInput): BuiltinWidget => ({
    id,
    title,
    kind: "card",
    source: "invoice",
    sources: ["payment"],
    w: 3,
    h: 2,
    spec: {
      title,
      source: spec.source,
      chart: "card",
      measures: [{ field: "amount", agg: "sum" }],
      filters: [],
      comparison: "none",
      view: "report",
      card: { display: "value", tone: toneCycle[index], highlight: title === "Cash Coverage", icon: iconKey, compute: spec.compute, target: spec.target },
    },
    render: (_records, bySource) => <ReportKpi icon={icon} title={title} value={value(both(bySource))} tone={toneCycle[index]} compact highlight={title === "Cash Coverage"} />,
  });

  const coverage = ({ invoice, payment }: Sections) => (invoice.totalAmount > 0 ? payment.totalAmount / invoice.totalAmount : 0);

  return [
    kpi("kpi-outstanding", "Total Outstanding", Invoice03Icon, "invoice", 0, ({ invoice }) => formatCurrency(invoice.totalAmount, true), { source: "invoice" }),
    kpi("kpi-payment", "Total Payment", Wallet01Icon, "wallet", 1, ({ payment }) => formatCurrency(payment.totalAmount, true), { source: "payment" }),
    // Payment ÷ invoice, and invoice − payment: the second side comes from the other source.
    kpi("kpi-coverage", "Cash Coverage", PieChartIcon, "pie", 2, (sections) => formatPercent(coverage(sections)), { source: "payment", compute: "ratio", target: { field: "amount", source: "invoice" } }),
    kpi("kpi-exposure", "Net Exposure", CalculateIcon, "calculate", 3, ({ invoice, payment }) => formatCurrency(invoice.totalAmount - payment.totalAmount, true), {
      source: "invoice",
      compute: "difference",
      target: { field: "amount", source: "payment" },
    }),
    {
      id: "invoice-aging",
      title: "Invoice Aging by Bucket",
      kind: "chart",
      source: "invoice",
      w: 3,
      w24: 7,
      h: 7,
      spec: {
        title: "Invoice Aging by Bucket",
        source: "invoice",
        chart: "doughnut",
        dimension: "status",
        measures: [{ field: "amount", agg: "sum" }],
        sort: "label",
        limit: 8,
        filters: [],
        options: { centerLabel: "Invoice Aging", summaryOf: { label: "Bucket 4", caption: "Bucket 4 (>365)" } },
      },
      render: (records) => {
        const invoice = sectionOf(records as DashboardRecord[], "invoice");
        return <DonutChart title="Invoice Aging by Bucket" items={invoice.statusMix} centerLabel="Invoice Aging" summary={`Bucket 4 (>365): ${formatPercent(itemByLabel(invoice.statusMix, "Bucket 4")?.share ?? 0)}`} compact />;
      },
    },
    {
      id: "payment-risk",
      title: "Payment Risk Composition",
      kind: "chart",
      source: "payment",
      w: 3,
      w24: 7,
      h: 7,
      spec: {
        title: "Payment Risk Composition",
        source: "payment",
        chart: "doughnut",
        dimension: "status",
        measures: [{ field: "amount", agg: "sum" }],
        sort: "label",
        limit: 8,
        filters: [],
        options: { centerLabel: "Payment Risk", summaryOf: { label: "No Risk", caption: "Current" } },
      },
      render: (records) => {
        const payment = sectionOf(records as DashboardRecord[], "payment");
        return <DonutChart title="Payment Risk Composition" items={payment.statusMix} centerLabel="Payment Risk" summary={`Current: ${formatPercent(itemByLabel(payment.statusMix, "No Risk")?.share ?? 0)}`} compact />;
      },
    },
    {
      id: "monthly-bars",
      title: "Invoice vs Payment per Bulan",
      kind: "chart",
      source: "invoice",
      sources: ["payment"],
      w: 6,
      w24: 10,
      h: 7,
      spec: {
        title: "Billing vs Payment Trend",
        source: "invoice",
        chart: "bar-h",
        view: "grouped-bars",
        dimension: "periodKey",
        measures: [
          { field: "amount", agg: "sum", color: "sun", label: "Invoice" },
          { field: "amount", agg: "sum", source: "payment", color: "teal", label: "Payment" },
        ],
        timeMode: "page",
        limit: 6,
        filters: [],
        // The month picker applies, as before.
        options: { followPeriodFilter: true },
      },
      render: (_records, bySource) => {
        const { invoice, payment } = both(bySource);
        return <CombinedMonthlyBars invoice={invoice} payment={payment} periodMode={periodMode} onPeriodModeChange={onPeriodModeChange} />;
      },
    },
    {
      id: "top-billing",
      title: "Top Billing Customers",
      kind: "chart",
      source: "invoice",
      w: 6,
      h: 5,
      spec: { title: "Top Billing Customers", source: "invoice", chart: "bar-h", dimension: "customerName", measures: [{ field: "amount", agg: "sum", color: "coral" }], sort: "value-desc", limit: 5, filters: [] },
      render: (records) => (
        <div>
          <div className="rounded-t-lg border border-b-0 border-[#174D55]/14 bg-[#FFFFFF] p-2 text-center text-sm font-black uppercase text-[#174D55]">Top Billing Customers</div>
          <HorizontalBars items={sectionOf(records as DashboardRecord[], "invoice").topCustomers} maxItems={5} tone="coral" />
        </div>
      ),
    },
    {
      id: "top-payment",
      title: "Top Payment Customers",
      kind: "chart",
      source: "payment",
      w: 6,
      h: 5,
      spec: { title: "Top Payment Customers", source: "payment", chart: "bar-h", dimension: "customerName", measures: [{ field: "amount", agg: "sum" }], sort: "value-desc", limit: 5, filters: [] },
      render: (records) => (
        <div>
          <div className="rounded-t-lg border border-b-0 border-[#174D55]/14 bg-[#FFFFFF] p-2 text-center text-sm font-black uppercase text-[#174D55]">Top Payment Customers</div>
          <HorizontalBars items={sectionOf(records as DashboardRecord[], "payment").topCustomers} maxItems={5} />
        </div>
      ),
    },
  ];
}

export function CombinedOverview({
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
  const availablePeriods = overviewPeriodLabels(invoice.section, payment.section);
  const sources = useMemo<CanvasSources>(() => {
    const invoiceRecords = invoice.section.records ?? [];
    const paymentRecords = payment.section.records ?? [];
    return {
      invoice: lazySource(builtinSources.invoice, invoiceRecords, monitoringRows),
      payment: lazySource(builtinSources.payment, paymentRecords, monitoringRows),
    };
  }, [invoice, payment]);

  // The month picker becomes the canvas period scope (see DashboardCanvas).
  const periodScope = useMemo(() => {
    const labels = new Set(periodFilters.periodLabels);
    if (labels.size === 0) return null;
    const keys = new Set<string>();
    for (const record of [...(invoice.section.records ?? []), ...(payment.section.records ?? [])]) {
      if (record.periodKey && record.periodLabel && labels.has(record.periodLabel)) keys.add(record.periodKey);
    }
    return keys.size ? [...keys].sort() : ["__none__"];
  }, [invoice, payment, periodFilters.periodLabels]);

  const builtins = useMemo(() => overviewBuiltins(periodMode, onPeriodModeChange), [periodMode, onPeriodModeChange]);

  return (
    <section id="overview-dashboard" data-animate-block className="overflow-hidden rounded-lg border border-[#174D55]/14 bg-[#FFFFFF] shadow-[0_22px_45px_rgba(26,83,92,0.11)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#174D55]/14 bg-[#F7FFF7] p-2.5">
        <OverviewMonthDropdown items={availablePeriods.length > 0 ? availablePeriods : ["Jan 2025"]} selected={periodFilters.periodLabels} onToggle={onTogglePeriodFilter} onClear={onClearPeriodFilter} />
      </div>

      <DashboardCanvas className="p-2.5" builtins={builtins} sources={sources} primarySource="invoice" periodMode={periodMode} onPeriodModeChange={onPeriodModeChange} periodScope={periodScope} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#174D55]/14 bg-[#F7FFF7] px-3 py-2 text-xs font-semibold text-[#174D55]/90">
        <span>
          {compactFileName(invoice.file.name)} + {compactFileName(payment.file.name)}
        </span>
        <span>
          Invoice {formatNumber(invoice.file.rowCount)} rows - Payment {formatNumber(payment.file.rowCount)} rows
        </span>
      </div>
    </section>
  );
}
