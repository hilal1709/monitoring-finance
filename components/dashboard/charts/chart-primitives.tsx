import { cn } from "@/lib/utils";

export function ChartTitle({ title }: { title: string }) {
  return <h4 className="border-b border-white/10 px-2 py-1.5 text-center text-[11px] font-black uppercase text-slate-200">{title}</h4>;
}

export function HoverValue({ text, align = "right" }: { text: string; align?: "right" | "center" }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute bottom-full z-30 mb-1 max-w-[260px] whitespace-nowrap rounded bg-[#06113a] px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
        align === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
      )}
    >
      {text}
    </span>
  );
}
