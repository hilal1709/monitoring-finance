import { ChartHistogramIcon, DollarCircleIcon, ShipIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { DashboardCanvas } from "@/components/dashboard-canvas/canvas";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { TrendChart } from "@/components/export/trend-chart";
import { exportCard, exportPanel, rankSpec, trendSpec } from "@/components/export/views/widgets";
import type { ExportCanvasProps } from "@/components/export/views/types";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { monthlyPoints, rankRecords, total } from "@/lib/export-dashboard-data";

const builtins: BuiltinWidget[] = [
  exportCard({ id: "sales", title: "Penjualan", icon: DollarCircleIcon, iconKey: "dollar", tone: "turquoise", highlight: true, value: (records) => formatUsd(total(records, (record) => record.usdValue)), spec: { field: "usdValue", agg: "sum" } }),
  exportCard({ id: "volume", title: "Volume Ekspor", icon: ShipIcon, iconKey: "ship", tone: "mint", value: (records) => formatTonnage(total(records, (record) => record.tonnage)), spec: { field: "tonnage", agg: "sum" } }),
  exportCard({ id: "buyers", title: "Jumlah Buyer", icon: Wallet01Icon, iconKey: "wallet", tone: "coral", value: (records) => new Set(records.map((record) => record.buyer)).size.toLocaleString("id-ID"), spec: { field: "buyer", agg: "distinct" } }),
  exportCard({ id: "vessels", title: "Jumlah Kapal", icon: ChartHistogramIcon, iconKey: "chart", tone: "sun", value: (records) => new Set(records.map((record) => record.vesselName)).size.toLocaleString("id-ID"), spec: { field: "vesselName", agg: "distinct" } }),
  exportPanel({
    id: "sales-trend",
    title: "Tren Nilai Ekspor Bulanan (USD)",
    w: 6,
    h: 6,
    spec: trendSpec([{ field: "usdValue", color: "sun", label: "Nilai Ekspor" }]),
    children: (records) => <TrendChart points={monthlyPoints(records)} series={[{ key: "sales", label: "Nilai Ekspor", color: "#FFE66D" }]} valueFormatter={formatUsd} />,
  }),
  exportPanel({
    id: "volume-trend",
    title: "Tren Volume Ekspor Bulanan (MT)",
    w: 6,
    h: 6,
    spec: trendSpec([{ field: "tonnage", color: "teal", label: "Tonase" }]),
    children: (records) => <TrendChart points={monthlyPoints(records)} series={[{ key: "tonnage", label: "Tonase", color: "#174D55" }]} valueFormatter={formatTonnage} />,
  }),
  exportPanel({
    id: "products",
    title: "Tren Produk berdasarkan Volume (MT)",
    w: 6,
    h: 5,
    spec: rankSpec("product", "tonnage", 6, "sun"),
    children: (records) => <HorizontalBars items={rankRecords(records, (record) => record.product, (record) => record.tonnage, 6)} formatValue={formatTonnage} tone="yellow" />,
  }),
  exportPanel({
    id: "companies",
    title: "Kontribusi Company (USD)",
    w: 6,
    h: 5,
    spec: rankSpec("companyCode", "usdValue", 8),
    children: (records) => <HorizontalBars items={rankRecords(records, (record) => record.companyCode, (record) => record.usdValue)} formatValue={formatUsd} />,
  }),
];

export function TrendView(props: ExportCanvasProps) {
  return <DashboardCanvas builtins={builtins} primarySource="export" {...props} />;
}
