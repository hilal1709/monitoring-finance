"use client";

import { useMemo } from "react";
import { Xls01Icon, ShipIcon, Target02Icon, ChartLineData01Icon } from "@hugeicons/core-free-icons";
import { DashboardCanvas } from "@/components/dashboard-canvas/canvas";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { SourceNotice } from "@/components/export/source-notice";
import { TrendChart } from "@/components/export/trend-chart";
import { exportCard, exportPanel, rankSpec, trendSpec } from "@/components/export/views/widgets";
import type { ExportCanvasProps } from "@/components/export/views/types";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { monthlyPoints, rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportKpiSummary, ExportViewRecord } from "@/lib/export-dashboard-types";

function kpiRatio(actual: number, target: number) {
  return target ? (actual / target) * 100 : 0;
}

function kpiRealisasiPct(actual: number, target: number) {
  if (!target) return "-";
  return `${Math.round(kpiRatio(actual, target))}%`;
}

const byYear = (records: ExportViewRecord[]) =>
  rankRecords(records, (record) => record.periodKey.slice(0, 4), (record) => record.usdValue, 10).sort((left, right) => left.label.localeCompare(right.label));

function sharedPanels(tone: "yellow" | undefined): BuiltinWidget[] {
  return [
    exportPanel({
      id: "by-year",
      title: "Actual Penjualan per Tahun (USD)",
      w: 6,
      h: 5,
      spec: { chart: "bar-h", dimension: "year", measures: [{ field: "usdValue", agg: "sum", color: tone ? "sun" : "turquoise" }], sort: "label", limit: 10 },
      children: (records) => <HorizontalBars items={byYear(records)} formatValue={formatUsd} tone={tone} />,
    }),
    exportPanel({
      id: "by-company",
      title: "Actual Penjualan per Company (USD)",
      w: 6,
      h: 5,
      spec: rankSpec("companyCode", "usdValue", 8),
      children: (records) => <HorizontalBars items={rankRecords(records, (record) => record.companyCode, (record) => record.usdValue)} formatValue={formatUsd} />,
    }),
  ];
}

