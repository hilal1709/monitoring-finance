import type { Metadata } from "next";
import DashboardPage from "@/components/dashboard-page";
import { getCachedKpiDashboard, getCachedLayout, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "KPI Otobos",
  description: "Pencapaian KPI Strategic Initiative Execution per semester.",
};

export default async function KpiOtobosPage() {
  const [initialKpi, initialLayout] = await Promise.all([safely(() => getCachedKpiDashboard()), safely(() => getCachedLayout("kpi-otobos"))]);

  return <DashboardPage view="kpi-otobos" initialKpi={initialKpi} initialLayout={initialLayout} />;
}
