import DashboardPage from "@/components/dashboard-page";
import { getLatestDashboardReports } from "@/lib/dashboard-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialReports = await getLatestDashboardReports();

  return <DashboardPage view="overview" initialReports={initialReports} />;
}
