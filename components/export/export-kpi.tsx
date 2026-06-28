import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExportKpi({
  title,
  value,
  icon: Icon,
  accent = "amber",
}: {
  title: string;
  value: string;
  icon: typeof DollarSign;
  accent?: "amber" | "cyan" | "emerald" | "red";
}) {
  const accents = {
    amber: "border-[#ffd166]/25 bg-[#ffd166]/10 text-[#ffd166]",
    cyan: "border-[#7dd3fc]/25 bg-[#7dd3fc]/10 text-[#7dd3fc]",
    emerald: "border-[#70f0bf]/25 bg-[#70f0bf]/10 text-[#70f0bf]",
    red: "border-[#ff7b72]/25 bg-[#ff7b72]/10 text-[#ff9f8e]",
  };

  return (
    <div className="flex min-h-20 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg border", accents[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-fg)]" title={title}>{title}</p>
        <p className="mt-1 truncate text-xl font-black text-[var(--app-fg)]" title={value}>{value}</p>
      </div>
    </div>
  );
}
