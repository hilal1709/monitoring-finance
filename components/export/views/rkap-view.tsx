"use client";

import { FileSpreadsheet, Ship, Target, TrendingUp } from "lucide-react";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { SourceNotice } from "@/components/export/source-notice";
import { TrendChart } from "@/components/export/trend-chart";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { monthlyPoints, rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportKpiSummary, ExportRecord } from "@/lib/export-dashboard-types";

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

function kpiRealisasiPct(actual: number, target: number) {
  if (!target) return "-";
  return `${Math.round((actual / target) * 100)}%`;
}

export function RkapView({ records, kpi }: { records: ExportRecord[]; kpi: ExportKpiSummary | null }) {
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
          <ExportKpi title="Target Penjualan" value={formatUsd(totalSalesTarget)} icon={Target} />
          <ExportKpi title="Realisasi Penjualan" value={formatUsd(totalSalesActual)} icon={TrendingUp} accent="cyan" />
          <ExportKpi title="Target Penerimaan" value={formatUsd(totalPaymentTarget)} icon={Target} accent="emerald" />
          <ExportKpi title="Realisasi Penerimaan" value={formatUsd(totalPaymentActual)} icon={Ship} accent="red" />
        </div>

        <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ExportKpi title="% Realisasi Penjualan" value={kpiRealisasiPct(totalSalesActual, totalSalesTarget)} icon={Target} />
          <ExportKpi title="% Realisasi Penerimaan" value={kpiRealisasiPct(totalPaymentActual, totalPaymentTarget)} icon={TrendingUp} accent="cyan" />
          <ExportKpi title="Actual Tonase" value={formatTonnage(total(records, (record) => record.tonnage))} icon={Ship} accent="emerald" />
          <ExportKpi title="Jumlah Transaksi" value={records.length.toLocaleString("id-ID")} icon={FileSpreadsheet} accent="red" />
        </div>

        <div data-animate-card className="grid gap-2 lg:grid-cols-2">
          <ChartPanel title="Penjualan: Target vs Realisasi Bulanan (USD)">
            <TrendChart
              points={kpiMonthlyPoints}
              series={[
                { key: "salesTarget", label: "Target", color: "#7dd3fc" },
                { key: "sales", label: "Realisasi", color: "#ffd166" },
              ]}
              valueFormatter={formatUsd}
            />
          </ChartPanel>
          <ChartPanel title="Penerimaan: Target vs Realisasi Bulanan (USD)">
            <TrendChart
              points={kpiMonthlyPoints}
              series={[
                { key: "paymentTarget", label: "Target", color: "#7dd3fc" },
                { key: "payment", label: "Realisasi", color: "#70f0bf" },
              ]}
              valueFormatter={formatUsd}
            />
          </ChartPanel>
        </div>

        <div data-animate-card className="grid gap-2 lg:grid-cols-2">
          <ChartPanel title="Actual Penjualan per Tahun (USD)">
            <HorizontalBars items={byYear} formatValue={formatUsd} />
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
        <ExportKpi title="Actual Penjualan" value={formatUsd(total(records, (record) => record.usdValue))} icon={Target} />
        <ExportKpi title="Actual Tonase" value={formatTonnage(total(records, (record) => record.tonnage))} icon={Ship} accent="cyan" />
        <ExportKpi title="Jumlah Transaksi" value={records.length.toLocaleString("id-ID")} icon={FileSpreadsheet} accent="emerald" />
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
        <TrendChart points={monthly} series={[{ key: "sales", label: "Actual", color: "#ffd166" }]} valueFormatter={formatUsd} />
      </ChartPanel>
    </>
  );
}
