import { cn } from "@/lib/utils";
import { periodModeOptions } from "@/lib/dashboard-constants";
import type { PeriodMode } from "@/lib/dashboard-types";

export function PeriodModeSelector({ value, onChange }: { value: PeriodMode; onChange: (value: PeriodMode) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-white/10 bg-white/[0.04] text-[10px] font-black text-slate-200">
      {periodModeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-7 px-3 transition-colors",
            value === option.value ? "bg-[#ffd166] text-[#211600]" : "hover:bg-white/[0.08]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
