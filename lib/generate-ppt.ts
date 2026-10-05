import "server-only";

import { getExportDashboard } from "@/lib/export-dashboard-store";
import { buildExportAggregates, buildNonExportAggregates, getNarrative } from "@/lib/ai-narrative";
import { buildExportPptSpec, buildReportPptSpec } from "@/lib/ppt-spec";
import { renderPpt } from "@/lib/ppt-render";
import type { DashboardSection, WorkbookRole } from "@/lib/monitoring-dashboard-types";

export async function generateNonExportPpt({
  role,
  filterLabel,
  section,
}: {
  role: WorkbookRole;
  filterLabel: string;
  section: DashboardSection;
}): Promise<Buffer> {
  const narrative = await getNarrative(
    `${role}:${filterLabel}`,
    buildNonExportAggregates(role, filterLabel, section as unknown as Record<string, unknown>),
  );

  return renderPpt(buildReportPptSpec(role, filterLabel, section, narrative));
}

export async function generateExportPpt(theme: "black" | "light" = "black"): Promise<Buffer> {
  const dashboard = await getExportDashboard();

  if (!dashboard.records || dashboard.records.length === 0) {
    throw new Error("Data Ekspor belum tersedia. Upload workbook Ekspor terlebih dahulu.");
  }

  // Narrative is theme-independent, so it caches once and is reused for black/light.
  const narrative = await getNarrative(
    "export",
    buildExportAggregates(dashboard.records as never[], dashboard.months as never[], dashboard.kpi),
  );

  return renderPpt(buildExportPptSpec(dashboard, narrative, theme));
}
