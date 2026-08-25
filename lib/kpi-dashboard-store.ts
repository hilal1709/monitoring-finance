import "server-only";
import * as XLSX from "xlsx";
import { getPostgresPool } from "@/lib/postgres";

export type KpiMetric = { label: string; target: number; actual: number; yearTarget: number };
export type KpiPeriod = { periodKey: string; label: string; metrics: KpiMetric[]; sourceFilename: string; uploadedAt: string; rawSheetCount: number };

let schema: Promise<void> | null = null;
function ensureSchema() {
  schema ??= getPostgresPool().query(`
    create table if not exists public.kpi_dashboard_periods (
      period_key text primary key, label text not null, metrics jsonb not null,
      source_filename text not null, raw_sheet_count integer not null,
      uploaded_at timestamptz not null default now()
    );
  `).then(() => undefined);
  return schema;
}
const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
function periodKey(month: string, year: number) { return `${year}-${String(months.indexOf(month)+1).padStart(2,"0")}`; }
function asNumber(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0; }

export async function saveKpiWorkbook(file: { name: string; buffer: Buffer }) {
  await ensureSchema();
  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const dashboard = workbook.Sheets["KPI Otobos"];
  if (!dashboard) throw new Error("Sheet KPI Otobos tidak ditemukan.");
  const rawSheets = workbook.SheetNames.filter((name) => name !== "KPI Otobos" && (workbook.Sheets[name]?.["!ref"] ?? "") !== "");
  if (!rawSheets.length) throw new Error("Tidak ada sheet data KPI selain KPI Otobos.");
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(dashboard, { header: 1, defval: null });
  const header = rows.findIndex((row) => String(row[0] ?? "").trim() === "KETERANGAN");
  if (header < 0) throw new Error("Struktur KPI Otobos tidak valid: header KETERANGAN tidak ditemukan.");
  const monthColumns = new Map<string, number>();
  for (let i = 0; i < rows[header].length; i++) {
    const value = String(rows[header][i] ?? "").trim();
    const month = value === "May" ? "Mei" : value;
    if (months.includes(month)) monthColumns.set(month, i);
  }
  if (monthColumns.size === 0) throw new Error("Struktur KPI Otobos tidak valid: kolom periode tidak ditemukan.");
  const year = Number((workbook.SheetNames.join(" ").match(/20\d{2}/)?.[0]) ?? new Date().getFullYear());
  const records: KpiPeriod[] = [];
  for (const [month, column] of monthColumns) {
    const metricRows = [rows[header + 1], rows[header + 4]];
    const metrics = metricRows.map((targetRow, index) => {
      const actualRow = rows[header + (index === 0 ? 3 : 5)];
      const label = String(targetRow?.[0] ?? (index === 0 ? "Strategic Initiative Execution" : "Timely Task")).trim();
      const target = asNumber(targetRow?.[column]);
      const actual = asNumber(actualRow?.[column]);
      const yearTarget = asNumber(targetRow?.[2]);
      return { label, target, actual, yearTarget };
    });
    records.push({ periodKey: periodKey(month, year), label: `${month} ${year}`, metrics, sourceFilename: file.name, uploadedAt: new Date().toISOString(), rawSheetCount: rawSheets.length });
  }
  const client = await getPostgresPool().connect();
  try {
    await client.query("begin");
    for (const record of records) await client.query(
      `insert into public.kpi_dashboard_periods (period_key,label,metrics,source_filename,raw_sheet_count,uploaded_at)
       values ($1,$2,$3::jsonb,$4,$5,now())
       on conflict (period_key) do update set label=excluded.label,metrics=excluded.metrics,source_filename=excluded.source_filename,raw_sheet_count=excluded.raw_sheet_count,uploaded_at=now()`,
      [record.periodKey, record.label, JSON.stringify(record.metrics), file.name, rawSheets.length],
    );
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
  return records.map(({ periodKey, label }) => ({ periodKey, label }));
}
export async function getKpiDashboard() {
  await ensureSchema();
  const result = await getPostgresPool().query<{period_key:string;label:string;metrics:KpiMetric[];source_filename:string;uploaded_at:string;raw_sheet_count:number}>(
    "select period_key,label,metrics,source_filename,uploaded_at::text,raw_sheet_count from public.kpi_dashboard_periods order by period_key desc",
  );
  return { periods: result.rows.map((r) => ({ periodKey:r.period_key,label:r.label,metrics:r.metrics,sourceFilename:r.source_filename,uploadedAt:r.uploaded_at,rawSheetCount:r.raw_sheet_count })) };
}
