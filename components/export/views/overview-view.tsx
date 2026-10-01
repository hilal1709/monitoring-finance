import { DollarCircleIcon, Invoice03Icon, ShipIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { ChartPanel } from "@/components/export/chart-panel";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { TrendChart } from "@/components/export/trend-chart";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { isPaid, monthlyPoints, rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportViewRecord } from "@/lib/export-dashboard-types";

export function OverviewView({ records }: { records: ExportViewRecord[] }) {
  const monthly = monthlyPoints(records);
  const paid = records.filter(isPaid);
  const open = records.filter((record) => !isPaid(record));

  return (
    <>
      <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ExportKpi title="Total Penjualan" value={formatUsd(total(records, (record) => record.usdValue))} icon={DollarCircleIcon} />
        <ExportKpi title="Total Tonase" value={formatTonnage(total(records, (record) => record.tonnage))} icon={ShipIcon} accent="cyan" />
        <ExportKpi title="Penerimaan" value={formatUsd(total(paid, (record) => record.usdValue))} icon={Wallet01Icon} accent="emerald" />
        <ExportKpi title="Piutang Terbuka" value={formatUsd(total(open, (record) => record.usdValue))} icon={Invoice03Icon} accent="red" />
      </div>
      <div data-animate-card className="grid gap-2 lg:grid-cols-[1.45fr_0.8fr]">
        <ChartPanel title="Tren Penjualan, Penerimaan, dan Piutang (USD)">
          <TrendChart
            points={monthly}
            series={[
              { key: "sales", label: "Penjualan", color: "#FFE66D" },
              { key: "payment", label: "Penerimaan", color: "#174D55" },
              { key: "outstanding", label: "Piutang", color: "#FF6B6B" },
            ]}
            valueFormatter={formatUsd}
          />
        </ChartPanel>
        <ChartPanel title="Penjualan per Operating Company (USD)">
          <HorizontalBars items={rankRecords(records, (record) => record.companyCode, (record) => record.usdValue)} formatValue={formatUsd} />
        </ChartPanel>
      </div>
      <div data-animate-card className="grid gap-2 lg:grid-cols-2">
        <ChartPanel title="Tujuan Ekspor Terbesar (USD)">
          <HorizontalBars items={rankRecords(records, (record) => record.destination, (record) => record.usdValue, 6)} formatValue={formatUsd} tone="coral" />
        </ChartPanel>
        <ChartPanel title="Produk Ekspor (MT)">
          <HorizontalBars items={rankRecords(records, (record) => record.product, (record) => record.tonnage, 6)} formatValue={formatTonnage} tone="yellow" />
        </ChartPanel>
      </div>
    </>
  );
}
