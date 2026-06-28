import { DollarSign, MapPin, Ship, Target } from "lucide-react";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportRecord } from "@/lib/export-dashboard-types";

export function DestinationsView({ records }: { records: ExportRecord[] }) {
  const destinations = rankRecords(records, (record) => record.destination, (record) => record.usdValue, 10);

  return (
    <>
      <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ExportKpi title="Jumlah Tujuan" value={new Set(records.map((record) => record.destination)).size.toLocaleString("id-ID")} icon={MapPin} />
        <ExportKpi title="Nilai Ekspor" value={formatUsd(total(records, (record) => record.usdValue))} icon={DollarSign} accent="cyan" />
        <ExportKpi title="Volume Ekspor" value={formatTonnage(total(records, (record) => record.tonnage))} icon={Ship} accent="emerald" />
        <ExportKpi title="Top Tujuan" value={destinations[0]?.label ?? "-"} icon={Target} accent="red" />
      </div>
      <div data-animate-card className="grid gap-2 lg:grid-cols-2">
        <ChartPanel title="Tujuan Ekspor berdasarkan Nilai (USD)">
          <HorizontalBars items={destinations} formatValue={formatUsd} />
        </ChartPanel>
        <ChartPanel title="Tujuan Ekspor berdasarkan Volume (MT)">
          <HorizontalBars items={rankRecords(records, (record) => record.destination, (record) => record.tonnage, 10)} formatValue={formatTonnage} />
        </ChartPanel>
      </div>
      <div data-animate-card className="grid gap-2 lg:grid-cols-2">
        <ChartPanel title="Buyer Ekspor Terbesar (USD)">
          <HorizontalBars items={rankRecords(records, (record) => record.buyer, (record) => record.usdValue, 7)} formatValue={formatUsd} />
        </ChartPanel>
        <ChartPanel title="Produk per Tujuan (MT)">
          <HorizontalBars items={rankRecords(records, (record) => record.product, (record) => record.tonnage, 7)} formatValue={formatTonnage} />
        </ChartPanel>
      </div>
    </>
  );
}
