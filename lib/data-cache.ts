import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { getRoleDashboard, toDashboardPayload } from "@/lib/dashboard-store";
import { getExportDashboard } from "@/lib/export-dashboard-store";
import { EXPORT_VIEW_FIELDS, type ExportDashboardWire, type ExportViewRecord } from "@/lib/export-dashboard-types";
import { getKpiDashboard } from "@/lib/kpi-dashboard-store";
import type { DashboardPayload, WorkbookRole } from "@/lib/monitoring-dashboard-types";
import { packRows } from "@/lib/packed-rows";

// Dashboard reads hit a remote Postgres and are the slowest part of every
// page load. They are cached in the Next data cache (shared by server-rendered
// pages and the GET APIs) and invalidated by tag whenever an upload or delete
// changes the data, so readers never see stale numbers.

// Safety net only — writes invalidate the tags explicitly.
const REVALIDATE_SECONDS = 60 * 60;

export const cacheTags = {
  dashboard: (role: WorkbookRole) => `dashboard:${role}`,
  export: "export",
  kpi: "kpi",
} as const;

const cachedRoleDashboard = {
  invoice: unstable_cache(() => getRoleDashboard("invoice"), ["dashboard-role", "invoice", "v3"], {
    tags: [cacheTags.dashboard("invoice")],
    revalidate: REVALIDATE_SECONDS,
  }),
  payment: unstable_cache(() => getRoleDashboard("payment"), ["dashboard-role", "payment", "v3"], {
    tags: [cacheTags.dashboard("payment")],
    revalidate: REVALIDATE_SECONDS,
  }),
};

export async function getCachedDashboard(roles: WorkbookRole[] = ["invoice", "payment"]): Promise<DashboardPayload> {
  const entries = await Promise.all(roles.map(async (role) => [role, await cachedRoleDashboard[role]()] as const));
  return toDashboardPayload(entries);
}

export const getCachedExportDashboard = unstable_cache(
  async (): Promise<ExportDashboardWire> => {
    const { records, ...rest } = await getExportDashboard();
    const viewRecords = records.map((record) => Object.fromEntries(EXPORT_VIEW_FIELDS.map((field) => [field, record[field]])) as ExportViewRecord);
    return { ...rest, records: packRows(viewRecords) };
  },
  ["export-dashboard", "v3"],
  { tags: [cacheTags.export], revalidate: REVALIDATE_SECONDS },
);

export const getCachedKpiDashboard = unstable_cache(() => getKpiDashboard(), ["kpi-dashboard", "v1"], {
  tags: [cacheTags.kpi],
  revalidate: REVALIDATE_SECONDS,
});

/** Expire immediately (not stale-while-revalidate): the uploader must see their own write. */
export function invalidate(tag: string) {
  revalidateTag(tag, { expire: 0 });
}

/**
 * Server-rendered pages use this so a database hiccup degrades to the
 * client-side fetch instead of failing the whole page.
 */
export async function safely<T>(load: () => Promise<T>): Promise<T | undefined> {
  try {
    return await load();
  } catch (error) {
    console.error("[data-cache] initial data load failed:", error instanceof Error ? error.message : error);
    return undefined;
  }
}
