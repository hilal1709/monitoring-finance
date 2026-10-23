import { measureLabel } from "@/lib/chart-builder/aggregate";
import { fieldOf } from "@/lib/chart-builder/sources";
import { comparisonHelp } from "@/lib/chart-builder/time-intel";
import type { ChartKind, SourceDef, TimeSeriesMode, WidgetSpec } from "@/lib/chart-builder/types";

// Plain-language helpers for the editor: suggested chart type, a one-line
// summary of what the widget shows, and friendly validation messages.

export const chartKinds: { kind: ChartKind; label: string; hint: string }[] = [
  { kind: "card", label: "Kartu angka", hint: "Satu angka besar, bisa dengan perbandingan MoM/YoY/YTD atau target." },
  { kind: "bar", label: "Batang tegak", hint: "Membandingkan nilai antar kelompok atau bulan." },
  { kind: "bar-h", label: "Batang mendatar", hint: "Peringkat (Top 10) dengan nama yang panjang." },
  { kind: "stacked", label: "Batang bertumpuk", hint: "Total per kelompok sekaligus komposisinya." },
  { kind: "line", label: "Garis", hint: "Tren dari bulan ke bulan." },
  { kind: "area", label: "Area", hint: "Tren dengan penekanan pada besarnya nilai." },
  { kind: "combo", label: "Kombinasi", hint: "Batang + garis, mis. nilai dan jumlah dokumen." },
  { kind: "doughnut", label: "Donat", hint: "Porsi tiap bagian dari total (maks. 6 bagian)." },
  { kind: "pie", label: "Pie", hint: "Porsi tiap bagian dari total (maks. 6 bagian)." },
  { kind: "radar", label: "Radar", hint: "Membandingkan beberapa ukuran sekaligus." },
  { kind: "scatter", label: "Sebar (scatter)", hint: "Hubungan antara dua angka." },
  { kind: "gauge", label: "Gauge", hint: "Pencapaian terhadap target dalam persen." },
  { kind: "table", label: "Tabel", hint: "Angka lengkap per baris." },
];

export const timeModeOptions: { value: TimeSeriesMode | "page"; label: string; help: string }[] = [
  { value: "page", label: "Ikuti pilihan halaman", help: "Mengikuti tombol MoM / YoY / YTD di halaman: MoM = nilai bulanan + bulan sama tahun lalu, YoY = pertumbuhan, YTD = kumulatif vs tahun lalu." },
  { value: "monthly", label: "Nilai bulanan", help: "Nilai tiap bulan apa adanya." },
  { value: "vs-last-year", label: "Bandingkan tahun lalu", help: "Nilai tiap bulan dengan garis bulan yang sama tahun lalu." },
  { value: "mom-change", label: "Perubahan MoM (%)", help: comparisonHelp.mom },
  { value: "yoy-growth", label: "Pertumbuhan YoY (%)", help: comparisonHelp.yoy },
  { value: "ytd-cumulative", label: "Kumulatif YTD", help: "Total berjalan dari Januari sampai bulan acuan." },
  { value: "ytd-vs-last-year", label: "YTD vs tahun lalu", help: comparisonHelp.ytd },
];

/** Suggests a chart from the chosen fields. */
export function recommendChart(spec: Pick<WidgetSpec, "dimension" | "breakdown" | "measures">, distinctCount: number): ChartKind {
  if (!spec.dimension) return spec.measures.length > 2 ? "radar" : "card";
  if (spec.dimension === "periodKey") return spec.breakdown ? "stacked" : spec.measures.length > 1 ? "combo" : "line";
  if (spec.breakdown) return "stacked";
  if (distinctCount <= 6 && spec.measures.length === 1) return "doughnut";
  return "bar-h";
}

/** "Total Nilai penjualan (USD) per Negara tujuan · 10 teratas · YTD vs tahun lalu" */
export function describeWidget(spec: WidgetSpec, def: SourceDef | undefined) {
  const parts: string[] = [];
  const measures = spec.measures.map((measure) => measureLabel(measure, def)).join(" & ") || "Jumlah data";
  const dimension = fieldOf(def, spec.dimension)?.label;
  const breakdown = fieldOf(def, spec.breakdown)?.label;
  parts.push(dimension ? `${measures} per ${dimension.toLowerCase()}` : measures);
  if (breakdown) parts.push(`dipecah menurut ${breakdown.toLowerCase()}`);
  if (spec.limit && spec.dimension !== "periodKey") parts.push(`${spec.limit} teratas`);
  const mode = timeModeOptions.find((option) => option.value === (spec.timeMode ?? "page"));
  const ytd = spec.timeMode === "ytd-cumulative" || spec.timeMode === "ytd-vs-last-year";
  if (spec.dimension === "periodKey" && spec.limit && !ytd) parts.push(`${spec.limit} bulan terakhir`);
  if (spec.dimension === "periodKey" && mode) parts.push(mode.value === "page" ? "ikuti tombol MoM/YoY/YTD" : mode.label);
  if (spec.chart === "card" && spec.comparison && spec.comparison !== "none") {
    parts.push(spec.comparison === "page" ? "perbandingan mengikuti halaman" : spec.comparison === "target" ? "dibanding target" : `dibanding ${spec.comparison.toUpperCase()}`);
  }
  if (spec.filters.length) parts.push(`${spec.filters.length} filter khusus`);
  return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}${parts.length > 1 ? ` · ${parts.slice(1).join(" · ")}` : ""}`;
}

/** First problem that stops the widget from drawing well, in plain words. */
export function validateWidget(spec: WidgetSpec): string | null {
  if (!spec.title.trim()) return "Beri judul supaya grafik mudah dikenali.";
  if (spec.chart !== "card" && spec.chart !== "gauge" && spec.chart !== "table" && spec.chart !== "radar" && !spec.dimension) {
    return "Pilih kolom di kotak \"Kelompokkan berdasarkan\" (mis. Periode atau Customer).";
  }
  if ((spec.chart === "pie" || spec.chart === "doughnut") && spec.measures.length > 1) return "Pie/donat hanya bisa 1 nilai — hapus nilai lainnya.";
  if (spec.chart === "scatter" && spec.measures.length < 2) return "Scatter butuh 2 nilai: satu untuk sumbu X, satu untuk sumbu Y.";
  if (spec.chart === "gauge" && !spec.card?.target) return "Gauge butuh target — isi di bagian Target.";
  if (spec.chart === "combo" && spec.measures.length < 2) return "Kombinasi butuh 2 nilai: satu batang, satu garis.";
  return null;
}
