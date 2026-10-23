import type { Metadata } from "next";
import DashboardPage from "@/components/dashboard-page";
import { getCachedExportDashboard, getCachedLayout, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tujuan Ekspor",
  description: "Peta dan peringkat negara tujuan ekspor.",
};

export default async function ExportDestinationsPage() {
  const [initialExport, initialLayout] = await Promise.all([safely(() => getCachedExportDashboard()), safely(() => getCachedLayout("export-destinations"))]);

  return <DashboardPage view="export-destinations" initialExport={initialExport} initialLayout={initialLayout} />;
}
