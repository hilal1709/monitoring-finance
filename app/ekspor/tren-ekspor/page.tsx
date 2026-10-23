import type { Metadata } from "next";
import DashboardPage from "@/components/dashboard-page";
import { getCachedExportDashboard, getCachedLayout, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tren Ekspor",
  description: "Tren bulanan nilai dan tonase ekspor.",
};

export default async function ExportTrendPage() {
  const [initialExport, initialLayout] = await Promise.all([safely(() => getCachedExportDashboard()), safely(() => getCachedLayout("export-trend"))]);

  return <DashboardPage view="export-trend" initialExport={initialExport} initialLayout={initialLayout} />;
}
