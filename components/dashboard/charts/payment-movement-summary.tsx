import { cn } from "@/lib/utils";
import { paymentMovementSummary } from "@/lib/dashboard-data";
import { formatDeltaPercent } from "@/lib/dashboard-format";

export function PaymentMovementSummary({ summary }: { summary: ReturnType<typeof paymentMovementSummary> }) {
  const items = [
    { label: "MoM", value: summary.mom },
    { label: "YoY", value: summary.yoy },
    { label: "YTD", value: summary.ytd },
  ];

  return (
    <div className="grid gap-2 px-2 pb-2 sm:grid-cols-3">
      {items.map((item) => {
        const positive = item.value !== null && item.value >= 0;

        return (
          <div key={item.label} title={`Latest ${summary.label}`} className="rounded-lg border border-white/10 bg-[#0c1724] px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</span>
              <span className={cn("text-base font-black", positive ? "text-[#70f0bf]" : "text-[#ff9f8e]")}>{formatDeltaPercent(item.value)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
