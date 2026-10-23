import type { FieldDef, Row, SourceDef, SourceId } from "@/lib/chart-builder/types";

// Excel/CSV files uploaded from the chart editor become their own source,
// "dataset:<id>". Shared by the API (server) and the editor (browser).

export type DatasetColumn = FieldDef & { /** Header in the original file. */ source: string };

export type DatasetMeta = { id: string; name: string; rowCount: number; columns: DatasetColumn[]; createdAt: string };

export const DATASET_MAX_ROWS = 50_000;
/** Vercel caps request bodies at ~4.5 MB; stay under it after JSON encoding. */
export const DATASET_MAX_BYTES = 4 * 1024 * 1024;

export function datasetSourceId(id: string): SourceId {
  return `dataset:${id}`;
}

export function datasetDef(meta: Pick<DatasetMeta, "id" | "name" | "columns" | "rowCount">): SourceDef {
  const hasPeriod = meta.columns.some((column) => column.kind === "period");
  return {
    id: datasetSourceId(meta.id),
    label: meta.name,
    description: `${meta.rowCount.toLocaleString("id-ID")} baris dari file upload.`,
    fields: [
      ...meta.columns.map((column): FieldDef => ({ id: column.id, label: column.label, kind: column.kind, format: column.format, help: column.help })),
      ...(hasPeriod
        ? [
            { id: "year", label: "Tahun", kind: "dimension" as const, help: "Tahun dari kolom tanggal." },
            { id: "month", label: "Bulan", kind: "dimension" as const, help: "Nama bulan dari kolom tanggal." },
          ]
        : []),
      { id: "count", label: "Jumlah baris", kind: "measure", format: "number", help: "Banyaknya baris data." },
    ],
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Adds the derived year/month/count fields the shared sources also have. */
export function withDerivedFields(rows: Row[]): Row[] {
  return rows.map((row) => {
    const period = typeof row.periodKey === "string" ? row.periodKey : null;
    return { ...row, year: period ? period.slice(0, 4) : null, month: period ? (MONTHS[Number(period.slice(5, 7)) - 1] ?? null) : null, count: 1 };
  });
}

// ---- detection (browser, from the parsed sheet) -----------------------------------

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** YYYY-MM from an Excel serial, a JS date, "2026-03-15", "15/03/2026", "Mar 2026", "Maret 2026"… */
export function toPeriodKey(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  if (typeof value === "number" && value > 20_000 && value < 80_000) {
    const date = new Date(EXCEL_EPOCH + value * 86_400_000);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  let match = text.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}`;
  match = text.match(/^\d{1,2}[-/.](\d{1,2})[-/.](\d{4})/);
  if (match) return `${match[2]}-${match[1].padStart(2, "0")}`;
  match = text.toLowerCase().match(/^([a-z]{3})[a-z]*[\s-]+(\d{4})$/);
  if (match) {
    const names = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];
    const english = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const index = Math.max(names.indexOf(match[1]), english.indexOf(match[1]));
    if (index >= 0) return `${match[2]}-${String(index + 1).padStart(2, "0")}`;
  }
  return null;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  // "1.234.567,89" (id-ID) or "1,234,567.89" (en-US)
  const normalised = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : null;
}

function slug(header: string, used: Set<string>) {
  const base = header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "kolom";
  let id = base === "periodkey" || base === "count" || base === "year" || base === "month" ? `${base}_1` : base;
  let suffix = 2;
  while (used.has(id)) id = `${base}_${suffix++}`;
  used.add(id);
  return id;
}

/** Guesses each column's kind from up to 200 sample values. */
export function detectColumns(headers: string[], rows: unknown[][]): DatasetColumn[] {
  const used = new Set<string>();
  let periodTaken = false;
  return headers.map((header, index) => {
    const samples = rows.slice(0, 200).map((row) => row[index]).filter((value) => value !== null && value !== undefined && value !== "");
    const dates = samples.filter((value) => toPeriodKey(value) !== null).length;
    const numbers = samples.filter((value) => toNumber(value) !== null).length;
    const name = header.trim() || `Kolom ${index + 1}`;
    const looksDate = /tanggal|tgl|date|periode|period|bulan|month/i.test(name);
    if (!periodTaken && samples.length && (looksDate ? dates / samples.length > 0.6 : dates / samples.length > 0.9 && typeof samples[0] !== "number")) {
      periodTaken = true;
      return { id: "periodKey", source: header, label: name, kind: "period" as const, help: `Dari kolom "${name}".` };
    }
    if (samples.length && numbers / samples.length > 0.9) return { id: slug(name, used), source: header, label: name, kind: "measure" as const, format: "number" as const };
    return { id: slug(name, used), source: header, label: name, kind: "dimension" as const };
  });
}

/** Converts sheet rows into builder rows using the (possibly user-corrected) columns. */
export function toRows(headers: string[], rows: unknown[][], columns: DatasetColumn[]): Row[] {
  const indexOf = new Map(headers.map((header, index) => [header, index]));
  return rows
    .filter((row) => row.some((value) => value !== null && value !== undefined && value !== ""))
    .map((row) => {
      const out: Row = {};
      for (const column of columns) {
        const value = row[indexOf.get(column.source) ?? -1];
        if (column.kind === "period") out[column.id] = toPeriodKey(value);
        else if (column.kind === "measure") out[column.id] = toNumber(value) ?? 0;
        else out[column.id] = value === null || value === undefined ? null : String(value).trim();
      }
      return out;
    });
}
