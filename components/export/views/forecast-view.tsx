import { CalendarDays, FileSpreadsheet, ReceiptText, Target, Wallet } from "lucide-react";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { SourceNotice } from "@/components/export/source-notice";
import { TrendChart } from "@/components/export/trend-chart";
import { formatUsd } from "@/lib/export-dashboard-format";
import { isPaid, rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportKpiSummary, ExportRecord } from "@/lib/export-dashboard-types";

export function ForecastView({ records, kpi }: { records: ExportRecord[]; kpi: ExportKpiSummary | null }) {
  const open = records.filter((record) => !isPaid(record));
  const planned = open.filter((record) => record.plannedPaymentDate);
  const plannedByMonth = rankRecords(
    planned,
    (record) => record.plannedPaymentDate?.slice(0, 7) ?? "Tanpa Rencana",
    (record) => record.usdValue,
    12,
  ).sort((left, right) => left.label.localeCompare(right.label));

  // Prognosa penerimaan dari sheet KPI 2026: target vs realisasi per bulan.
  const kpiPaymentPoints = kpi
    ? kpi.months.map((month) => ({
        key: month.periodKey,
        label: month.label,
        paymentTarget: month.paymentTargetUsd,
        paymentActual: month.paymentActualUsd,
      }))
    : [];
  const totalPaymentTarget = kpi ? kpi.months.reduce((sum, month) => sum + month.paymentTargetUsd, 0) : 0;
  const totalPaymentActual = kpi ? kpi.months.reduce((sum, month) => sum + month.paymentActualUsd, 0) : 0;
  const sisaTargetPenerimaan = Math.max(0, totalPaymentTarget - totalPaymentActual);

  return (
    <>
      {kpi ? (
        <>
          <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ExportKpi title="Target Penerimaan (KPI 2026)" value={formatUsd(totalPaymentTarget)} icon={Target} />
            <ExportKpi title="Realisasi Penerimaan" value={formatUsd(totalPaymentActual)} icon={Wallet} accent="emerald" />
            <ExportKpi title="Sisa Target Penerimaan" value={formatUsd(sisaTargetPenerimaan)} icon={CalendarDays} accent="cyan" />
            <ExportKpi title="Piutang Terbuka" value={formatUsd(total(open, (record) => record.usdValue))} icon={ReceiptText} accent="red" />
          </div>
          <ChartPanel data-animate-card title="Prognosa Penerimaan: Target vs Realisasi Bulanan (USD)">
            <TrendChart
              points={kpiPaymentPoints}
              series={[
                { key: "paymentTarget", label: "Target", color: "#7dd3fc" },
                { key: "paymentActual", label: "Realisasi", color: "#70f0bf" },
              ]}
              valueFormatter={formatUsd}
            />
          </ChartPanel>
          <div data-animate-card className="grid gap-2 lg:grid-cols-2">
            <ChartPanel title="Piutang Terbuka per Company (USD)">
              <HorizontalBars items={rankRecords(open, (record) => record.companyCode, (record) => record.usdValue)} formatValue={formatUsd} />
            </ChartPanel>
            <ChartPanel title="Aging Piutang Terbuka (USD)">
              <HorizontalBars items={rankRecords(open, (record) => record.agingBucket, (record) => record.usdValue, 8)} formatValue={formatUsd} />
            </ChartPanel>
          </div>
        </>
      ) : (
        <>
          <SourceNotice data-animate-card>Workbook tidak memiliki sheet KPI 2026. Prognosa di bawah dihitung dari kolom Rencana Bayar pada sheet detail; target penerimaan tidak tersedia.</SourceNotice>
          <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ExportKpi title="Piutang Terbuka" value={formatUsd(total(open, (record) => record.usdValue))} icon={ReceiptText} accent="red" />
            <ExportKpi title="Sudah Ada Rencana Bayar" value={formatUsd(total(planned, (record) => record.usdValue))} icon={CalendarDays} />
            <ExportKpi title="Belum Ada Rencana Bayar" value={formatUsd(total(open.filter((record) => !record.plannedPaymentDate), (record) => record.usdValue))} icon={Wallet} accent="cyan" />
            <ExportKpi title="Invoice Terbuka" value={open.length.toLocaleString("id-ID")} icon={FileSpreadsheet} accent="emerald" />
          </div>
          <div data-animate-card className="grid gap-2 lg:grid-cols-2">
            <ChartPanel title="Prognosa Penerimaan berdasarkan Rencana Bayar (USD)">
              <HorizontalBars items={plannedByMonth} formatValue={formatUsd} emptyText="Tanggal Rencana Bayar tidak tersedia pada filter ini" />
            </ChartPanel>
            <ChartPanel title="Aging Piutang Terbuka (USD)">
              <HorizontalBars items={rankRecords(open, (record) => record.agingBucket, (record) => record.usdValue, 8)} formatValue={formatUsd} />
            </ChartPanel>
          </div>
          <ChartPanel data-animate-card title="Piutang Terbuka per Company (USD)">
            <HorizontalBars items={rankRecords(open, (record) => record.companyCode, (record) => record.usdValue)} formatValue={formatUsd} />
          </ChartPanel>
        </>
      )}
    </>
  );
}
