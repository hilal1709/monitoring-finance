import { FileSpreadsheet, Ship, Target } from "lucide-react";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { SourceNotice } from "@/components/export/source-notice";
import { TrendChart } from "@/components/export/trend-chart";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { monthlyPoints, rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportRecord } from "@/lib/export-dashboard-types";

export function RkapView({ records }: { records: ExportRecord[] }) {
  const byYear = rankRecords(records, (record) => record.periodKey.slice(0, 4), (record) => record.usdValue, 10)
    .sort((left, right) => left.label.localeCompare(right.label));

  return (
    <>
      <SourceNotice data-animate-card>Workbook tidak memiliki kolom target RKAP. Grafik di bawah menampilkan actual ekspor dari sheet Data Ekspor; target tidak dihitung atau direkayasa.</SourceNotice>
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
        <TrendChart points={monthlyPoints(records)} series={[{ key: "sales", label: "Actual", color: "#ffd166" }]} valueFormatter={formatUsd} />
      </ChartPanel>
    </>
  );
}
