import type { Metadata } from "next";
import DashboardPage from "@/components/dashboard-page";
import { getCachedExportDashboard, getCachedLayout, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Demurrage Ekspor",
  description: "Aging tunggakan dan selisih kurs pembayaran ekspor.",
};

export default async function ExportDemurragePage() {
  const [initialExport, initialLayout] = await Promise.all([safely(() => getCachedExportDashboard()), safely(() => getCachedLayout("export-demurrage"))]);

  return <DashboardPage view="export-demurrage" initialExport={initialExport} initialLayout={initialLayout} />;
}
