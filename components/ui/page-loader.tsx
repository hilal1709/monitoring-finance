"use client";

import { useEffect, useRef } from "react";
import { LogoMark } from "@/components/brand/logo";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Three palette bars bouncing in turn — a CSS-only stand-in for the Lottie loader. */
export function LoaderBars({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex h-12 w-20 items-end justify-center gap-1.5", className)}>
      {["bg-turquoise", "bg-sun", "bg-coral"].map((color, index) => (
        <span key={color} className={cn("loader-bar w-[18%] rounded-full", color)} style={{ animationDelay: `${index * 0.15}s` }} />
      ))}
    </div>
  );
}

/** Branded loading state: spinning mark, bouncing bars and an animated caption. */
export function PageLoader({ label = "Menyiapkan dashboard", fullscreen = false, className }: { label?: string; fullscreen?: boolean; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "grid place-items-center content-center gap-3 py-16 text-center",
        fullscreen && "fixed inset-0 z-[60] bg-background/95 backdrop-blur",
        className,
      )}
    >
      <LogoMark spin className="size-14 drop-shadow-[0_10px_20px_rgba(26,83,92,0.25)]" />
      <LoaderBars />
      <p className="flex items-end gap-0.5 text-sm font-semibold text-teal">
        {label}
        <span className="loader-dot inline-block">.</span>
        <span className="loader-dot inline-block">.</span>
        <span className="loader-dot inline-block">.</span>
      </p>
    </div>
  );
}

/** Thin gradient bar pinned to the top while work is in flight (uploads, navigation). */
export function TopProgress({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef(false);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;

    if (active) {
      shown.current = true;
      bar.getAnimations().forEach((animation) => animation.cancel());
      bar.style.opacity = "1";
      if (prefersReducedMotion()) {
        bar.style.scale = "0.85 1";
        return;
      }
      animate(bar, [{ scale: "0 1" }, { scale: "0.85 1" }], { duration: 6, ease: ease.out, persist: true });
      return;
    }

    if (!shown.current) return;
    shown.current = false;
    bar.getAnimations().forEach((animation) => {
      animation.commitStyles();
      animation.cancel();
    });
    animate(bar, [{ scale: "1 1" }], { duration: 0.25, ease: ease.out, persist: true });
    animate(bar, [{ opacity: 0 }], { duration: 0.3, delay: 0.25, persist: true });
  }, [active]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-[linear-gradient(90deg,var(--palette-turquoise),var(--palette-yellow),var(--palette-coral))] opacity-0 [scale:0_1]"
    />
  );
}
