import DashboardPage from "@/components/dashboard-page";
import { getLatestDashboardReports } from "@/lib/dashboard-store";

export const dynamic = "force-dynamic";

export default async function InvoicePage() {
  const initialReports = await getLatestDashboardReports("invoice").catch(() => ({}));

  return <DashboardPage view="invoice" initialReports={initialReports} />;
}
