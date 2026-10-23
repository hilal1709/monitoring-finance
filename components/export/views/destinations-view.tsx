"use client";

import { useMemo, useState } from "react";
import { DollarCircleIcon, Location01Icon, ShipIcon, Target02Icon } from "@hugeicons/core-free-icons";
import { DashboardCanvas } from "@/components/dashboard-canvas/canvas";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { ChartPanel } from "@/components/export/chart-panel";
import { DestinationMap } from "@/components/export/destination-map";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { asExport, exportCard, exportPanel, rankSpec } from "@/components/export/views/widgets";
import type { ExportCanvasProps } from "@/components/export/views/types";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { rankRecords, total } from "@/lib/export-dashboard-data";
import { aggregateDestinations } from "@/lib/export-destinations-geo";
import type { ExportViewRecord } from "@/lib/export-dashboard-types";

function MapPanel({ records }: { records: ExportViewRecord[] }) {
  const [metric, setMetric] = useState<"usd" | "tonnage">("usd");
  const { points, unresolved } = useMemo(() => aggregateDestinations(records), [records]);

  return (
    <ChartPanel title={`Peta Sebaran Tujuan Ekspor (${metric === "usd" ? "USD" : "MT"})`} className="h-full">
      <div className="flex items-center justify-end gap-1 px-3 pt-2">
        <button
          type="button"
          onClick={() => setMetric("usd")}
          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors ${metric === "usd" ? "border-[#FFE66D] bg-[#FFE66D] text-[#174D55]" : "border-[var(--border)] text-[var(--muted-fg)]"}`}
        >
          Nilai (USD)
        </button>
        <button
          type="button"
          onClick={() => setMetric("tonnage")}
          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors ${metric === "tonnage" ? "border-[#174D55] bg-[#174D55] text-[#F7FFF7]" : "border-[var(--border)] text-[var(--muted-fg)]"}`}
        >
          Volume (MT)
        </button>
      </div>
      <DestinationMap points={points} metric={metric} />
      {unresolved.length > 0 ? (
        <p className="border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--muted-fg)]">Tujuan tanpa koordinat: {unresolved.map((item) => item.name).join(", ")}</p>
      ) : null}
    </ChartPanel>
  );
}

const builtins: BuiltinWidget[] = [
  exportCard({ id: "destination-count", title: "Jumlah Tujuan", icon: Location01Icon, iconKey: "location", tone: "turquoise", highlight: true, value: (records) => new Set(records.map((record) => record.destination)).size.toLocaleString("id-ID"), spec: { field: "destination", agg: "distinct" } }),
  exportCard({ id: "value", title: "Nilai Ekspor", icon: DollarCircleIcon, iconKey: "dollar", tone: "mint", value: (records) => formatUsd(total(records, (record) => record.usdValue)), spec: { field: "usdValue", agg: "sum" } }),
  exportCard({ id: "volume", title: "Volume Ekspor", icon: ShipIcon, iconKey: "ship", tone: "coral", value: (records) => formatTonnage(total(records, (record) => record.tonnage)), spec: { field: "tonnage", agg: "sum" } }),
  exportCard({ id: "top-destination", title: "Top Tujuan", icon: Target02Icon, iconKey: "target", tone: "sun", value: (records) => rankRecords(records, (record) => record.destination, (record) => record.usdValue, 1)[0]?.label ?? "-", spec: { measures: [{ field: "usdValue", agg: "sum" }], compute: "top", topField: "destination" } }),
  {
    id: "map",
    title: "Peta Sebaran Tujuan Ekspor",
    kind: "chart",
    source: "export",
    w: 12,
    h: 10,
    spec: {
      title: "Peta Sebaran Tujuan Ekspor",
      source: "export",
      chart: "bar-h",
      view: "map",
      dimension: "destination",
      measures: [
        { field: "usdValue", agg: "sum", label: "Nilai (USD)" },
        { field: "tonnage", agg: "sum", label: "Volume (MT)" },
      ],
      filters: [],
    },
    render: (records) => <MapPanel records={asExport(records)} />,
  },
  exportPanel({
    id: "destinations-usd",
    title: "Tujuan Ekspor berdasarkan Nilai (USD)",
    w: 6,
    h: 8,
    spec: rankSpec("destination", "usdValue", 10, "coral"),
    children: (records) => <HorizontalBars items={rankRecords(records, (record) => record.destination, (record) => record.usdValue, 10)} formatValue={formatUsd} tone="coral" />,
  }),
  exportPanel({
    id: "destinations-mt",
    title: "Tujuan Ekspor berdasarkan Volume (MT)",
    w: 6,
    h: 8,
    spec: rankSpec("destination", "tonnage", 10, "teal"),
    children: (records) => <HorizontalBars items={rankRecords(records, (record) => record.destination, (record) => record.tonnage, 10)} formatValue={formatTonnage} tone="teal" />,
  }),
  exportPanel({
    id: "buyers",
    title: "Buyer Ekspor Terbesar (USD)",
    w: 6,
    h: 6,
    spec: rankSpec("buyer", "usdValue", 7),
    children: (records) => <HorizontalBars items={rankRecords(records, (record) => record.buyer, (record) => record.usdValue, 7)} formatValue={formatUsd} />,
  }),
  exportPanel({
    id: "products",
    title: "Produk per Tujuan (MT)",
    w: 6,
    h: 6,
    spec: rankSpec("product", "tonnage", 7, "sun"),
    children: (records) => <HorizontalBars items={rankRecords(records, (record) => record.product, (record) => record.tonnage, 7)} formatValue={formatTonnage} tone="yellow" />,
  }),
];

export function DestinationsView(props: ExportCanvasProps) {
  return <DashboardCanvas builtins={builtins} primarySource="export" {...props} />;
}
