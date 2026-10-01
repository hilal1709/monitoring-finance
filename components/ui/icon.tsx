"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export type { IconSvgElement };

/** Thin wrapper so every Hugeicon shares the same stroke weight and sizing. */
export function Icon({ icon, className, strokeWidth = 1.8, size }: { icon: IconSvgElement; className?: string; strokeWidth?: number; size?: number }) {
  return <HugeiconsIcon icon={icon} strokeWidth={strokeWidth} size={size} className={cn("size-4 shrink-0", className)} aria-hidden />;
}
