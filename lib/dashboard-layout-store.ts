import "server-only";

import { getPostgresPool } from "@/lib/postgres";
import { sanitizeLayout } from "@/lib/chart-builder/validate";
import type { PageLayout } from "@/lib/chart-builder/types";

// Customised page layouts (see components/dashboard-canvas). One current row
// per view plus a short version history so a bad save can be rolled back.

const KEEP_VERSIONS = 20;
let schema: Promise<void> | null = null;

function ensureSchema() {
  schema ??= getPostgresPool()
    .query(
      `create table if not exists public.dashboard_layouts (
         view text primary key,
         layout jsonb not null,
         updated_at timestamptz not null default now()
       );
       create table if not exists public.dashboard_layout_versions (
         id bigserial primary key,
         view text not null,
         layout jsonb not null,
         created_at timestamptz not null default now()
       );
       create index if not exists dashboard_layout_versions_view_idx on public.dashboard_layout_versions (view, created_at desc);`,
    )
    .then(() => undefined)
    .catch((error) => {
      schema = null;
      throw error;
    });
  return schema;
}

export type LayoutVersion = { id: number; createdAt: string; widgetCount: number };

export async function getLayout(view: string): Promise<PageLayout | null> {
  await ensureSchema();
  const result = await getPostgresPool().query<{ layout: unknown }>("select layout from public.dashboard_layouts where view = $1", [view]);
  return result.rows[0] ? sanitizeLayout(result.rows[0].layout, view) : null;
}

export async function saveLayout(view: string, input: unknown): Promise<PageLayout> {
  const layout = sanitizeLayout(input, view);
  if (!layout) throw new Error("Format layout tidak dikenali.");
  await ensureSchema();
  const client = await getPostgresPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into public.dashboard_layouts (view, layout, updated_at) values ($1, $2, now())
       on conflict (view) do update set layout = excluded.layout, updated_at = now()`,
      [view, JSON.stringify(layout)],
    );
    await client.query("insert into public.dashboard_layout_versions (view, layout) values ($1, $2)", [view, JSON.stringify(layout)]);
    await client.query(
      `delete from public.dashboard_layout_versions where view = $1 and id not in (
         select id from public.dashboard_layout_versions where view = $1 order by created_at desc limit $2)`,
      [view, KEEP_VERSIONS],
    );
    await client.query("commit");
    return layout;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Back to the built-in layout. History is kept so the reset can be undone. */
export async function resetLayout(view: string) {
  await ensureSchema();
  await getPostgresPool().query("delete from public.dashboard_layouts where view = $1", [view]);
}

export async function listLayoutVersions(view: string): Promise<LayoutVersion[]> {
  await ensureSchema();
  const result = await getPostgresPool().query<{ id: string; created_at: Date; widget_count: number }>(
    `select id, created_at, coalesce(jsonb_array_length(layout->'items'), 0) as widget_count
       from public.dashboard_layout_versions where view = $1 order by created_at desc limit $2`,
    [view, KEEP_VERSIONS],
  );
  return result.rows.map((row) => ({ id: Number(row.id), createdAt: row.created_at.toISOString(), widgetCount: row.widget_count }));
}

export async function restoreLayoutVersion(view: string, id: number): Promise<PageLayout> {
  await ensureSchema();
  const result = await getPostgresPool().query<{ layout: unknown }>("select layout from public.dashboard_layout_versions where view = $1 and id = $2", [view, id]);
  if (!result.rows[0]) throw new Error("Versi tidak ditemukan.");
  return saveLayout(view, result.rows[0].layout);
}
