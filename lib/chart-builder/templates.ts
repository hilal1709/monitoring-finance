import type { SourceId, WidgetSpec } from "@/lib/chart-builder/types";

// Ready-made widgets for "Mulai dari template". Each opens in the editor, so
// the client can still adjust it before adding.

export type WidgetTemplate = Omit<WidgetSpec, "id"> & { description: string };

const base = { filters: [] };

export const widgetTemplates: Partial<Record<"invoice" | "payment" | "export" | "kpi", WidgetTemplate[]>> = {
  invoice: [
    { ...base, source: "invoice", chart: "card", title: "Piutang bulan ini", description: "Outstanding bulan acuan dengan perubahan MoM/YoY/YTD.", measures: [{ field: "amount", agg: "sum" }], comparison: "page", card: { display: "value-change", sparkline: true, highlight: true } },
    { ...base, source: "invoice", chart: "bar-h", title: "10 customer piutang terbesar", description: "Peringkat customer berdasarkan nilai invoice.", dimension: "customerName", measures: [{ field: "amount", agg: "sum", color: "coral" }], limit: 10, options: { dataLabels: true } },
    { ...base, source: "invoice", chart: "doughnut", title: "Komposisi umur piutang", description: "Porsi Current s.d. Bucket 4.", dimension: "status", measures: [{ field: "amount", agg: "sum" }] },
    { ...base, source: "invoice", chart: "stacked", title: "Tren piutang per tipe customer", description: "Batang bulanan, dipecah External vs Group.", dimension: "periodKey", breakdown: "customerType", measures: [{ field: "amount", agg: "sum" }], limit: 12 },
    { ...base, source: "invoice", chart: "line", title: "Piutang YTD vs tahun lalu", description: "Kumulatif Januari s.d. bulan acuan, dua tahun berdampingan.", dimension: "periodKey", measures: [{ field: "amount", agg: "sum" }], timeMode: "ytd-vs-last-year" },
  ],
  payment: [
    { ...base, source: "payment", chart: "card", title: "Penerimaan YTD", description: "Total Jan s.d. bulan acuan dibanding tahun lalu.", measures: [{ field: "amount", agg: "sum" }], comparison: "ytd", card: { display: "value-change", sparkline: true } },
    { ...base, source: "payment", chart: "combo", title: "Penerimaan & jumlah dokumen", description: "Batang nilai + garis jumlah dokumen per bulan.", dimension: "periodKey", measures: [{ field: "amount", agg: "sum" }, { field: "count", agg: "count", axis: "right", color: "coral" }], timeMode: "monthly" },
    { ...base, source: "payment", chart: "bar", title: "Pertumbuhan YoY penerimaan", description: "Persen naik/turun dibanding bulan yang sama tahun lalu.", dimension: "periodKey", measures: [{ field: "amount", agg: "sum" }], timeMode: "yoy-growth" },
    { ...base, source: "payment", chart: "table", title: "Penerimaan per customer", description: "Tabel nilai dan jumlah dokumen.", dimension: "customerName", measures: [{ field: "amount", agg: "sum" }, { field: "count", agg: "count" }], limit: 20 },
  ],
  export: [
    { ...base, source: "export", chart: "card", title: "Penjualan ekspor bulan ini", description: "Nilai USD bulan acuan, ikut tombol MoM/YoY/YTD.", measures: [{ field: "usdValue", agg: "sum" }], comparison: "page", card: { display: "value-change", sparkline: true, highlight: true } },
    { ...base, source: "export", chart: "card", title: "Piutang ekspor terbuka", description: "Total USD yang belum dibayar.", measures: [{ field: "outstandingUsd", agg: "sum" }], comparison: "none", card: { display: "value", tone: "coral" } },
    { ...base, source: "export", chart: "bar-h", title: "10 negara tujuan terbesar", description: "Nilai USD per negara.", dimension: "destination", measures: [{ field: "usdValue", agg: "sum" }], limit: 10, options: { dataLabels: true } },
    { ...base, source: "export", chart: "stacked", title: "Tren ekspor per produk", description: "Tonase bulanan dipecah per produk.", dimension: "periodKey", breakdown: "product", measures: [{ field: "tonnage", agg: "sum" }], limit: 12 },
    { ...base, source: "export", chart: "area", title: "Penjualan vs tahun lalu", description: "Nilai bulanan dengan garis bulan yang sama tahun lalu.", dimension: "periodKey", measures: [{ field: "usdValue", agg: "sum" }], timeMode: "vs-last-year" },
    { ...base, source: "export", chart: "scatter", title: "Tonase vs nilai per buyer", description: "Melihat buyer dengan harga per ton tinggi/rendah.", dimension: "buyer", measures: [{ field: "tonnage", agg: "sum" }, { field: "usdValue", agg: "sum" }], limit: 30 },
  ],
  kpi: [
    { ...base, source: "kpi", chart: "gauge", title: "Pencapaian KPI bulan acuan", description: "Realisasi dibanding target bulanan.", measures: [{ field: "actual", agg: "avg" }], comparison: "target", card: { display: "progress", target: { field: "target" } } },
    { ...base, source: "kpi", chart: "combo", title: "Target vs realisasi KPI", description: "Batang realisasi + garis target per bulan.", dimension: "periodKey", measures: [{ field: "actual", agg: "avg" }, { field: "target", agg: "avg", color: "coral" }], timeMode: "monthly" },
    { ...base, source: "kpi", chart: "radar", title: "Perbandingan antar KPI", description: "Realisasi tiap KPI dalam satu gambar.", dimension: "metric", measures: [{ field: "actual", agg: "avg" }, { field: "target", agg: "avg" }] },
  ],
};

export function templatesFor(sourceIds: SourceId[]) {
  return sourceIds.flatMap((id) => (id in widgetTemplates ? (widgetTemplates[id as keyof typeof widgetTemplates] ?? []) : []));
}
