import DashboardPage from "@/components/dashboard-page";
import { getLatestDashboardReports } from "@/lib/dashboard-store";

export const dynamic = "force-dynamic";

export default async function PaymentPage() {
  const initialReports = await getLatestDashboardReports("payment");

  return <DashboardPage view="payment" initialReports={initialReports} />;
}
