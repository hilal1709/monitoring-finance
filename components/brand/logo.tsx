"use client";

import { useRef } from "react";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
import { useIsomorphicLayoutEffect } from "@/lib/use-reveal-animation";
import { cn } from "@/lib/utils";

const PETAL = "M0 -2.5C2.5 -14 12 -22.5 24 -22C24 -9 15 -0.5 2.5 1Z";

/**
 * Brand mark: three rounded petals (turquoise, yellow, coral) spinning around
 * a mint core inside a teal tile — cash flowing in a cycle. `spin` keeps it
 * rotating (loaders, pure CSS); otherwise it plays a short twirl on hover.
 */
export function LogoMark({ className, spin = false, intro = false }: { className?: string; spin?: boolean; intro?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (!intro || prefersReducedMotion() || !ref.current) return;
    const animations = animate(ref.current.querySelectorAll("[data-petal]"), [{ scale: "0" }, { scale: "1" }], { duration: 0.7, stagger: 0.12, ease: ease.backStrong });
    return () => animations.forEach((animation) => animation.cancel());
  }, [intro]);

  function twirl() {
    if (spin || prefersReducedMotion()) return;
    animate(ref.current?.querySelector("[data-petals]"), [{ rotate: "0deg" }, { rotate: "120deg" }], { duration: 0.7, ease: ease.back });
  }

  return (
    <svg ref={ref} viewBox="0 0 64 64" className={cn("size-10 shrink-0", className)} onMouseEnter={twirl} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#174D55" />
      <g data-petals className={cn("logo-petals", spin && "logo-petals-spin")}>
        <g transform="translate(32 32)">
          <path data-petal d={PETAL} fill="#4ECDC4" />
          <path data-petal d={PETAL} fill="#FFE66D" transform="rotate(120)" />
          <path data-petal d={PETAL} fill="#FF6B6B" transform="rotate(240)" />
        </g>
      </g>
      <circle cx="32" cy="32" r="3.4" fill="#F7FFF7" />
    </svg>
  );
}

export function Logo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <LogoMark className={onDark ? "ring-1 ring-mint/20 rounded-[25%]" : undefined} intro />
      <div className={cn("min-w-0 leading-[1.05]", onDark ? "text-mint" : "text-teal")}>
        <p className="text-[15px] font-bold tracking-tight">Commercial</p>
        <p className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight">
          Finance
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-sun px-1 text-[11px] font-extrabold text-teal">2</span>
        </p>
      </div>
    </div>
  );
}
