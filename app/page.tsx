import DashboardPage from "@/components/dashboard-page";
import { getCachedDashboard, getCachedLayout, safely } from "@/lib/data-cache";

// Rendered on the server from the tagged data cache (see lib/data-cache.ts) and
// regenerated when an upload/delete invalidates the tag.
export const revalidate = 300;

export default async function Home() {
  const [initialData, initialLayout] = await Promise.all([safely(() => getCachedDashboard()), safely(() => getCachedLayout("overview"))]);

  return <DashboardPage view="overview" initialData={initialData} initialLayout={initialLayout} />;
}
