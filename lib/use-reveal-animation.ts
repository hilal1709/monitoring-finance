"use client";

import { useEffect, useLayoutEffect, type DependencyList, type RefObject } from "react";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";

/**
 * `useLayoutEffect` on the client (runs before the browser paints, so the
 * hidden start state never flashes), `useEffect` on the server (avoids the
 * SSR warning). Reused by other entrance animations to stay flicker-free.
 */
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealOptions = {
  /** CSS selector for the elements to reveal, scoped within the container. */
  selector?: string;
  /** Vertical offset (px) the elements start from. */
  y?: number;
  /** Delay between each element in the stagger (seconds). */
  stagger?: number;
  /** Per-element tween duration (seconds). */
  duration?: number;
};

const DEFAULTS: Required<RevealOptions> = {
  selector: "[data-animate-block]",
  y: 18,
  stagger: 0.07,
  duration: 0.55,
};

/**
 * Staggered slide-up reveal of the elements matching `selector` inside
 * `containerRef`. Blocks already on screen only glide into place — they stay
 * opaque so the server-rendered content is visible (and counts as painted)
 * immediately. Blocks below the fold fade in as they scroll into view.
 * Re-runs whenever `deps` change; a no-op when the user prefers reduced motion.
 */
export function useRevealAnimation(
  containerRef: RefObject<HTMLElement | null>,
  deps: DependencyList,
  options: RevealOptions = {},
) {
  const { selector, y, stagger, duration } = { ...DEFAULTS, ...options };

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || prefersReducedMotion()) return;

    const targets = Array.from(container.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) return;

    const fold = window.innerHeight * 0.95;
    const visible = targets.filter((target) => target.getBoundingClientRect().top < fold);
    const below = targets.filter((target) => target.getBoundingClientRect().top >= fold);
    const animations = animate(visible, [{ translate: `0 ${y}px`, scale: "0.985" }, { translate: "0 0", scale: "1" }], { duration, stagger, ease: ease.outStrong });

    for (const target of below) target.style.opacity = "0";

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement);

        for (const target of entering) {
          observer.unobserve(target);
          target.style.opacity = "";
        }

        animations.push(
          ...animate(entering, [{ opacity: 0, translate: `0 ${y}px`, scale: "0.985" }, { opacity: 1, translate: "0 0", scale: "1" }], {
            duration,
            stagger: stagger * 0.8,
            ease: ease.outStrong,
          }),
        );
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    for (const target of below) observer.observe(target);

    return () => {
      observer.disconnect();
      for (const animation of animations) animation.cancel();
      for (const target of below) target.style.opacity = "";
    };
  }, deps);
}
