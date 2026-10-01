import { DollarCircleIcon, Invoice03Icon, ShipIcon } from "@hugeicons/core-free-icons";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { SourceNotice } from "@/components/export/source-notice";
import { formatIdr } from "@/lib/export-dashboard-format";
import { rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportViewRecord } from "@/lib/export-dashboard-types";

export function DemurrageView({ records }: { records: ExportViewRecord[] }) {
  const withImpact = records.filter((record) => record.exchangeImpact !== 0);

  return (
    <>
      <SourceNotice data-animate-card>Workbook tidak memiliki kolom demurrage/despatch. Agar halaman tetap berguna tanpa membuat angka palsu, visual di bawah hanya menampilkan data selisih kurs yang memang tersedia.</SourceNotice>
      <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <ExportKpi title="Dampak Selisih Kurs" value={formatIdr(total(withImpact, (record) => record.exchangeImpact))} icon={DollarCircleIcon} highlight />
        <ExportKpi title="Transaksi dengan Selisih" value={withImpact.length.toLocaleString("id-ID")} icon={Invoice03Icon} accent="cyan" />
        <ExportKpi title="Company Terdampak" value={new Set(withImpact.map((record) => record.companyCode)).size.toLocaleString("id-ID")} icon={ShipIcon} accent="emerald" />
      </div>
      <div data-animate-card className="grid gap-2 lg:grid-cols-2">
        <ChartPanel title="Dampak Selisih Kurs per Company (IDR)">
          <HorizontalBars items={rankRecords(withImpact, (record) => record.companyCode, (record) => record.exchangeImpact)} formatValue={formatIdr} />
        </ChartPanel>
        <ChartPanel title="Dampak Selisih Kurs per Buyer (IDR)">
          <HorizontalBars items={rankRecords(withImpact, (record) => record.buyer, (record) => record.exchangeImpact, 8)} formatValue={formatIdr} tone="coral" />
        </ChartPanel>
      </div>
    </>
  );
}
