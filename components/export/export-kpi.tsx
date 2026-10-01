"use client";

import { AnimatedDisplay } from "@/components/ui/animated-number";
import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { useLiftMotion } from "@/lib/use-lift-motion";

export function ExportKpi({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: IconSvgElement;
  accent?: "amber" | "cyan" | "emerald" | "red";
}) {
  const motion = useLiftMotion<HTMLDivElement>();

  return (
    <div {...motion} className="kpi-card flex min-h-20 items-center gap-3 rounded-lg p-3">
      <div data-wiggle className="kpi-card-icon grid size-10 shrink-0 place-items-center rounded-lg">
        <Icon icon={icon} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em]" title={title}>
          {title}
        </p>
        <p className="mt-1 truncate text-xl font-black tabular-nums" title={value}>
          <AnimatedDisplay text={value} />
        </p>
      </div>
    </div>
  );
}
