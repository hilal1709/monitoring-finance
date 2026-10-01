"use client";

import { useEffect, useRef } from "react";
import { withMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

export type PartitionItem = { label: string; share: number; tooltip?: string };

/**
 * Proportional segmented bar for parts of a whole (21st.dev "Partition Bar").
 * Segments grow in left to right on mount (CSS) and glide to their new
 * widths with GSAP when the data changes (e.g. after a filter).
 */
export function PartitionBar({ items, colors, className }: { items: PartitionItem[]; colors: string[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const segments = items.map((item, index) => ({ ...item, color: colors[index % colors.length] })).filter((item) => item.share > 0);
  const signature = segments.map((segment) => `${segment.label}:${segment.share}`).join("|");
  const previous = useRef<Map<string, number> | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = new Map(segments.map((segment) => [segment.label, segment.share]));
    const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>("[data-segment]") ?? []);
    if (!before || !nodes.length) return;
    // Tween flex-grow from the old shares so every segment glides together.
    withMotion((gsap) => {
      for (const node of nodes) {
        const label = node.dataset.segment!;
        const share = previous.current?.get(label) ?? 0;
        gsap.fromTo(node, { flexGrow: before.get(label) ?? 0 }, { flexGrow: share, duration: 0.7, ease: "power3.out", overwrite: "auto" });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` captures `segments`
  }, [signature]);

  if (segments.length === 0) return null;

  return (
    <div ref={ref} className={cn("flex h-2.5 w-full gap-0.5", className)} role="img" aria-label={segments.map((segment) => `${segment.label} ${Math.round(segment.share * 100)}%`).join(", ")}>
      {segments.map((segment, index) => (
        <span
          key={segment.label}
          data-segment={segment.label}
          title={segment.tooltip ?? segment.label}
          className="partition-segment h-full min-w-1 basis-0 transition-[filter] duration-200 first:rounded-l-full last:rounded-r-full hover:brightness-110"
          style={{ flexGrow: segment.share, backgroundColor: segment.color, "--segment-index": index } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
