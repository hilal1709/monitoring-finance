"use client";

import { AnimatedDisplay } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { useSpotlightLift } from "@/lib/use-spotlight-lift";
import { cn } from "@/lib/utils";

export function ReportKpi({
  icon,
  title,
  value,
  detail,
  compact = false,
  highlight = false,
}: {
  icon: IconSvgElement;
  title: string;
  value: string;
  detail?: string;
  accent?: "amber" | "cyan" | "emerald";
  compact?: boolean;
  /** Animated shine border; use on at most one card per page. */
  highlight?: boolean;
}) {
  const motion = useSpotlightLift<HTMLDivElement>();

  return (
    <Card
      {...motion}
      className={cn(
        "kpi-card relative grid min-w-0 gap-0 rounded-lg py-0 ring-0 shadow-[0_18px_35px_rgba(26,83,92,0.07)]",
        compact ? "min-h-16 grid-cols-[44px_minmax(0,1fr)]" : "min-h-24 grid-cols-[56px_minmax(0,1fr)]",
        highlight && "kpi-shine",
      )}
    >
      <span aria-hidden className="kpi-spotlight" />
      <div data-wiggle className={cn("kpi-card-icon relative grid place-items-center rounded-lg", compact ? "m-2" : "m-3")}>
        <Icon icon={icon} className={compact ? "size-5" : "size-6"} />
      </div>
      <div className={cn("relative flex min-w-0 flex-col justify-between pl-0", compact ? "p-2" : "p-3")}>
        <div className="max-w-full break-words text-[10px] font-semibold uppercase leading-snug tracking-[0.14em]" title={title}>
          {title}
        </div>
        <div className={cn("min-w-0 break-words text-right font-bold leading-tight tabular-nums", compact ? "mt-1 text-lg" : "mt-2 text-xl")} title={value}>
          <AnimatedDisplay text={value} />
        </div>
        {detail ? <div className="mt-1 text-right text-[10px] font-semibold leading-tight">{detail}</div> : null}
      </div>
    </Card>
  );
}
