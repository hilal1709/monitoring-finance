"use client";

import { useRef } from "react";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
import { useIsomorphicLayoutEffect } from "@/lib/use-reveal-animation";
import { cn } from "@/lib/utils";

/**
 * Pill toggle whose highlight glides between options, with a small
 * squash on press. `size="xs"` fits inside chart headers.
 */
export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  size = "sm",
  className,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  size?: "xs" | "sm";
  className?: string;
  ariaLabel?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  useIsomorphicLayoutEffect(() => {
    const container = root.current;
    const indicator = pill.current;
    const active = container?.querySelector<HTMLButtonElement>(`[data-active="true"]`);
    if (!container || !indicator || !active) return;
    const target = { translate: `${active.offsetLeft}px 0`, width: `${active.offsetWidth}px` };
    if (!placed.current || prefersReducedMotion()) {
      Object.assign(indicator.style, target);
      placed.current = true;
      return;
    }
    animate(indicator, [target], { duration: 0.45, ease: ease.back, persist: true });
  }, [value, options.length]);

  return (
    <div
      ref={root}
      role="tablist"
      aria-label={ariaLabel}
      className={cn("relative inline-flex rounded-lg border border-border bg-muted p-0.5", size === "xs" ? "text-[10px]" : "text-xs", className)}
    >
      <span ref={pill} aria-hidden className="absolute bottom-0.5 left-0 top-0.5 rounded-md bg-sun shadow-[0_4px_10px_-4px_rgba(26,83,92,0.45)]" />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            onClick={(event) => {
              if (!prefersReducedMotion()) animate(event.currentTarget, [{ scale: "0.92" }, { scale: "1" }], { duration: 0.35, ease: ease.backStrong });
              onChange(option.value);
            }}
            className={cn(
              "relative z-10 rounded-md font-bold transition-colors",
              size === "xs" ? "min-h-7 px-3" : "h-8 px-3",
              active ? "text-teal" : "text-teal/90 hover:text-teal",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
