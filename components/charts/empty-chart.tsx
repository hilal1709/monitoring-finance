import { cn } from "@/lib/utils";

/** Animated placeholder for charts with nothing to plot (inline SVG, CSS motion). */
export function EmptyChart({ text = "Tidak ada data", className }: { text?: string; className?: string }) {
  return (
    <div className={cn("grid min-h-40 place-items-center content-center gap-1 p-4 text-center", className)}>
      <svg viewBox="0 0 112 80" className="illustration h-20 w-28" aria-hidden>
        <line x1="10" y1="68" x2="102" y2="68" stroke="#174D55" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
        <g data-float>
          <rect x="22" y="40" width="14" height="28" rx="4" fill="#4ECDC4" opacity="0.55" />
          <rect x="45" y="26" width="14" height="42" rx="4" fill="#FFE66D" opacity="0.7" />
          <rect x="68" y="48" width="14" height="20" rx="4" fill="#FF6B6B" opacity="0.55" />
        </g>
        <circle data-twinkle cx="92" cy="18" r="3" fill="#4ECDC4" />
        <circle data-twinkle cx="16" cy="22" r="2.5" fill="#FFE66D" />
      </svg>
      <p className="text-xs font-semibold text-muted-foreground">{text}</p>
    </div>
  );
}
