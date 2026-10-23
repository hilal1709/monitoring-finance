"use client";

import { useRef, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Confetti } from "@/components/ui/confetti";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
import { useIsomorphicLayoutEffect } from "@/lib/use-reveal-animation";

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const fmt = (n: number) => numberFormatter.format(n);

const RING_RADIUS = 58;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Achievement ring that draws itself to the percentage and celebrates at ≥100%. */
export function AchievementRing({ percent }: { percent: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [celebrate, setCelebrate] = useState(false);

  const finalOffset = RING_LENGTH * (1 - Math.min(Math.max(percent, 0), 100) / 100);

  // The arc is server-rendered at its final length; on the client it draws
  // itself from empty, then celebrates at >= 100%.
  useIsomorphicLayoutEffect(() => {
    const arc = ref.current?.querySelector("[data-ring-arc]");
    if (!arc) return;
    setCelebrate(false);
    if (prefersReducedMotion()) {
      setCelebrate(percent >= 100);
      return;
    }
    const animations = [
      ...animate(arc, [{ strokeDashoffset: `${RING_LENGTH}` }, { strokeDashoffset: `${finalOffset}` }], { duration: 1.4, ease: ease.outStrong, onComplete: () => setCelebrate(percent >= 100) }),
      ...animate(ref.current, [{ scale: "0.85", rotate: "-8deg" }, { scale: "1", rotate: "0deg" }], { duration: 0.8, ease: ease.backStrong }),
    ];
    return () => animations.forEach((animation) => animation.cancel());
  }, [percent]);

  return (
    <div ref={ref} className="relative grid size-40 place-items-center">
      <svg viewBox="0 0 140 140" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="70" cy="70" r={RING_RADIUS} fill="none" stroke="var(--palette-yellow)" strokeOpacity="0.45" strokeWidth="12" />
        <circle
          data-ring-arc
          cx="70"
          cy="70"
          r={RING_RADIUS}
          fill="none"
          stroke={percent >= 100 ? "var(--palette-turquoise)" : "var(--palette-coral)"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={finalOffset}
        />
      </svg>
      <div className="grid size-[104px] place-items-center rounded-full bg-teal text-center text-mint shadow-[0_12px_30px_-12px_rgba(26,83,92,0.8)]">
        <div>
          <p className="whitespace-nowrap text-xl font-black leading-none tabular-nums">
            <AnimatedNumber value={percent} format={(value) => `${fmt(value)}%`} />
          </p>
          <p className="mt-1 px-2 text-[10px] font-bold leading-3">Pencapaian Terhadap Target</p>
        </div>
      </div>
      {celebrate ? <Confetti /> : null}
    </div>
  );
}

