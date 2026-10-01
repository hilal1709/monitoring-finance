"use client";

import { useRef, useState } from "react";
import { Alert02Icon, Cancel01Icon, CheckmarkCircle02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
import { useIsomorphicLayoutEffect } from "@/lib/use-reveal-animation";
import { cn } from "@/lib/utils";

type Tone = "info" | "warning" | "success" | "danger";

const tones: Record<Tone, { box: string; badge: string; icon: IconSvgElement }> = {
  info: { box: "bg-turquoise/15 ring-turquoise/40", badge: "bg-turquoise text-teal", icon: InformationCircleIcon },
  warning: { box: "bg-sun/35 ring-sun", badge: "bg-sun text-teal", icon: Alert02Icon },
  success: { box: "bg-teal text-mint ring-teal", badge: "bg-turquoise text-teal", icon: CheckmarkCircle02Icon },
  danger: { box: "bg-coral/12 ring-coral/40", badge: "bg-coral text-mint", icon: Alert02Icon },
};

/**
 * Inline notice bar. Slides in on mount; when `dismissible`, collapses smoothly
 * on close. Pass `art` to swap the badge icon for an illustration.
 */
export function Banner({
  tone = "info",
  title,
  children,
  dismissible = false,
  art,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  dismissible?: boolean;
  art?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const style = tones[tone];

  useIsomorphicLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const animations = [
      ...animate(ref.current, [{ opacity: 0, translate: "0 -8px" }, { opacity: 1, translate: "0 0" }], { duration: 0.45, ease: ease.outStrong }),
      ...animate(ref.current.querySelector("[data-banner-badge]"), [{ scale: "0", rotate: "-40deg" }, { scale: "1", rotate: "0deg" }], { duration: 0.5, delay: 0.15, ease: ease.backStrong }),
    ];
    return () => animations.forEach((animation) => animation.cancel());
  }, []);

  function close() {
    const node = ref.current;
    if (!node || prefersReducedMotion()) {
      setOpen(false);
      return;
    }
    animate(
      node,
      [
        { height: `${node.offsetHeight}px`, opacity: 1 },
        { height: "0px", opacity: 0, paddingTop: "0px", paddingBottom: "0px" },
      ],
      { duration: 0.35, ease: ease.in, persist: true, onComplete: () => setOpen(false) },
    );
  }

  if (!open) return null;

  return (
    <div ref={ref} role="status" className={cn("flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm text-teal ring-1", style.box, className)}>
      {art ?? (
        <span data-banner-badge aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-full", style.badge)}>
          <Icon icon={style.icon} className="size-4.5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold leading-5">{title}</p> : null}
        {children ? <div className={cn("text-xs leading-5", title && "opacity-95")}>{children}</div> : null}
      </div>
      {dismissible ? (
        <button
          type="button"
          aria-label="Tutup"
          onClick={close}
          className="grid size-7 shrink-0 place-items-center rounded-md opacity-70 transition hover:bg-teal/10 hover:opacity-100"
        >
          <Icon icon={Cancel01Icon} className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