function rkapBuiltins(kpi: ExportKpiSummary | null): BuiltinWidget[] {
  if (!kpi) {
    return [
      { id: "notice", title: "Catatan sumber data", kind: "panel", w: 12, h: 2, render: () => <SourceNotice>Workbook tidak memiliki sheet KPI 2026. Grafik di bawah menampilkan actual ekspor dari sheet Data Gab/Data Ekspor; target tidak tersedia.</SourceNotice> },
      exportCard({ id: "actual-sales", title: "Actual Penjualan", icon: Target02Icon, iconKey: "target", tone: "turquoise", highlight: true, w: 4, value: (records) => formatUsd(total(records, (record) => record.usdValue)), spec: { field: "usdValue", agg: "sum" } }),
      exportCard({ id: "actual-tonnage", title: "Actual Tonase", icon: ShipIcon, iconKey: "ship", tone: "mint", w: 4, value: (records) => formatTonnage(total(records, (record) => record.tonnage)), spec: { field: "tonnage", agg: "sum" } }),
      exportCard({ id: "transactions", title: "Jumlah Transaksi", icon: Xls01Icon, iconKey: "sheet", tone: "coral", w: 4, value: (records) => records.length.toLocaleString("id-ID"), spec: { field: "count", agg: "count" } }),
      ...sharedPanels(undefined),
      exportPanel({
        id: "monthly",
        title: "Actual Ekspor Bulanan (USD)",
        w: 12,
        h: 6,
        spec: trendSpec([{ field: "usdValue", color: "sun", label: "Actual" }]),
        children: (records) => <TrendChart points={monthlyPoints(records)} series={[{ key: "sales", label: "Actual", color: "#FFE66D" }]} valueFormatter={formatUsd} />,
      }),
    ];
  }

  // KPI-sheet totals ignore the record filters, exactly as before.
  const sum = (pick: (month: ExportKpiSummary["months"][number]) => number) => kpi.months.reduce((total, month) => total + pick(month), 0);
  const salesTarget = sum((month) => month.salesTargetUsd);
  const salesActual = sum((month) => month.salesActualUsd);
  const paymentTarget = sum((month) => month.paymentTargetUsd);
  const paymentActual = sum((month) => month.paymentActualUsd);
  const withTargets = (records: ExportViewRecord[]) =>
    monthlyPoints(records).map((point) => {
      const month = kpi.months.find((item) => item.periodKey === point.key);
      return { ...point, salesTarget: month?.salesTargetUsd ?? 0, paymentTarget: month?.paymentTargetUsd ?? 0 };
    });

  return [
    exportCard({ id: "sales-target", title: "Target Penjualan", icon: Target02Icon, iconKey: "target", tone: "turquoise", value: () => formatUsd(salesTarget), spec: { measures: [{ field: "salesTargetUsd", agg: "sum" }], source: "export-target", ignoreFilters: ["*"] } }),
    exportCard({ id: "sales-actual", title: "Realisasi Penjualan", icon: ChartLineData01Icon, iconKey: "trend", tone: "mint", value: () => formatUsd(salesActual), spec: { measures: [{ field: "salesActualUsd", agg: "sum" }], source: "export-target", ignoreFilters: ["*"] } }),
    exportCard({ id: "payment-target", title: "Target Penerimaan", icon: Target02Icon, iconKey: "target", tone: "coral", value: () => formatUsd(paymentTarget), spec: { measures: [{ field: "paymentTargetUsd", agg: "sum" }], source: "export-target", ignoreFilters: ["*"] } }),
    exportCard({ id: "payment-actual", title: "Realisasi Penerimaan", icon: ShipIcon, iconKey: "ship", tone: "sun", value: () => formatUsd(paymentActual), spec: { measures: [{ field: "paymentActualUsd", agg: "sum" }], source: "export-target", ignoreFilters: ["*"] } }),
    exportCard({ id: "sales-pct", title: "% Realisasi Penjualan", icon: Target02Icon, iconKey: "target", tone: "turquoise", highlight: true, value: () => kpiRealisasiPct(salesActual, salesTarget), gauge: () => kpiRatio(salesActual, salesTarget), spec: { measures: [{ field: "salesActualUsd", agg: "sum" }], source: "export-target", compute: "ratio", target: { field: "salesTargetUsd" }, ring: true, format: "percent-round", ignoreFilters: ["*"] } }),
    exportCard({ id: "payment-pct", title: "% Realisasi Penerimaan", icon: ChartLineData01Icon, iconKey: "trend", tone: "mint", value: () => kpiRealisasiPct(paymentActual, paymentTarget), gauge: () => kpiRatio(paymentActual, paymentTarget), spec: { measures: [{ field: "paymentActualUsd", agg: "sum" }], source: "export-target", compute: "ratio", target: { field: "paymentTargetUsd" }, ring: true, format: "percent-round", ignoreFilters: ["*"] } }),
    exportCard({ id: "actual-tonnage", title: "Actual Tonase", icon: ShipIcon, iconKey: "ship", tone: "coral", value: (records) => formatTonnage(total(records, (record) => record.tonnage)), spec: { field: "tonnage", agg: "sum" } }),
    exportCard({ id: "transactions", title: "Jumlah Transaksi", icon: Xls01Icon, iconKey: "sheet", tone: "sun", value: (records) => records.length.toLocaleString("id-ID"), spec: { field: "count", agg: "count" } }),
    exportPanel({
      id: "sales-vs-target",
      title: "Penjualan: Target vs Realisasi Bulanan (USD)",
      w: 6,
      h: 6,
      spec: trendSpec([
        { field: "salesTargetUsd", source: "export-target", color: "turquoise", label: "Target" },
        { field: "usdValue", color: "sun", label: "Realisasi" },
      ]),
      children: (records) => (
        <TrendChart
          points={withTargets(records)}
          series={[
            { key: "salesTarget", label: "Target", color: "#4ECDC4" },
            { key: "sales", label: "Realisasi", color: "#FFE66D" },
          ]}
          valueFormatter={formatUsd}
        />
      ),
    }),
    exportPanel({
      id: "payment-vs-target",
      title: "Penerimaan: Target vs Realisasi Bulanan (USD)",
      w: 6,
      h: 6,
      spec: trendSpec([
        { field: "paymentTargetUsd", source: "export-target", color: "turquoise", label: "Target" },
        { field: "paidUsd", color: "teal", label: "Realisasi" },
      ]),
      children: (records) => (
        <TrendChart
          points={withTargets(records)}
          series={[
            { key: "paymentTarget", label: "Target", color: "#4ECDC4" },
            { key: "payment", label: "Realisasi", color: "#174D55" },
          ]}
          valueFormatter={formatUsd}
        />
      ),
    }),
    ...sharedPanels("yellow"),
  ];
}

export function RkapView({ kpi, ...props }: ExportCanvasProps & { kpi: ExportKpiSummary | null }) {
  const builtins = useMemo(() => rkapBuiltins(kpi), [kpi]);
  return <DashboardCanvas builtins={builtins} primarySource="export" {...props} />;
}
