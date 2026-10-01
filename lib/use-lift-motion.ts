"use client";

import { useRef } from "react";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";

/**
 * Hover micro-interaction for cards: lifts the card, wiggles its
 * `[data-wiggle]` child and squashes slightly while pressed.
 */
export function useLiftMotion<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const lift = (keyframe: Keyframe, duration = 0.35, easing: string = ease.outStrong) => {
    if (!ref.current || prefersReducedMotion()) return;
    animate(ref.current, [keyframe], { duration, ease: easing, persist: true });
  };

  return {
    ref,
    onMouseEnter: () => {
      lift({ translate: "0 -4px" });
      if (!prefersReducedMotion()) {
        animate(ref.current?.querySelector("[data-wiggle]"), [{ rotate: "0deg" }, { rotate: "-12deg" }, { rotate: "10deg" }, { rotate: "-6deg" }, { rotate: "0deg" }], { duration: 0.55, ease: ease.inOut });
      }
    },
    onMouseLeave: () => lift({ translate: "0 0", scale: "1" }),
    onPointerDown: () => lift({ scale: "0.98" }, 0.12),
    onPointerUp: () => lift({ scale: "1" }, 0.4, ease.backStrong),
  };
}
