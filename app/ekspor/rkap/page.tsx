import type { Metadata } from "next";
import DashboardPage from "@/components/dashboard-page";
import { getCachedExportDashboard, getCachedLayout, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "RKAP Ekspor",
  description: "Realisasi ekspor dibandingkan target RKAP.",
};

export default async function ExportRkapPage() {
  const [initialExport, initialLayout] = await Promise.all([safely(() => getCachedExportDashboard()), safely(() => getCachedLayout("export-rkap"))]);

  return <DashboardPage view="export-rkap" initialExport={initialExport} initialLayout={initialLayout} />;
}
