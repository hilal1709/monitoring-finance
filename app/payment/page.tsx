import type { Metadata } from "next";
import DashboardPage from "@/components/dashboard-page";
import { getCachedDashboard, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Payment Report Monitoring",
  description: "Realisasi payment, risk status, dan pencapaian target penerimaan.",
};

export default async function PaymentPage() {
  const initialData = await safely(() => getCachedDashboard(["payment"]));

  return <DashboardPage view="payment" initialData={initialData} />;
}
