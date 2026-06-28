import { CalendarDays, FileSpreadsheet, ReceiptText, Wallet } from "lucide-react";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { formatUsd } from "@/lib/export-dashboard-format";
import { isPaid, rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportRecord } from "@/lib/export-dashboard-types";

export function ForecastView({ records }: { records: ExportRecord[] }) {
  const open = records.filter((record) => !isPaid(record));
  const planned = open.filter((record) => record.plannedPaymentDate);
  const plannedByMonth = rankRecords(
    planned,
    (record) => record.plannedPaymentDate?.slice(0, 7) ?? "Tanpa Rencana",
    (record) => record.usdValue,
    12,
  ).sort((left, right) => left.label.localeCompare(right.label));

  return (
    <>
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
  );
}
