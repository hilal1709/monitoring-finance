"use client";

import { useMemo, useState } from "react";
import { DollarCircleIcon, Location01Icon, ShipIcon, Target02Icon } from "@hugeicons/core-free-icons";
import { ChartPanel } from "@/components/export/chart-panel";
import { DestinationMap } from "@/components/export/destination-map";
import { ExportKpi } from "@/components/export/export-kpi";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import { rankRecords, total } from "@/lib/export-dashboard-data";
import { aggregateDestinations } from "@/lib/export-destinations-geo";
import type { ExportViewRecord } from "@/lib/export-dashboard-types";

export function DestinationsView({ records }: { records: ExportViewRecord[] }) {
  const [metric, setMetric] = useState<"usd" | "tonnage">("usd");
  const { points, unresolved } = useMemo(() => aggregateDestinations(records), [records]);
  const destinations = rankRecords(records, (record) => record.destination, (record) => record.usdValue, 10);

  return (
    <>
      <div data-animate-card className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ExportKpi title="Jumlah Tujuan" value={new Set(records.map((record) => record.destination)).size.toLocaleString("id-ID")} icon={Location01Icon} highlight />
        <ExportKpi title="Nilai Ekspor" value={formatUsd(total(records, (record) => record.usdValue))} icon={DollarCircleIcon} accent="cyan" />
        <ExportKpi title="Volume Ekspor" value={formatTonnage(total(records, (record) => record.tonnage))} icon={ShipIcon} accent="emerald" />
        <ExportKpi title="Top Tujuan" value={destinations[0]?.label ?? "-"} icon={Target02Icon} accent="red" />
      </div>

      <ChartPanel
        data-animate-card
        title={`Peta Sebaran Tujuan Ekspor (${metric === "usd" ? "USD" : "MT"})`}
      >
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
          <p className="border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--muted-fg)]">
            Tujuan tanpa koordinat: {unresolved.map((item) => item.name).join(", ")}
          </p>
        ) : null}
      </ChartPanel>

      <div data-animate-card className="grid gap-2 lg:grid-cols-2">
        <ChartPanel title="Tujuan Ekspor berdasarkan Nilai (USD)">
          <HorizontalBars items={destinations} formatValue={formatUsd} tone="coral" />
        </ChartPanel>
        <ChartPanel title="Tujuan Ekspor berdasarkan Volume (MT)">
          <HorizontalBars items={rankRecords(records, (record) => record.destination, (record) => record.tonnage, 10)} formatValue={formatTonnage} tone="teal" />
        </ChartPanel>
      </div>

      <div data-animate-card className="grid gap-2 lg:grid-cols-2">
        <ChartPanel title="Buyer Ekspor Terbesar (USD)">
          <HorizontalBars items={rankRecords(records, (record) => record.buyer, (record) => record.usdValue, 7)} formatValue={formatUsd} />
        </ChartPanel>
        <ChartPanel title="Produk per Tujuan (MT)">
          <HorizontalBars items={rankRecords(records, (record) => record.product, (record) => record.tonnage, 7)} formatValue={formatTonnage} tone="yellow" />
        </ChartPanel>
      </div>
    </>
  );
}
