import type { Metadata } from "next";
import DashboardPage from "@/components/dashboard-page";
import { getCachedExportDashboard, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tujuan Ekspor",
  description: "Peta dan peringkat negara tujuan ekspor.",
};

export default async function ExportDestinationsPage() {
  const initialExport = await safely(() => getCachedExportDashboard());

  return <DashboardPage view="export-destinations" initialExport={initialExport} />;
}
