"use client";

import { useRef } from "react";
import { withMotion } from "@/lib/gsap";

/**
 * Hover interaction for KPI stat cards (21st.dev "spotlight card" pattern):
 * a soft light follows the pointer, the card lifts, its `[data-wiggle]` icon
 * wiggles, and it squashes slightly while pressed. Pair with a
 * `.kpi-spotlight` child, which reads `--spot-x`, `--spot-y` and `--spot-o`.
 */
export function useSpotlightLift<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const spot = (event: React.PointerEvent<T>, duration: number) => {
    const card = ref.current;
    if (!card) return;
    const box = card.getBoundingClientRect();
    withMotion((gsap) =>
      gsap.to(card, {
        "--spot-x": `${event.clientX - box.left}px`,
        "--spot-y": `${event.clientY - box.top}px`,
        duration,
        ease: "power3.out",
        overwrite: "auto",
      }),
    );
  };

  return {
    ref,
    onPointerEnter: (event: React.PointerEvent<T>) => {
      const card = ref.current;
      if (!card || event.pointerType !== "mouse") return;
      spot(event, 0);
      withMotion((gsap) => {
        gsap.to(card, { y: -4, "--spot-o": 1, duration: 0.35, ease: "power3.out" });
        const icon = card.querySelector("[data-wiggle]");
        if (icon) {
          gsap.timeline().to(icon, { rotate: -12, duration: 0.12, ease: "sine.out" }).to(icon, { rotate: 10, duration: 0.14 }).to(icon, { rotate: -6, duration: 0.12 }).to(icon, { rotate: 0, duration: 0.17, ease: "sine.inOut" });
        }
      });
    },
    onPointerMove: (event: React.PointerEvent<T>) => {
      if (event.pointerType === "mouse") spot(event, 0.3);
    },
    onPointerLeave: () => {
      const card = ref.current;
      if (card) withMotion((gsap) => gsap.to(card, { y: 0, scale: 1, "--spot-o": 0, duration: 0.4, ease: "power3.out" }));
    },
    onPointerDown: () => {
      const card = ref.current;
      if (card) withMotion((gsap) => gsap.to(card, { scale: 0.98, duration: 0.12, ease: "power2.out" }));
    },
    onPointerUp: () => {
      const card = ref.current;
      if (card) withMotion((gsap) => gsap.to(card, { scale: 1, duration: 0.45, ease: "back.out(3)" }));
    },
  };
}
