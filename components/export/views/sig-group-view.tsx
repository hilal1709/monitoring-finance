import { DollarSign, ReceiptText, Ship, Wallet } from "lucide-react";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { isPaid, rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportRecord } from "@/lib/export-dashboard-types";

export function SigGroupView({ records, periodLabel }: { records: ExportRecord[]; periodLabel: string }) {
  const companies = rankRecords(records, (record) => record.companyCode, (record) => record.usdValue, 10);

  return (
    <>
      <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ExportKpi title={`Penjualan ${periodLabel}`} value={formatUsd(total(records, (record) => record.usdValue))} icon={DollarSign} />
        <ExportKpi title={`Tonase ${periodLabel}`} value={formatTonnage(total(records, (record) => record.tonnage))} icon={Ship} accent="cyan" />
        <ExportKpi title={`Penerimaan ${periodLabel}`} value={formatUsd(total(records.filter(isPaid), (record) => record.usdValue))} icon={Wallet} accent="emerald" />
        <ExportKpi title={`Piutang ${periodLabel}`} value={formatUsd(total(records.filter((record) => !isPaid(record)), (record) => record.usdValue))} icon={ReceiptText} accent="red" />
      </div>
      <div data-animate-card className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {companies.map((company) => {
          const companyRecords = records.filter((record) => record.companyCode === company.label);
          return (
            <section key={company.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <h3 className="text-lg font-black text-[#ffd166]">{company.label}</h3>
              <dl className="mt-3 grid gap-2 text-xs">
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted-fg)]">Penjualan</dt><dd className="font-bold">{formatUsd(company.value)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted-fg)]">Penerimaan</dt><dd className="font-bold text-[#70f0bf]">{formatUsd(total(companyRecords.filter(isPaid), (record) => record.usdValue))}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted-fg)]">Piutang</dt><dd className="font-bold text-[#ff9f8e]">{formatUsd(total(companyRecords.filter((record) => !isPaid(record)), (record) => record.usdValue))}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted-fg)]">Tonase</dt><dd className="font-bold">{formatTonnage(total(companyRecords, (record) => record.tonnage))}</dd></div>
              </dl>
            </section>
          );
        })}
      </div>
      <ChartPanel data-animate-card title={`Perbandingan Company ${periodLabel} (USD)`}>
        <HorizontalBars items={companies} formatValue={formatUsd} />
      </ChartPanel>
    </>
  );
}
