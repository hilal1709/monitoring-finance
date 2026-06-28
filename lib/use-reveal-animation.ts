"use client";

import { useEffect, useLayoutEffect, type DependencyList, type RefObject } from "react";
import { gsap } from "gsap";

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

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Staggered fade/slide-up reveal of the elements matching `selector` inside
 * `containerRef`. Re-runs whenever `deps` change (e.g. switching dashboard
 * views), and is a no-op when the user prefers reduced motion.
 */
export function useRevealAnimation(
  containerRef: RefObject<HTMLElement | null>,
  deps: DependencyList,
  options: RevealOptions = {},
) {
  const { selector, y, stagger, duration } = { ...DEFAULTS, ...options };

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = Array.from(container.querySelectorAll<HTMLElement>(selector));
    if (targets.length === 0) return;

    if (prefersReducedMotion()) {
      gsap.set(targets, { clearProps: "all" });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration,
          stagger,
          ease: "power2.out",
          clearProps: "transform,opacity,visibility",
        },
      );
    }, container);

    return () => ctx.revert();
  }, deps);
}
