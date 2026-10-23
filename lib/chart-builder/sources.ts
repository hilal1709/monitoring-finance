import { statusOrders, paymentTargetPenerimaan } from "@/lib/dashboard-constants";
import { isPaid } from "@/lib/export-dashboard-data";
import type { ExportKpiSummary, ExportViewRecord } from "@/lib/export-dashboard-types";
import type { KpiPeriod } from "@/lib/kpi-dashboard-store";
import type { DashboardRecord } from "@/lib/monitoring-dashboard-types";
import type { FieldDef, Row, SourceDef, SourceId } from "@/lib/chart-builder/types";

// Every data source the builder understands, normalised into flat rows. Field
// ids are the row keys; "periodKey" (YYYY-MM) is shared by all of them.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const periodFields: FieldDef[] = [
  { id: "periodKey", label: "Periode (bulan)", kind: "period", help: "Bulan transaksi. Pakai ini untuk grafik tren dan perbandingan MoM/YoY/YTD." },
  { id: "year", label: "Tahun", kind: "dimension", help: "Tahun dari periode." },
  { id: "month", label: "Bulan", kind: "dimension", help: "Nama bulan (Jan–Des), tanpa tahun." },
];

const countField: FieldDef = { id: "count", label: "Jumlah baris", kind: "measure", format: "number", help: "Banyaknya baris data (dokumen) yang dihitung." };

function monitoringFields(role: "invoice" | "payment"): FieldDef[] {
  return [
    ...periodFields,
    { id: "customerName", label: "Nama customer", kind: "dimension", help: "Nama pelanggan pada dokumen." },
    { id: "customerType", label: "Tipe customer", kind: "dimension", help: "External atau Group (afiliasi)." },
    { id: "invoiceType", label: role === "invoice" ? "Tipe invoice" : "Tipe dokumen", kind: "dimension", help: "Jenis dokumen penagihan." },
    {
      id: "status",
      label: role === "invoice" ? "Bucket umur piutang" : "Tingkat risiko",
      kind: "dimension",
      help: role === "invoice" ? "Current sampai Bucket 4 — makin besar makin lama belum dibayar." : "No Risk sampai High Risk + dari status pembayaran.",
      order: statusOrders[role],
    },
    {
      id: "amount",
      label: role === "invoice" ? "Nilai invoice (Rp)" : "Nilai payment (Rp)",
      kind: "measure",
      format: "idr",
      lowerIsBetter: role === "invoice",
      help: role === "invoice" ? "Nilai tagihan dalam Rupiah." : "Nilai penerimaan dalam Rupiah.",
    },
    countField,
  ];
}

const exportFields: FieldDef[] = [
  ...periodFields,
  { id: "companyCode", label: "Operating company", kind: "dimension", help: "Kode perusahaan penjual (OpCo)." },
  { id: "buyer", label: "Buyer", kind: "dimension", help: "Pembeli di luar negeri." },
  { id: "destination", label: "Negara tujuan", kind: "dimension", help: "Negara tujuan pengiriman." },
  { id: "product", label: "Produk", kind: "dimension", help: "Jenis produk yang diekspor." },
  { id: "vesselName", label: "Nama kapal", kind: "dimension", help: "Kapal pengangkut." },
  { id: "paidStatus", label: "Status bayar", kind: "dimension", help: "Lunas atau Belum lunas." },
  { id: "agingBucket", label: "Umur piutang", kind: "dimension", help: "Kelompok umur tagihan yang belum dibayar." },
  { id: "plannedPaymentMonth", label: "Bulan rencana bayar", kind: "dimension", help: "Bulan (YYYY-MM) rencana pembayaran; kosong = Tanpa Rencana." },
  { id: "paymentPlan", label: "Rencana bayar", kind: "dimension", help: "Ada rencana bayar atau Belum ada rencana." },
  { id: "usdValue", label: "Nilai penjualan (USD)", kind: "measure", format: "usd", help: "Nilai ekspor dalam USD." },
  { id: "paidUsd", label: "Penerimaan (USD)", kind: "measure", format: "usd", help: "Nilai ekspor yang sudah dibayar." },
  { id: "outstandingUsd", label: "Piutang terbuka (USD)", kind: "measure", format: "usd", lowerIsBetter: true, help: "Nilai ekspor yang belum dibayar." },
  { id: "tonnage", label: "Tonase (MT)", kind: "measure", format: "tonnage", help: "Berat muatan dalam metric ton." },
  { id: "exchangeImpact", label: "Selisih kurs (Rp)", kind: "measure", format: "idr", help: "Dampak selisih kurs saat pembayaran." },
  countField,
];

const kpiFields: FieldDef[] = [
  ...periodFields,
  { id: "metric", label: "Nama KPI", kind: "dimension", help: "Indikator KPI, mis. Strategic Initiative Execution." },
  { id: "actual", label: "Realisasi (Rp miliar)", kind: "measure", format: "number", help: "Nilai aktual KPI pada bulan itu, dalam Rp miliar." },
  { id: "target", label: "Target bulanan (Rp miliar)", kind: "measure", format: "number", help: "Target KPI pada bulan itu, dalam Rp miliar." },
  { id: "yearTarget", label: "Target tahunan (Rp miliar)", kind: "measure", format: "number", help: "Target KPI setahun, dalam Rp miliar." },
  countField,
];

