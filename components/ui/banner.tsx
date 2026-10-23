"use client";

import { useEffect, useRef, useState } from "react";
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

// Sticky variant: full-width strip pinned to the top of its scroll container.
const stickyTones: Record<Tone, { box: string; badge: string }> = {
  info: { box: "bg-teal text-mint", badge: "bg-turquoise text-teal" },
  warning: { box: "bg-sun text-teal", badge: "bg-teal text-sun" },
  success: { box: "bg-turquoise text-teal", badge: "bg-teal text-mint" },
  danger: { box: "bg-coral text-mint", badge: "bg-mint text-coral" },
};

/**
 * Inline notice bar. Slides in on mount; when `dismissible`, collapses smoothly
 * on close. Pass `art` to swap the badge icon for an illustration.
 *
 * `variant="sticky"` (after Aceternity's "Sticky Banner") renders a full-width
 * strip pinned to the top; with `hideOnScroll` it slides away once the page
 * scrolls down and returns near the top.
 */
export function Banner({
  tone = "info",
  title,
  children,
  dismissible = false,
  art,
  action,
  variant = "inline",
  hideOnScroll = false,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  dismissible?: boolean;
  art?: React.ReactNode;
  /** Extra control on the right, e.g. a small "Lihat" button. */
  action?: React.ReactNode;
  variant?: "inline" | "sticky";
  /** Sticky variant only: slide the banner away while scrolled down. */
  hideOnScroll?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const [hidden, setHidden] = useState(false);
  const sticky = variant === "sticky";
  const style = sticky ? { ...tones[tone], ...stickyTones[tone] } : tones[tone];

  useEffect(() => {
    if (!sticky || !hideOnScroll || !open) return;
    const onScroll = () => setHidden(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sticky, hideOnScroll, open]);

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
    <div
      ref={ref}
      role="status"
      data-hidden={hidden || undefined}
      className={cn(
        "flex items-center gap-3 overflow-hidden text-sm",
        sticky
          ? "sticky top-0 z-40 min-h-12 w-full justify-center px-4 py-2 shadow-[0_10px_30px_-18px_rgba(26,83,92,0.55)] transition-transform duration-300 ease-out data-hidden:-translate-y-full motion-reduce:transition-none"
          : "rounded-xl px-3 py-2.5 text-teal ring-1",
        sticky && dismissible && "pr-11",
        style.box,
        className,
      )}
    >
      {art ?? (
        <span data-banner-badge aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-full", style.badge)}>
          <Icon icon={style.icon} className="size-4.5" />
        </span>
      )}
      <div className={cn("min-w-0", sticky ? "flex flex-wrap items-baseline gap-x-2" : "flex-1")}>
        {title ? <p className="font-bold leading-5">{title}</p> : null}
        {children ? <div className={cn("text-xs leading-5", title && "opacity-95")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
      {dismissible ? (
        <button
          type="button"
          aria-label="Tutup"
          onClick={close}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-md opacity-70 transition hover:opacity-100",
            sticky ? "absolute right-2 hover:bg-current/10" : "hover:bg-teal/10",
          )}
        >
          <Icon icon={Cancel01Icon} className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
