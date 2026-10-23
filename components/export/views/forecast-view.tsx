"use client";

import { useMemo } from "react";
import { Calendar03Icon, Xls01Icon, Invoice03Icon, Target02Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { DashboardCanvas } from "@/components/dashboard-canvas/canvas";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { SourceNotice } from "@/components/export/source-notice";
import { TrendChart } from "@/components/export/trend-chart";
import { exportCard, exportPanel, trendSpec } from "@/components/export/views/widgets";
import type { ExportCanvasProps } from "@/components/export/views/types";
import { formatUsd } from "@/lib/export-dashboard-format";
import { isPaid, rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportKpiSummary, ExportViewRecord } from "@/lib/export-dashboard-types";

const open = (records: ExportViewRecord[]) => records.filter((record) => !isPaid(record));
const openRule = [{ field: "paidStatus", op: "in" as const, values: ["Belum lunas"] }];

const openByCompany = (w: number) =>
  exportPanel({
    id: "open-by-company",
    title: "Piutang Terbuka per Company (USD)",
    w,
    h: 5,
    spec: { chart: "bar-h", dimension: "companyCode", measures: [{ field: "usdValue", agg: "sum" }], limit: 8, sort: "abs-desc", filters: openRule },
    children: (records) => <HorizontalBars items={rankRecords(open(records), (record) => record.companyCode, (record) => record.usdValue)} formatValue={formatUsd} />,
  });

const aging = (tone: "coral" | undefined) =>
  exportPanel({
    id: "aging",
    title: "Aging Piutang Terbuka (USD)",
    w: 6,
    h: 5,
    spec: { chart: "bar-h", dimension: "agingBucket", measures: [{ field: "usdValue", agg: "sum", color: tone ? "coral" : "turquoise" }], limit: 8, sort: "abs-desc", filters: openRule },
    children: (records) => <HorizontalBars items={rankRecords(open(records), (record) => record.agingBucket, (record) => record.usdValue, 8)} formatValue={formatUsd} tone={tone} />,
  });

function forecastBuiltins(kpi: ExportKpiSummary | null): BuiltinWidget[] {
  let widgets: BuiltinWidget[];
  if (kpi) {
    const points = kpi.months.map((month) => ({ key: month.periodKey, label: month.label, paymentTarget: month.paymentTargetUsd, paymentActual: month.paymentActualUsd }));
    const target = kpi.months.reduce((sum, month) => sum + month.paymentTargetUsd, 0);
    const actual = kpi.months.reduce((sum, month) => sum + month.paymentActualUsd, 0);
    widgets = [
      exportCard({ id: "payment-target", title: "Target Penerimaan (KPI 2026)", icon: Target02Icon, iconKey: "target", tone: "turquoise", value: () => formatUsd(target), spec: { measures: [{ field: "paymentTargetUsd", agg: "sum" }], source: "export-target", ignoreFilters: ["*"] } }),
      exportCard({ id: "payment-actual", title: "Realisasi Penerimaan", icon: Wallet01Icon, iconKey: "wallet", tone: "mint", value: () => formatUsd(actual), spec: { measures: [{ field: "paymentActualUsd", agg: "sum" }], source: "export-target", ignoreFilters: ["*"] } }),
      exportCard({ id: "remaining", title: "Sisa Target Penerimaan", icon: Calendar03Icon, iconKey: "calendar", tone: "coral", highlight: true, value: () => formatUsd(Math.max(0, target - actual)), spec: { measures: [{ field: "paymentActualUsd", agg: "sum" }], source: "export-target", compute: "remaining", target: { field: "paymentTargetUsd" }, ignoreFilters: ["*"] } }),
      exportCard({ id: "open", title: "Piutang Terbuka", icon: Invoice03Icon, iconKey: "invoice", tone: "sun", value: (records) => formatUsd(total(open(records), (record) => record.usdValue)), spec: { field: "outstandingUsd", agg: "sum" } }),
      exportPanel({
        id: "forecast",
        title: "Prognosa Penerimaan: Target vs Realisasi Bulanan (USD)",
        w: 12,
        h: 6,
        spec: {
          ...trendSpec([
            { field: "paymentTargetUsd", color: "turquoise", label: "Target" },
            { field: "paymentActualUsd", color: "teal", label: "Realisasi" },
          ]),
          source: "export-target",
          ignoreFilters: ["*"],
        },
        children: () => (
          <TrendChart
            points={points}
            series={[
              { key: "paymentTarget", label: "Target", color: "#4ECDC4" },
              { key: "paymentActual", label: "Realisasi", color: "#174D55" },
            ]}
            valueFormatter={formatUsd}
          />
        ),
      }),
      openByCompany(6),
      aging("coral"),
    ];
  } else {
    widgets = [
      { id: "notice", title: "Catatan sumber data", kind: "panel", w: 12, h: 2, render: () => <SourceNotice>Workbook tidak memiliki sheet KPI 2026. Prognosa di bawah dihitung dari kolom Rencana Bayar pada sheet detail; target penerimaan tidak tersedia.</SourceNotice> },
      exportCard({ id: "open", title: "Piutang Terbuka", icon: Invoice03Icon, iconKey: "invoice", tone: "turquoise", highlight: true, value: (records) => formatUsd(total(open(records), (record) => record.usdValue)), spec: { field: "outstandingUsd", agg: "sum" } }),
      exportCard({ id: "planned", title: "Sudah Ada Rencana Bayar", icon: Calendar03Icon, iconKey: "calendar", tone: "mint", value: (records) => formatUsd(total(open(records).filter((record) => record.plannedPaymentDate), (record) => record.usdValue)), spec: { measures: [{ field: "usdValue", agg: "sum" }], filters: [...openRule, { field: "paymentPlan", op: "in", values: ["Ada rencana"] }] } }),
      exportCard({ id: "unplanned", title: "Belum Ada Rencana Bayar", icon: Wallet01Icon, iconKey: "wallet", tone: "coral", value: (records) => formatUsd(total(open(records).filter((record) => !record.plannedPaymentDate), (record) => record.usdValue)), spec: { measures: [{ field: "usdValue", agg: "sum" }], filters: [...openRule, { field: "paymentPlan", op: "in", values: ["Belum ada rencana"] }] } }),
      exportCard({ id: "open-count", title: "Invoice Terbuka", icon: Xls01Icon, iconKey: "sheet", tone: "sun", value: (records) => open(records).length.toLocaleString("id-ID"), spec: { measures: [{ field: "count", agg: "count" }], filters: openRule } }),
      exportPanel({
        id: "planned-by-month",
        title: "Prognosa Penerimaan berdasarkan Rencana Bayar (USD)",
        w: 6,
        h: 5,
        spec: { chart: "bar-h", dimension: "plannedPaymentMonth", measures: [{ field: "usdValue", agg: "sum" }], sort: "label", limit: 12, filters: [...openRule, { field: "paymentPlan", op: "in", values: ["Ada rencana"] }] },
        children: (records) => (
          <HorizontalBars
            items={rankRecords(
              open(records).filter((record) => record.plannedPaymentDate),
              (record) => record.plannedPaymentDate?.slice(0, 7) ?? "Tanpa Rencana",
              (record) => record.usdValue,
              12,
            ).sort((left, right) => left.label.localeCompare(right.label))}
            formatValue={formatUsd}
            emptyText="Tanggal Rencana Bayar tidak tersedia pada filter ini"
          />
        ),
      }),
      aging(undefined),
      openByCompany(12),
    ];
  }
  return widgets;
}

export function ForecastView({ kpi, ...props }: ExportCanvasProps & { kpi: ExportKpiSummary | null }) {
  const builtins = useMemo(() => forecastBuiltins(kpi), [kpi]);
  return <DashboardCanvas builtins={builtins} primarySource="export" {...props} />;
}