const exportTargetFields: FieldDef[] = [
  ...periodFields,
  { id: "salesTargetUsd", label: "Target penjualan (USD)", kind: "measure", format: "usd", help: "Target penjualan bulanan dari sheet KPI." },
  { id: "salesActualUsd", label: "Realisasi penjualan (USD)", kind: "measure", format: "usd", help: "Realisasi penjualan bulanan dari sheet KPI." },
  { id: "paymentTargetUsd", label: "Target penerimaan (USD)", kind: "measure", format: "usd", help: "Target penerimaan bulanan dari sheet KPI." },
  { id: "paymentActualUsd", label: "Realisasi penerimaan (USD)", kind: "measure", format: "usd", help: "Realisasi penerimaan bulanan dari sheet KPI." },
  countField,
];

const paymentTargetFields: FieldDef[] = [
  ...periodFields,
  { id: "target", label: "Target penerimaan (Rp)", kind: "measure", format: "idr", help: "Target penerimaan bulanan tahun berjalan." },
  countField,
];

export const builtinSources: Record<"invoice" | "payment" | "export" | "kpi" | "export-target" | "payment-target", SourceDef> = {
  invoice: { id: "invoice", label: "Invoice (Non Semen)", description: "Tagihan per customer, tipe, dan umur piutang.", fields: monitoringFields("invoice") },
  payment: { id: "payment", label: "Payment (Non Semen)", description: "Penerimaan per customer dan tingkat risiko.", fields: monitoringFields("payment") },
  export: { id: "export", label: "Ekspor", description: "Penjualan ekspor per buyer, negara, produk, dan kapal.", fields: exportFields },
  kpi: { id: "kpi", label: "KPI", description: "Target dan realisasi KPI per bulan.", fields: kpiFields },
  "export-target": { id: "export-target", label: "Target ekspor (sheet KPI)", description: "Target dan realisasi penjualan & penerimaan per bulan dari sheet KPI.", fields: exportTargetFields },
  "payment-target": { id: "payment-target", label: "Target penerimaan", description: "Target penerimaan Payment per bulan pada tahun berjalan.", fields: paymentTargetFields },
};

function periodParts(periodKey: string | null) {
  if (!periodKey) return { year: null, month: null };
  return { year: periodKey.slice(0, 4), month: MONTHS[Number(periodKey.slice(5, 7)) - 1] ?? null };
}

export function monitoringRows(records: DashboardRecord[]): Row[] {
  return records.map((record) => ({
    periodKey: record.periodKey,
    ...periodParts(record.periodKey),
    customerName: record.customerName,
    customerType: record.customerType,
    invoiceType: record.invoiceType,
    status: record.status,
    amount: record.amount,
    count: record.count ?? 1,
  }));
}

export function exportRows(records: ExportViewRecord[]): Row[] {
  return records.map((record) => {
    const paid = isPaid(record);
    return {
      periodKey: record.periodKey,
      ...periodParts(record.periodKey),
      companyCode: record.companyCode,
      buyer: record.buyer,
      destination: record.destination,
      product: record.product,
      vesselName: record.vesselName,
      paidStatus: paid ? "Lunas" : "Belum lunas",
      agingBucket: record.agingBucket,
      plannedPaymentMonth: record.plannedPaymentDate?.slice(0, 7) ?? "Tanpa Rencana",
      paymentPlan: record.plannedPaymentDate ? "Ada rencana" : "Belum ada rencana",
      usdValue: record.usdValue,
      paidUsd: paid ? record.usdValue : 0,
      outstandingUsd: paid ? 0 : record.usdValue,
      tonnage: record.tonnage,
      exchangeImpact: record.exchangeImpact,
      count: 1,
    };
  });
}

export function kpiRows(periods: KpiPeriod[]): Row[] {
  return periods.flatMap((period) =>
    period.metrics.map((metric) => ({
      periodKey: period.periodKey,
      ...periodParts(period.periodKey),
      metric: metric.label,
      actual: metric.actual,
      target: metric.target,
      yearTarget: metric.yearTarget,
      count: 1,
    })),
  );
}

/** One row per month of the export KPI sheet (targets ignore the record filters). */
export function exportTargetRows(kpi: ExportKpiSummary | null): Row[] {
  return (kpi?.months ?? []).map((month) => ({
    periodKey: month.periodKey,
    ...periodParts(month.periodKey),
    salesTargetUsd: month.salesTargetUsd,
    salesActualUsd: month.salesActualUsd,
    paymentTargetUsd: month.paymentTargetUsd,
    paymentActualUsd: month.paymentActualUsd,
    count: 1,
  }));
}

/** Monthly payment targets, placed in the year of the latest payment (as the old target charts did). */
export function paymentTargetRows(paymentRecords: DashboardRecord[]): Row[] {
  const latest = paymentRecords.reduce<string | null>((max, record) => (record.periodKey && (!max || record.periodKey > max) ? record.periodKey : max), null);
  if (!latest) return [];
  const year = latest.slice(0, 4);
  return paymentTargetPenerimaan.map((point, index) => {
    const periodKey = `${year}-${String(index + 1).padStart(2, "0")}`;
    return { periodKey, ...periodParts(periodKey), target: point.target, count: 1 };
  });
}

/** Rows and field definitions currently available on a page, keyed by source id. */
export type SourceData = Partial<Record<SourceId, { def: SourceDef; rows: Row[] }>>;

export function fieldOf(def: SourceDef | undefined, id: string | undefined) {
  return id ? def?.fields.find((field) => field.id === id) : undefined;
}
