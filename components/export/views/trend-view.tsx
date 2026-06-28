import { BarChart3, DollarSign, Ship, Wallet } from "lucide-react";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { TrendChart } from "@/components/export/trend-chart";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { monthlyPoints, rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportRecord } from "@/lib/export-dashboard-types";

export function TrendView({ records }: { records: ExportRecord[] }) {
  const monthly = monthlyPoints(records);

  return (
    <>
      <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ExportKpi title="Penjualan" value={formatUsd(total(records, (record) => record.usdValue))} icon={DollarSign} />
        <ExportKpi title="Volume Ekspor" value={formatTonnage(total(records, (record) => record.tonnage))} icon={Ship} accent="cyan" />
        <ExportKpi title="Jumlah Buyer" value={new Set(records.map((record) => record.buyer)).size.toLocaleString("id-ID")} icon={Wallet} accent="emerald" />
        <ExportKpi title="Jumlah Kapal" value={new Set(records.map((record) => record.vesselName)).size.toLocaleString("id-ID")} icon={BarChart3} accent="red" />
      </div>
      <div data-animate-card className="grid gap-2 lg:grid-cols-2">
        <ChartPanel title="Tren Nilai Ekspor Bulanan (USD)">
          <TrendChart points={monthly} series={[{ key: "sales", label: "Nilai Ekspor", color: "#ffd166" }]} valueFormatter={formatUsd} />
        </ChartPanel>
        <ChartPanel title="Tren Volume Ekspor Bulanan (MT)">
          <TrendChart points={monthly} series={[{ key: "tonnage", label: "Tonase", color: "#70f0bf" }]} valueFormatter={formatTonnage} />
        </ChartPanel>
      </div>
      <div data-animate-card className="grid gap-2 lg:grid-cols-2">
        <ChartPanel title="Tren Produk berdasarkan Volume (MT)">
          <HorizontalBars items={rankRecords(records, (record) => record.product, (record) => record.tonnage, 6)} formatValue={formatTonnage} />
        </ChartPanel>
        <ChartPanel title="Kontribusi Company (USD)">
          <HorizontalBars items={rankRecords(records, (record) => record.companyCode, (record) => record.usdValue)} formatValue={formatUsd} />
        </ChartPanel>
      </div>
    </>
  );
}
