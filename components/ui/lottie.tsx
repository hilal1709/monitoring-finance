"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

// The lottie engine touches `document` when it loads, so keep it client-only.
// LottieSvg ships only the SVG renderer, which is all these animations need.
const LottieSvg = dynamic(() => import("lottie-react").then((module) => module.LottieSvg), { ssr: false });

export type LottieName = "loader" | "upload-success" | "error" | "empty-chart" | "confetti";

/** Plays one of the palette-colored animations in /public/lottie. */
export function Lottie({ name, loop = true, className, onComplete }: { name: LottieName; loop?: boolean; className?: string; onComplete?: () => void }) {
  // The player itself only renders on the client, so reading the media query here is safe.
  const [reduced] = useState(prefersReducedMotion);

  return (
    <div className={cn("pointer-events-none", className)} aria-hidden>
      <LottieSvg
        src={`/lottie/${name}.json`}
        loop={reduced ? false : loop}
        autoplay={!reduced}
        subscriptions={onComplete ? { complete: onComplete } : undefined}
        className="size-full"
      />
    </div>
  );
}
