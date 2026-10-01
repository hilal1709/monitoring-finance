import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("shimmer rounded-md", className)} {...props} />;
}

/** Placeholder shaped like a dashboard: KPI row plus chart panels. */
function DashboardSkeleton({ kpis = 4, panels = 3 }: { kpis?: number; panels?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Memuat data">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: kpis }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {Array.from({ length: panels }, (_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-44 items-end gap-2 p-4", className)} aria-busy="true">
      {[45, 70, 55, 85, 60, 95, 75].map((height, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md rounded-b-none" style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

export { Skeleton, DashboardSkeleton, ChartSkeleton };
