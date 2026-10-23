import "server-only";

import { randomUUID } from "node:crypto";
import { getPostgresPool } from "@/lib/postgres";
import { DATASET_MAX_ROWS, type DatasetColumn, type DatasetMeta } from "@/lib/chart-builder/datasets";
import type { Row } from "@/lib/chart-builder/types";
import { isPackedRows, type PackedRows } from "@/lib/packed-rows";

// Excel/CSV files uploaded from the chart editor. The browser parses the file
// and sends column-packed rows; they are stored as jsonb next to the column map.

let schema: Promise<void> | null = null;

function ensureSchema() {
  schema ??= getPostgresPool()
    .query(
      `create table if not exists public.custom_datasets (
         id text primary key,
         name text not null,
         columns jsonb not null,
         row_count integer not null,
         rows jsonb not null,
         created_at timestamptz not null default now()
       )`,
    )
    .then(() => undefined)
    .catch((error) => {
      schema = null;
      throw error;
    });
  return schema;
}

function cleanColumns(value: unknown): DatasetColumn[] {
  if (!Array.isArray(value)) throw new Error("Kolom dataset tidak valid.");
  const columns = value.slice(0, 80).flatMap((column): DatasetColumn[] => {
    if (typeof column !== "object" || column === null) return [];
    const { id, label, kind, source, format } = column as Record<string, unknown>;
    if (typeof id !== "string" || typeof label !== "string" || typeof source !== "string") return [];
    if (kind !== "dimension" && kind !== "measure" && kind !== "period") return [];
    return [{ id: id.slice(0, 60), label: label.slice(0, 80), source: source.slice(0, 120), kind, ...(typeof format === "string" ? { format: format as DatasetColumn["format"] } : {}) }];
  });
  if (!columns.length) throw new Error("Tidak ada kolom yang bisa dipakai.");
  return columns;
}

export async function createDataset(input: { name?: unknown; columns?: unknown; rows?: unknown }): Promise<DatasetMeta> {
  const name = typeof input.name === "string" && input.name.trim() ? input.name.trim().slice(0, 80) : "Data upload";
  const columns = cleanColumns(input.columns);
  if (!isPackedRows<Row>(input.rows)) throw new Error("Baris dataset tidak valid.");
  const rows = input.rows as PackedRows<Row>;
  if (rows.n > DATASET_MAX_ROWS) throw new Error(`Maksimal ${DATASET_MAX_ROWS.toLocaleString("id-ID")} baris per file.`);
  await ensureSchema();
  const id = randomUUID().slice(0, 12);
  const result = await getPostgresPool().query<{ created_at: Date }>(
    "insert into public.custom_datasets (id, name, columns, row_count, rows) values ($1, $2, $3, $4, $5) returning created_at",
    [id, name, JSON.stringify(columns), rows.n, JSON.stringify(rows)],
  );
  return { id, name, columns, rowCount: rows.n, createdAt: result.rows[0].created_at.toISOString() };
}

export async function listDatasets(): Promise<DatasetMeta[]> {
  await ensureSchema();
  const result = await getPostgresPool().query<{ id: string; name: string; columns: DatasetColumn[]; row_count: number; created_at: Date }>(
    "select id, name, columns, row_count, created_at from public.custom_datasets order by created_at desc limit 100",
  );
  return result.rows.map((row) => ({ id: row.id, name: row.name, columns: row.columns, rowCount: row.row_count, createdAt: row.created_at.toISOString() }));
}

export async function getDataset(id: string): Promise<(DatasetMeta & { rows: PackedRows<Row> }) | null> {
  await ensureSchema();
  const result = await getPostgresPool().query<{ id: string; name: string; columns: DatasetColumn[]; row_count: number; rows: PackedRows<Row>; created_at: Date }>(
    "select id, name, columns, row_count, rows, created_at from public.custom_datasets where id = $1",
    [id],
  );
  const row = result.rows[0];
  return row ? { id: row.id, name: row.name, columns: row.columns, rowCount: row.row_count, rows: row.rows, createdAt: row.created_at.toISOString() } : null;
}

export async function deleteDataset(id: string) {
  await ensureSchema();
  await getPostgresPool().query("delete from public.custom_datasets where id = $1", [id]);
}
