"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Renders `value` formatted with `format`; when the value later changes (e.g.
 * a filter is applied) it counts from the previous value to the new one.
 * The first render shows the final value straight away so server-rendered
 * numbers are visible — and stable for LCP — before any script runs.
 */
export function AnimatedNumber({ value, format, duration = 1.1, className }: { value: number; format: (value: number) => string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  useEffect(() => {
    const node = ref.current;
    const from = shown.current;
    if (!node || from === value) return;

    if (prefersReducedMotion()) {
      shown.current = value;
      node.textContent = format(value);
      return;
    }

    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      shown.current = from + (value - from) * easeOutCubic(progress);
      node.textContent = format(shown.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    });

    return () => cancelAnimationFrame(frame);
  }, [value, format, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}

/**
 * Splits a formatted string like "Rp 2,06 T" or "136%" into prefix, number and
 * suffix so the numeric part can be animated. Returns null when no number exists.
 */
export function parseDisplayNumber(text: string): { prefix: string; number: number; decimals: number; suffix: string; locale: "id" | "en" } | null {
  const match = text.match(/^(.*?)(-?\d[\d.,]*)(.*)$/);
  if (!match) return null;
  const [, prefix, raw, suffix] = match;
  // Indonesian formatting uses "." for thousands and "," for decimals.
  const idStyle = /,\d{1,2}$/.test(raw) || /\.\d{3}(\D|$)/.test(raw);
  const normalized = idStyle ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  const number = Number(normalized);
  if (!Number.isFinite(number)) return null;
  const decimals = normalized.includes(".") ? normalized.split(".")[1].length : 0;
  return { prefix, number, decimals, suffix, locale: idStyle ? "id" : "en" };
}

/** Animates the numeric portion of an already-formatted display string. */
export function AnimatedDisplay({ text, className }: { text: string; className?: string }) {
  const parsed = parseDisplayNumber(text);
  if (!parsed) return <span className={className}>{text}</span>;
  const { prefix, number, decimals, suffix, locale } = parsed;
  const formatter = new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <AnimatedNumber value={number} className={className} format={(value) => `${prefix}${formatter.format(value)}${suffix}`} />;
}
