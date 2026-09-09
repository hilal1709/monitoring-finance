import "server-only";
import * as XLSX from "xlsx";
import { getPostgresPool } from "@/lib/postgres";

export type KpiMetric = { label: string; target: number; actual: number; yearTarget: number };
export type KpiPeriod = { periodKey: string; label: string; metrics: KpiMetric[]; sourceFilename: string; uploadedAt: string; rawSheetCount: number };

const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
let schema: Promise<void> | null = null;
type KpiDashboardPayload = { periods: KpiPeriod[] };
const KPI_CACHE_TTL_MS = 30_000;
let dashboardCache: { data: KpiDashboardPayload; expiresAt: number } | null = null;

function ensureSchema() {
  schema ??= getPostgresPool().query(
    "create table if not exists public.kpi_dashboard_periods (" +
      "period_key text primary key, label text not null, metrics jsonb not null, " +
      "source_filename text not null, raw_sheet_count integer not null, " +
      "uploaded_at timestamptz not null default now())",
  ).then(() => undefined);
  return schema;
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: null });
}

function month(value: unknown) {
  const key = String(value ?? "").trim().replace(/^OS\s+/i, "").replace(/^May$/i, "Mei").slice(0, 3).toLowerCase();
  return key ? months.find((item) => item.toLowerCase().startsWith(key)) : undefined;
}

function targets(kpiRows: (string | number | null)[][], header: number) {
  const columns = new Map<string, number>();
  kpiRows[header].forEach((value, index) => {
    const key = month(value);
    if (key) columns.set(key, index);
  });

  const sourceRows = [kpiRows[header + 1], kpiRows[header + 4]];
  return new Map(months.map((key) => [key, sourceRows.map((row, index) => ({
    label: String(row?.[0] ?? (index === 0 ? "Strategic Initiative Execution" : "Timely Task")).trim(),
    target: number(row?.[columns.get(key) ?? -1]),
    yearTarget: number(row?.[2]),
  }))]));
}

function kpiActuals(kpiRows: (string | number | null)[][], header: number, rowOffset: number) {
  const values = new Map<string, number>();
  kpiRows[header].forEach((value, index) => {
    const key = month(value);
    if (key) values.set(key, number(kpiRows[header + rowOffset]?.[index]));
  });
  return values;
}
function otobos(sheet: XLSX.WorkSheet) {
  const data = rows(sheet);
  const header = data.findIndex((row) => row.some((value) => /^OS\s+(JAN|FEB|MAR|APR|MEI|MAY|JUN|JUL|AGU|SEP|OKT|NOV|DES)/i.test(String(value ?? ""))));
  if (header < 2) throw new Error("Sheet Data Olah tidak memiliki kolom OS per bulan.");

  const clearing = header - 2;
  if (!data[clearing]?.some((value) => String(value ?? "").trim() === "CLEARING")) {
    throw new Error("Sheet Data Olah tidak memiliki baris CLEARING / Strat Initiative.");
  }

  const values = new Map<string, number>();
  data[header].forEach((value, index) => {
    const key = month(value);
    if (key) values.set(key, number(data[clearing][index]) / 1_000_000_000);
  });
  return values;
}

function timely(workbook: XLSX.WorkBook) {
  const values = new Map<string, number>();

  for (const name of workbook.SheetNames) {
    const match = /^DSA[_-]?(Jan|Feb|Mar|Apr|Mei|May|Jun|Jul|Agu|Sep|Okt|Nov|Des)/i.exec(name);
    if (!match) continue;

    const key = month(match[1]);
    const sheet = workbook.Sheets[name];
    const data = rows(sheet);
    const headers = data[0].map((value) => String(value ?? "").trim());
    const documentType = headers.indexOf("Document Type");
    const localAmount = headers.indexOf("Amount in local currency");
    if (!key || documentType < 0 || localAmount < 0) {
      throw new Error("Sheet " + name + " harus memiliki kolom Document Type dan Amount in local currency.");
    }

    const hidden = sheet["!rows"] ?? [];
    const total = data.slice(1).reduce((sum, row, index) => {
      if (hidden[index + 1]?.hidden) return sum;
      return String(row[documentType] ?? "").trim() === "" ? sum + number(row[localAmount]) : sum;
    }, 0);

    values.set(key, Math.abs(total) / 1_000_000_000);
  }
  return values;
}

