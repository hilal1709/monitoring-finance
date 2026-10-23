"use client";

import { useEffect, useRef } from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { withAnime } from "@/lib/anime";
import { withMotion } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const BARS = [
  { x: 14, height: 0.55, fill: "var(--palette-turquoise)" },
  { x: 38, height: 0.85, fill: "var(--palette-yellow)" },
  { x: 62, height: 0.4, fill: "var(--palette-coral)" },
  { x: 86, height: 1, fill: "var(--palette-turquoise)" },
  { x: 110, height: 0.7, fill: "var(--palette-teal)" },
];
const BAR_WIDTH = 16;
const BASE_Y = 84;
const MAX_HEIGHT = 64;

/** anime.js function value: picks a bar height by the target's index. */
const barHeight = (pick: (index: number) => number) => (_target: unknown, index?: number) => pick(index ?? 0);

const sizes = { sm: "w-20", md: "w-32", lg: "w-44" } as const;

/**
 * Loading state for charts: palette bars grow and shrink in turn while a trend
 * line draws over them (anime.js, loaded lazily). Reduced-motion users get a
 * gentle CSS opacity pulse instead (`.chart-loader` in globals.css).
 */
export function ChartLoader({ label = "Memuat grafik", className, size = "md" }: { label?: string; className?: string; size?: keyof typeof sizes }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    withAnime(({ animate, stagger, createDrawable }) => {
      if (cancelled) return;
      const bars = svg.querySelectorAll<SVGRectElement>("[data-chart-bar]");
      const growth = animate(bars, {
        scaleY: [
          { from: 0.12, to: barHeight((index) => BARS[index].height), duration: 700 },
          { to: barHeight((index) => BARS[(index + 2) % BARS.length].height * 0.7), duration: 650 },
          { to: barHeight((index) => BARS[index].height), duration: 650 },
        ],
        delay: stagger(90),
        ease: "inOutSine",
        loop: true,
        loopDelay: 250,
      });
      const line = animate(createDrawable(svg.querySelectorAll("[data-chart-line]")), {
        draw: ["0 0", "0 1", "1 1"],
        duration: 2200,
        ease: "inOutQuad",
        loop: true,
        loopDelay: 250,
      });
      stop = () => {
        growth.revert();
        line.revert();
      };
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  const linePoints = BARS.map((bar) => `${bar.x + BAR_WIDTH / 2},${BASE_Y - bar.height * MAX_HEIGHT - 8}`).join(" ");

  return (
    <div role="status" aria-live="polite" className={cn("chart-loader grid place-items-center gap-2 text-center", className)}>
      <svg ref={ref} viewBox="0 0 140 96" className={cn("h-auto", sizes[size])} aria-hidden>
        <path d={`M8 ${BASE_Y + 2}h124`} stroke="var(--palette-teal)" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
        {BARS.map((bar) => (
          <rect
            key={bar.x}
            data-chart-bar
            x={bar.x}
            y={BASE_Y - MAX_HEIGHT}
            width={BAR_WIDTH}
            height={MAX_HEIGHT}
            rx="4"
            fill={bar.fill}
            style={{ transformBox: "fill-box", transformOrigin: "50% 100%", transform: `scaleY(${bar.height})` }}
          />
        ))}
        <polyline data-chart-line points={linePoints} fill="none" stroke="var(--palette-teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" />
      </svg>
      {label ? <p className="text-xs font-semibold text-teal/80">{label}</p> : null}
    </div>
  );
}

const ROW_HEIGHT = 40;

/**
 * Step-by-step progress for long jobs like uploads, after Aceternity's
 * "Multi Step Loader": finished steps get a check, the current one spins and
 * the list glides up as it advances (GSAP). `current` is the 0-based index of
 * the running step; pass `steps.length` once everything is done.
 */
export function MultiStepLoader({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  const listRef = useRef<HTMLOListElement>(null);
  const done = current >= steps.length;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // Keep the running step on the middle row of the three visible ones.
    const offset = -Math.max(0, Math.min(current, steps.length - 1) - 1) * ROW_HEIGHT;
    if (prefersReducedMotion()) {
      list.style.transform = `translateY(${offset}px)`;
      return;
    }
    withMotion((gsap) => {
      gsap.to(list, { y: offset, duration: 0.5, ease: "power3.out" });
      const badge = list.querySelector(`[data-step="${Math.min(current, steps.length) - 1}"] [data-step-badge]`);
      if (badge) gsap.fromTo(badge, { scale: 0.3, rotation: -45 }, { scale: 1, rotation: 0, duration: 0.5, ease: "back.out(3)" });
    });
  }, [current, steps.length]);

  return (
    <div className={cn("rounded-2xl bg-card p-4 text-teal shadow-[var(--soft-shadow)] ring-1 ring-border", className)}>
      <p className="sr-only" aria-live="polite">
        {done ? "Semua langkah selesai" : `Langkah ${current + 1} dari ${steps.length}: ${steps[current]}`}
      </p>
      <div
        aria-hidden
        className="relative overflow-hidden [mask-image:linear-gradient(180deg,transparent,#000_25%,#000_75%,transparent)]"
        style={{ height: ROW_HEIGHT * Math.min(3, steps.length) }}
      >
        <ol ref={listRef}>
          {steps.map((step, index) => {
            const state = index < current ? "done" : index === current ? "active" : "pending";
            return (
              <li
                key={step}
                data-step={index}
                className={cn(
                  "flex items-center gap-3 text-sm transition-opacity duration-300",
                  state === "pending" && "opacity-45",
                  state === "done" && "opacity-70",
                )}
                style={{ height: ROW_HEIGHT }}
              >
                <span data-step-badge className="grid size-6 shrink-0 place-items-center">
                  {state === "done" ? (
                    <Icon icon={CheckmarkCircle02Icon} className="size-6 text-turquoise" />
                  ) : state === "active" ? (
                    <span className="size-5 animate-spin rounded-full border-[3px] border-turquoise/25 border-t-turquoise motion-reduce:animate-none" />
                  ) : (
                    <span className="size-5 rounded-full border-2 border-teal/25" />
                  )}
                </span>
                <span className={cn("truncate", state === "active" ? "font-bold" : "font-medium", state === "done" && "line-through decoration-turquoise/60")}>{step}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
