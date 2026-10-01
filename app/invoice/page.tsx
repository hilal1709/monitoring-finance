import type { Metadata } from "next";
import DashboardPage from "@/components/dashboard-page";
import { getCachedDashboard, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Invoice Report Monitoring",
  description: "Outstanding invoice, aging bucket, dan tren bulanan per customer.",
};

export default async function InvoicePage() {
  const initialData = await safely(() => getCachedDashboard(["invoice"]));

  return <DashboardPage view="invoice" initialData={initialData} />;
}
