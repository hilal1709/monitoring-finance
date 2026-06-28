import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReportKpi({
  icon: Icon,
  title,
  value,
  detail,
  accent = "amber",
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  detail?: string;
  accent?: "amber" | "cyan" | "emerald";
  compact?: boolean;
}) {
  const accentClass = accent === "emerald" ? "text-[#70f0bf]" : accent === "cyan" ? "text-[#7dd3fc]" : "text-[#ffd166]";
  const accentPanel = accent === "emerald" ? "border-[#70f0bf]/25 bg-[#70f0bf]/10" : accent === "cyan" ? "border-[#7dd3fc]/25 bg-[#7dd3fc]/10" : "border-[#ffd166]/25 bg-[#ffd166]/10";

  return (
    <div className={cn("grid min-w-0 rounded-lg border border-white/10 bg-[#0c1724] shadow-[0_18px_35px_rgba(0,0,0,0.18)]", compact ? "min-h-16 grid-cols-[44px_minmax(0,1fr)]" : "min-h-24 grid-cols-[56px_minmax(0,1fr)]")}>
      <div className={cn("grid place-items-center rounded-lg border", compact ? "m-2" : "m-3", accentPanel, accentClass)}>
        <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </div>
      <div className={cn("flex min-w-0 flex-col justify-between pl-0", compact ? "p-2" : "p-3")}>
        <div className="max-w-full break-words text-[10px] font-semibold uppercase leading-snug tracking-[0.14em] text-slate-500" title={title}>
          {title}
        </div>
        <div className={cn("min-w-0 break-words text-right font-semibold leading-tight", compact ? "mt-1 text-lg" : "mt-2 text-xl", accentClass)} title={value}>
          {value}
        </div>
        {detail ? <div className="mt-1 text-right text-[10px] font-semibold leading-tight text-slate-400">{detail}</div> : null}
      </div>
    </div>
  );
}
