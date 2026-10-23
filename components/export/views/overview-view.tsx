import { DollarCircleIcon, Invoice03Icon, ShipIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { DashboardCanvas } from "@/components/dashboard-canvas/canvas";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { TrendChart } from "@/components/export/trend-chart";
import { exportCard, exportPanel, rankSpec, trendSpec } from "@/components/export/views/widgets";
import type { ExportCanvasProps } from "@/components/export/views/types";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { isPaid, monthlyPoints, rankRecords, total } from "@/lib/export-dashboard-data";

const builtins: BuiltinWidget[] = [
  exportCard({ id: "total-sales", title: "Total Penjualan", icon: DollarCircleIcon, iconKey: "dollar", tone: "turquoise", highlight: true, value: (records) => formatUsd(total(records, (record) => record.usdValue)), spec: { field: "usdValue", agg: "sum" } }),
  exportCard({ id: "total-tonnage", title: "Total Tonase", icon: ShipIcon, iconKey: "ship", tone: "mint", value: (records) => formatTonnage(total(records, (record) => record.tonnage)), spec: { field: "tonnage", agg: "sum" } }),
  exportCard({ id: "payments", title: "Penerimaan", icon: Wallet01Icon, iconKey: "wallet", tone: "coral", value: (records) => formatUsd(total(records.filter(isPaid), (record) => record.usdValue)), spec: { field: "paidUsd", agg: "sum" } }),
  exportCard({ id: "outstanding", title: "Piutang Terbuka", icon: Invoice03Icon, iconKey: "invoice", tone: "sun", value: (records) => formatUsd(total(records.filter((record) => !isPaid(record)), (record) => record.usdValue)), spec: { field: "outstandingUsd", agg: "sum" } }),
  exportPanel({
    id: "trend",
    title: "Tren Penjualan, Penerimaan, dan Piutang (USD)",
    w: 8,
    w24: 15,
    h: 6,
    spec: trendSpec([
      { field: "usdValue", color: "sun", label: "Penjualan" },
      { field: "paidUsd", color: "teal", label: "Penerimaan" },
      { field: "outstandingUsd", color: "coral", label: "Piutang" },
    ]),
    children: (records) => (
      <TrendChart
        points={monthlyPoints(records)}
        series={[
          { key: "sales", label: "Penjualan", color: "#FFE66D" },
          { key: "payment", label: "Penerimaan", color: "#174D55" },
          { key: "outstanding", label: "Piutang", color: "#FF6B6B" },
        ]}
        valueFormatter={formatUsd}
      />
    ),
  }),
  exportPanel({
    id: "by-company",
    title: "Penjualan per Operating Company (USD)",
    w: 4,
    w24: 9,
    h: 6,
    spec: rankSpec("companyCode", "usdValue", 8),
    children: (records) => <HorizontalBars items={rankRecords(records, (record) => record.companyCode, (record) => record.usdValue)} formatValue={formatUsd} />,
  }),
  exportPanel({
    id: "top-destinations",
    title: "Tujuan Ekspor Terbesar (USD)",
    w: 6,
    h: 5,
    spec: rankSpec("destination", "usdValue", 6, "coral"),
    children: (records) => <HorizontalBars items={rankRecords(records, (record) => record.destination, (record) => record.usdValue, 6)} formatValue={formatUsd} tone="coral" />,
  }),
  exportPanel({
    id: "products",
    title: "Produk Ekspor (MT)",
    w: 6,
    h: 5,
    spec: rankSpec("product", "tonnage", 6, "sun"),
    children: (records) => <HorizontalBars items={rankRecords(records, (record) => record.product, (record) => record.tonnage, 6)} formatValue={formatTonnage} tone="yellow" />,
  }),
];

export function OverviewView(props: ExportCanvasProps) {
  return <DashboardCanvas builtins={builtins} primarySource="export" {...props} />;
}