export async function saveKpiWorkbook(file: { name: string; buffer: Buffer }) {
  await ensureSchema();
  const workbook = XLSX.read(file.buffer, { type: "buffer", cellStyles: true });
  const kpiSheet = workbook.Sheets["KPI Otobos"];
  const dataOlah = workbook.Sheets["Data Olah"];
  if (!kpiSheet) throw new Error("Sheet KPI Otobos tidak ditemukan.");
  if (!dataOlah) throw new Error("Sheet Data Olah tidak ditemukan.");
  if (!workbook.SheetNames.some((name) => /^DSA/i.test(name))) throw new Error("Sheet DSA untuk perhitungan Timely Task tidak ditemukan.");
  if (!workbook.SheetNames.some((name) => /^DSO/i.test(name))) throw new Error("Sheet DSO untuk perhitungan Otobos tidak ditemukan.");

  const kpiRows = rows(kpiSheet);
  const header = kpiRows.findIndex((row) => String(row[0] ?? "").trim() === "KETERANGAN");
  if (header < 0) throw new Error("Struktur KPI Otobos tidak valid: header KETERANGAN tidak ditemukan.");

  const year = Number(kpiRows.flat().map((value) => String(value ?? "")).join(" ").match(/\b20\d{2}\b/)?.[0]);
  if (!Number.isFinite(year)) throw new Error("Tahun KPI tidak ditemukan di sheet KPI Otobos.");

  const targetMap = targets(kpiRows, header);
  otobos(dataOlah); // Validate the raw outstanding calculation sheet.
  const strategicMap = kpiActuals(kpiRows, header, 3);
  const timelyMap = timely(workbook);
  const available = months.filter((key) => strategicMap.has(key) && timelyMap.has(key));
  if (!available.length) throw new Error("Tidak ada periode yang dapat dihitung dari Data Olah dan DSA.");

  const records: KpiPeriod[] = available.map((key) => {
    const metricTargets = targetMap.get(key);
    if (!metricTargets) throw new Error("Target KPI untuk " + key + " tidak ditemukan.");
    return {
      periodKey: String(year) + "-" + String(months.indexOf(key) + 1).padStart(2, "0"),
      label: key + " " + year,
      metrics: [
        { ...metricTargets[0], actual: strategicMap.get(key) ?? 0 },
        { ...metricTargets[1], actual: timelyMap.get(key) ?? 0 },
      ],
      sourceFilename: file.name,
      uploadedAt: new Date().toISOString(),
      rawSheetCount: workbook.SheetNames.length - 1,
    };
  });

  const client = await getPostgresPool().connect();
  try {
    await client.query("begin");
    for (const record of records) {
      await client.query(
        "insert into public.kpi_dashboard_periods (period_key,label,metrics,source_filename,raw_sheet_count,uploaded_at) values ($1,$2,$3::jsonb,$4,$5,now()) on conflict (period_key) do update set label=excluded.label,metrics=excluded.metrics,source_filename=excluded.source_filename,raw_sheet_count=excluded.raw_sheet_count,uploaded_at=now()",
        [record.periodKey, record.label, JSON.stringify(record.metrics), file.name, record.rawSheetCount],
      );
    }
    await client.query("commit");
    dashboardCache = null;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return records.map(({ periodKey, label }) => ({ periodKey, label }));
}

export async function getKpiDashboard(): Promise<KpiDashboardPayload> {
  await ensureSchema();
  if (dashboardCache && dashboardCache.expiresAt > Date.now()) return dashboardCache.data;

  const result = await getPostgresPool().query<{ period_key: string; label: string; metrics: KpiMetric[]; source_filename: string; uploaded_at: string; raw_sheet_count: number }>(
    "select period_key,label,metrics,source_filename,uploaded_at::text,raw_sheet_count from public.kpi_dashboard_periods order by period_key desc",
  );
  const data: KpiDashboardPayload = {
    periods: result.rows.map((row) => ({
      periodKey: row.period_key,
      label: row.label,
      metrics: row.metrics,
      sourceFilename: row.source_filename,
      uploadedAt: row.uploaded_at,
      rawSheetCount: row.raw_sheet_count,
    })),
  };
  dashboardCache = { data, expiresAt: Date.now() + KPI_CACHE_TTL_MS };
  return data;
}