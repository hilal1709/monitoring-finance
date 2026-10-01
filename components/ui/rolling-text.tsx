"use client";

import { useEffect, useRef } from "react";
import { withMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const isDigit = (char: string | undefined) => char !== undefined && char >= "0" && char <= "9";

/**
 * Formatted text whose digits roll into place when it changes (21st.dev
 * "Rolling Digits"): each changed digit springs in from below while the old
 * one rolls out above, or the other way round when the number goes down.
 * Slots are keyed from the right so units stay aligned when the length
 * changes. The first render is plain text, so SSR output and LCP are stable.
 */
export function RollingText({ text, direction, className }: { text: string; direction?: "up" | "down"; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(text);

  useEffect(() => {
    const root = ref.current;
    const before = [...previous.current];
    previous.current = text;
    if (!root || before.join("") === text) return;

    const changed: { digit: HTMLElement; old: string | undefined }[] = [];
    root.querySelectorAll<HTMLElement>("[data-roll-slot]").forEach((slot) => {
      const digit = slot.firstElementChild as HTMLElement | null;
      const old = before[before.length - 1 - Number(slot.dataset.rollSlot)];
      if (digit && old !== digit.textContent) changed.push({ digit, old });
    });
    if (!changed.length) return;

    const sign = direction === "down" ? -1 : 1;
    withMotion((gsap) => {
      // Leftmost digits move first, like an odometer read left to right.
      changed.forEach(({ digit, old }, index) => {
        const delay = index * 0.045;
        if (isDigit(old)) {
          const ghost = document.createElement("span");
          ghost.textContent = old!;
          ghost.className = "absolute inset-0";
          digit.parentElement!.append(ghost);
          gsap.to(ghost, { yPercent: -100 * sign, opacity: 0, duration: 0.45, delay, ease: "power2.in", onComplete: () => ghost.remove() });
        }
        gsap.fromTo(digit, { yPercent: 100 * sign, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.65, delay, ease: "back.out(1.7)", overwrite: "auto" });
      });
    });
  }, [text, direction]);

  const chars = [...text];
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden className="inline-flex whitespace-pre">
        {chars.map((char, index) => {
          const slot = chars.length - 1 - index;
          return isDigit(char) ? (
            <span key={`d${slot}`} data-roll-slot={slot} className="relative inline-block overflow-hidden">
              <span className="inline-block">{char}</span>
            </span>
          ) : (
            <span key={`c${slot}`} className="inline-block overflow-hidden">
              {char}
            </span>
          );
        })}
      </span>
    </span>
  );
}
