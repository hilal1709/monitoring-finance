"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * Primary call-to-action button that leans toward the cursor and springs back,
 * and bounces its leading icon on hover.
 */
export function MagneticButton({ strength = 0.25, onMouseMove, onMouseLeave, onMouseEnter, ...props }: ButtonProps & { strength?: number }) {
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <Button
      ref={ref}
      {...props}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        if (prefersReducedMotion()) return;
        const icon = ref.current?.querySelector("svg");
        animate(icon, [{ translate: "0 0" }, { translate: "0 -4px" }], { duration: 0.18, iterations: 2, direction: "alternate", ease: ease.out });
      }}
      onMouseMove={(event) => {
        onMouseMove?.(event);
        const node = ref.current;
        if (!node || prefersReducedMotion()) return;
        const rect = node.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * strength;
        const y = (event.clientY - rect.top - rect.height / 2) * strength;
        animate(node, [{ translate: `${x}px ${y}px` }], { duration: 0.3, ease: ease.outStrong, persist: true });
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        if (ref.current && !prefersReducedMotion()) animate(ref.current, [{ translate: "0 0" }], { duration: 0.6, ease: ease.elastic, persist: true });
      }}
    />
  );
}
