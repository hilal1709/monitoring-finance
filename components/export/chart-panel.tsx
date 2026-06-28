import { cn } from "@/lib/utils";

export function ChartPanel({ title, children, className, ...rest }: { title: string; children: React.ReactNode; className?: string } & React.ComponentProps<"section">) {
  return (
    <section {...rest} className={cn("overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]", className)}>
      <h3 className="border-b border-[var(--border)] px-3 py-2 text-xs font-bold uppercase text-[var(--app-fg)]">{title}</h3>
      {children}
    </section>
  );
}
