"use client";

import { Xls01Icon, ShipIcon, Target02Icon, ChartLineData01Icon } from "@hugeicons/core-free-icons";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { SourceNotice } from "@/components/export/source-notice";
import { TrendChart } from "@/components/export/trend-chart";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { monthlyPoints, rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportKpiSummary, ExportViewRecord } from "@/lib/export-dashboard-types";

type KpiBarPoint = {
  label: string;
  value: number;
  count: number;
};

function kpiComparisonBars(kpi: ExportKpiSummary, field: "sales" | "payment"): KpiBarPoint[] {
  return kpi.months.map((month) => ({
    label: month.label,
    value: field === "sales" ? month.salesActualUsd : month.paymentActualUsd,
    count: 0,
  }));
}

function kpiRatio(actual: number, target: number) {
  return target ? (actual / target) * 100 : 0;
}

function kpiRealisasiPct(actual: number, target: number) {
  if (!target) return "-";
  return `${Math.round(kpiRatio(actual, target))}%`;
}

export function RkapView({ records, kpi }: { records: ExportViewRecord[]; kpi: ExportKpiSummary | null }) {
  const byYear = rankRecords(records, (record) => record.periodKey.slice(0, 4), (record) => record.usdValue, 10)
    .sort((left, right) => left.label.localeCompare(right.label));

  // Aggregate KPI totals dari sheet KPI 2026 jika tersedia
  const totalSalesTarget = kpi ? kpi.months.reduce((sum, m) => sum + m.salesTargetUsd, 0) : 0;
  const totalSalesActual = kpi ? kpi.months.reduce((sum, m) => sum + m.salesActualUsd, 0) : 0;
  const totalPaymentTarget = kpi ? kpi.months.reduce((sum, m) => sum + m.paymentTargetUsd, 0) : 0;
  const totalPaymentActual = kpi ? kpi.months.reduce((sum, m) => sum + m.paymentActualUsd, 0) : 0;

  const monthly = monthlyPoints(records);

  // Gabungkan monthly actual dari records dengan target dari KPI sheet
  const kpiMonthlyPoints = monthly.map((pt) => {
    const kpiMonth = kpi?.months.find((m) => m.periodKey === pt.key);
    return {
      ...pt,
      salesTarget: kpiMonth?.salesTargetUsd ?? 0,
      paymentTarget: kpiMonth?.paymentTargetUsd ?? 0,
    };
  });

  if (kpi) {
    return (
      <>
        <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ExportKpi title="Target Penjualan" value={formatUsd(totalSalesTarget)} icon={Target02Icon} />
          <ExportKpi title="Realisasi Penjualan" value={formatUsd(totalSalesActual)} icon={ChartLineData01Icon} accent="cyan" />
          <ExportKpi title="Target Penerimaan" value={formatUsd(totalPaymentTarget)} icon={Target02Icon} accent="emerald" />
          <ExportKpi title="Realisasi Penerimaan" value={formatUsd(totalPaymentActual)} icon={ShipIcon} accent="red" />
        </div>

        <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ExportKpi title="% Realisasi Penjualan" value={kpiRealisasiPct(totalSalesActual, totalSalesTarget)} icon={Target02Icon} gauge={kpiRatio(totalSalesActual, totalSalesTarget)} highlight />
          <ExportKpi title="% Realisasi Penerimaan" value={kpiRealisasiPct(totalPaymentActual, totalPaymentTarget)} icon={ChartLineData01Icon} accent="cyan" gauge={kpiRatio(totalPaymentActual, totalPaymentTarget)} />
          <ExportKpi title="Actual Tonase" value={formatTonnage(total(records, (record) => record.tonnage))} icon={ShipIcon} accent="emerald" />
          <ExportKpi title="Jumlah Transaksi" value={records.length.toLocaleString("id-ID")} icon={Xls01Icon} accent="red" />
        </div>

        <div data-animate-card className="grid gap-2 lg:grid-cols-2">
          <ChartPanel title="Penjualan: Target vs Realisasi Bulanan (USD)">
            <TrendChart
              points={kpiMonthlyPoints}
              series={[
                { key: "salesTarget", label: "Target", color: "#4ECDC4" },
                { key: "sales", label: "Realisasi", color: "#FFE66D" },
              ]}
              valueFormatter={formatUsd}
            />
          </ChartPanel>
          <ChartPanel title="Penerimaan: Target vs Realisasi Bulanan (USD)">
            <TrendChart
              points={kpiMonthlyPoints}
              series={[
                { key: "paymentTarget", label: "Target", color: "#4ECDC4" },
                { key: "payment", label: "Realisasi", color: "#174D55" },
              ]}
              valueFormatter={formatUsd}
            />
          </ChartPanel>
        </div>

        <div data-animate-card className="grid gap-2 lg:grid-cols-2">
          <ChartPanel title="Actual Penjualan per Tahun (USD)">
            <HorizontalBars items={byYear} formatValue={formatUsd} tone="yellow" />
          </ChartPanel>
          <ChartPanel title="Actual Penjualan per Company (USD)">
            <HorizontalBars items={rankRecords(records, (record) => record.companyCode, (record) => record.usdValue)} formatValue={formatUsd} />
          </ChartPanel>
        </div>
      </>
    );
  }

  return (
    <>
      <SourceNotice data-animate-card>Workbook tidak memiliki sheet KPI 2026. Grafik di bawah menampilkan actual ekspor dari sheet Data Gab/Data Ekspor; target tidak tersedia.</SourceNotice>
      <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <ExportKpi title="Actual Penjualan" value={formatUsd(total(records, (record) => record.usdValue))} icon={Target02Icon} highlight />
        <ExportKpi title="Actual Tonase" value={formatTonnage(total(records, (record) => record.tonnage))} icon={ShipIcon} accent="cyan" />
        <ExportKpi title="Jumlah Transaksi" value={records.length.toLocaleString("id-ID")} icon={Xls01Icon} accent="emerald" />
      </div>
      <div data-animate-card className="grid gap-2 lg:grid-cols-2">
        <ChartPanel title="Actual Penjualan per Tahun (USD)">
          <HorizontalBars items={byYear} formatValue={formatUsd} />
        </ChartPanel>
        <ChartPanel title="Actual Penjualan per Company (USD)">
          <HorizontalBars items={rankRecords(records, (record) => record.companyCode, (record) => record.usdValue)} formatValue={formatUsd} />
        </ChartPanel>
      </div>
      <ChartPanel data-animate-card title="Actual Ekspor Bulanan (USD)">
        <TrendChart points={monthly} series={[{ key: "sales", label: "Actual", color: "#FFE66D" }]} valueFormatter={formatUsd} />
      </ChartPanel>
    </>
  );
}
