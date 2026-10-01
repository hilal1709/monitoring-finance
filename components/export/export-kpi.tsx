"use client";

import { useEffect, useRef } from "react";
import { AnimatedDisplay } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { withMotion } from "@/lib/gsap";
import { useSpotlightLift } from "@/lib/use-spotlight-lift";
import { cn } from "@/lib/utils";

const GAUGE_RADIUS = 21;
const GAUGE_LENGTH = 2 * Math.PI * GAUGE_RADIUS;

export function ExportKpi({
  title,
  value,
  icon,
  gauge,
  highlight = false,
}: {
  title: string;
  value: string;
  icon: IconSvgElement;
  accent?: "amber" | "cyan" | "emerald" | "red";
  /** Percentage (0–100+) drawn as a ring around the icon (21st.dev circular progress). */
  gauge?: number;
  /** Animated shine border; use on at most one card per page. */
  highlight?: boolean;
}) {
  const motion = useSpotlightLift<HTMLDivElement>();

  return (
    <Card {...motion} className={cn("kpi-card relative min-h-20 flex-row items-center gap-3 rounded-lg p-3 ring-0", highlight && "kpi-shine")}>
      <span aria-hidden className="kpi-spotlight" />
      {gauge === undefined ? (
        <div data-wiggle className="kpi-card-icon relative grid size-10 shrink-0 place-items-center rounded-lg">
          <Icon icon={icon} className="size-5" />
        </div>
      ) : (
        <KpiGauge percent={gauge} icon={icon} />
      )}
      <div className="relative min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em]" title={title}>
          {title}
        </p>
        <p className="mt-1 truncate text-xl font-black tabular-nums" title={value}>
          <AnimatedDisplay text={value} />
        </p>
      </div>
    </Card>
  );
}

/** Ring that fills to `percent`: drawn by CSS on mount, eased by GSAP on change. */
function KpiGauge({ percent, icon }: { percent: number; icon: IconSvgElement }) {
  const arcRef = useRef<SVGCircleElement>(null);
  const offset = GAUGE_LENGTH * (1 - Math.min(Math.max(percent, 0), 100) / 100);
  const shown = useRef(offset);

  useEffect(() => {
    const arc = arcRef.current;
    const from = shown.current;
    shown.current = offset;
    if (!arc || from === offset) return;
    withMotion((gsap) => gsap.fromTo(arc, { strokeDashoffset: from }, { strokeDashoffset: offset, duration: 1.1, ease: "power3.out", overwrite: "auto" }));
  }, [offset]);

  return (
    <div className="relative grid size-12 shrink-0 place-items-center" role="img" aria-label={`${Math.round(percent)}% tercapai`}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="24" cy="24" r={GAUGE_RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
        <circle
          ref={arcRef}
          className="kpi-gauge-arc"
          cx="24"
          cy="24"
          r={GAUGE_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={GAUGE_LENGTH}
          strokeDashoffset={offset}
          style={{ "--gauge-length": GAUGE_LENGTH } as React.CSSProperties}
        />
      </svg>
      <span data-wiggle className="inline-flex">
        <Icon icon={icon} className="size-4.5" />
      </span>
    </div>
  );
}
