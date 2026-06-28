import { cn } from "@/lib/utils";
import { ChartTitle, HoverValue } from "@/components/dashboard/charts/chart-primitives";
import { rankedItemTooltip } from "@/lib/dashboard-data";
import { formatPercent } from "@/lib/dashboard-format";
import { palette } from "@/lib/dashboard-constants";
import type { RankedItem } from "@/lib/monitoring-dashboard-types";

export function DonutChart({ title, items, centerLabel, summary, compact = false }: { title: string; items: RankedItem[]; centerLabel?: string; summary?: string; compact?: boolean }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const gradient = items
    .map((item, index) => {
      const start = items.slice(0, index).reduce((sum, current) => sum + (current.value / total) * 360, 0);
      const end = start + (item.value / total) * 360;

      return `${palette[index % palette.length]} ${start}deg ${end}deg`;
    })
    .join(", ");
  const background = gradient ? `conic-gradient(${gradient})` : "#e5e7eb";

  return (
    <div className="h-full rounded-lg border border-white/10 bg-[#0c1724]">
      <ChartTitle title={title} />
      {summary ? <div className="border-b border-white/10 px-2 py-1.5 text-center text-[11px] font-bold text-[#ffd166]">{summary}</div> : null}
      <div className={cn("flex flex-col items-center justify-center p-2 2xl:flex-row", compact ? "min-h-[138px] gap-2" : "min-h-[178px] gap-3")}>
        <div className={cn("relative grid shrink-0 place-items-center rounded-full border border-white/10", compact ? "h-28 w-28" : "h-36 w-36")} style={{ background }}>
          <div className={cn("grid place-items-center rounded-full border border-white/10 bg-[#0c1724] text-center font-bold leading-tight text-slate-100", compact ? "h-14 w-14 text-[10px]" : "h-[4.5rem] w-[4.5rem] text-[11px]")}>
            {centerLabel ?? "Total"}
          </div>
        </div>
        <div className="w-full min-w-0 max-w-[220px] space-y-0.5 text-[10px] text-slate-300 2xl:w-40">
          {items.slice(0, 8).map((item, index) => (
            <div key={item.label} tabIndex={0} title={rankedItemTooltip(item)} className="group relative grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-2 outline-none">
              <HoverValue text={rankedItemTooltip(item)} />
              <span className="h-2 w-2 shrink-0" style={{ backgroundColor: palette[index % palette.length] }} />
              <span className="min-w-0 break-words leading-tight">{item.label}</span>
              <span className="font-bold">{formatPercent(item.share)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
