import DashboardPage from "@/components/dashboard-page";
import { getCachedDashboard, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export default async function Home() {
  const initialData = await safely(() => getCachedDashboard());

  return <DashboardPage view="overview" initialData={initialData} />;
}
