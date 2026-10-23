import type { Metadata } from "next";
import DashboardPage from "@/components/dashboard-page";
import { getCachedKpiDashboard, getCachedLayout, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "KPI Timely Task",
  description: "Pencapaian KPI Timely Task per semester.",
};

export default async function KpiTimelyPage() {
  const [initialKpi, initialLayout] = await Promise.all([safely(() => getCachedKpiDashboard()), safely(() => getCachedLayout("kpi-timely"))]);

  return <DashboardPage view="kpi-timely" initialKpi={initialKpi} initialLayout={initialLayout} />;
}
