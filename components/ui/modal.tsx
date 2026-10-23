"use client";

import { useCallback } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { withMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type ArtTone = "turquoise" | "coral" | "sun" | "teal";

const artTones: Record<ArtTone, string> = {
  turquoise: "bg-[linear-gradient(180deg,rgba(78,205,196,0.2),transparent)]",
  coral: "bg-[linear-gradient(180deg,rgba(255,107,107,0.14),transparent)]",
  sun: "bg-[linear-gradient(180deg,rgba(255,230,109,0.4),transparent)]",
  teal: "bg-[linear-gradient(180deg,rgba(23,77,85,0.12),transparent)]",
};

export type ModalProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional element that opens the modal (rendered via Radix `asChild`). */
  trigger?: React.ReactNode;
  /** Illustration shown in a tinted band at the top of the modal. */
  art?: React.ReactNode;
  artTone?: ArtTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Alert semantics: role="alertdialog" and clicks outside don't close it. */
  alert?: boolean;
  showCloseButton?: boolean;
  /** Center the header text (default) or align it left for form-like modals. */
  align?: "center" | "start";
  className?: string;
};

/**
 * Themed modal on top of the shadcn Dialog, after Aceternity's "Animated Modal":
 * the panel springs up from a tilted, shrunken state and its parts stagger in
 * (GSAP, skipped for reduced-motion users).
 */
export function Modal({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  art,
  artTone = "turquoise",
  title,
  description,
  children,
  footer,
  alert = false,
  showCloseButton = !alert,
  align = "center",
  className,
}: ModalProps) {
  // Radix remounts the content on every open, so the ref runs once per opening.
  const animateIn = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    let cancelled = false;
    let kill: (() => void) | undefined;
    withMotion((gsap) => {
      if (cancelled) return;
      const timeline = gsap
        .timeline()
        // GSAP folds the panel's CSS `translate: -50% -50%` (centering) into its own
        // transform, so keep that offset explicitly or the panel jumps while animating.
        .fromTo(
          node,
          { opacity: 0, scale: 0.6, rotationX: 32, xPercent: -50, yPercent: -50, y: 40, transformPerspective: 900 },
          { opacity: 1, scale: 1, rotationX: 0, xPercent: -50, yPercent: -50, y: 0, duration: 0.55, ease: "back.out(1.5)", clearProps: "transform,translate" },
        )
        .from(node.querySelectorAll("[data-modal-part]"), { opacity: 0, y: 14, duration: 0.4, stagger: 0.06, ease: "power3.out", clearProps: "opacity,transform" }, 0.12)
        .from(node.querySelectorAll("[data-modal-art] > *"), { scale: 0.4, rotation: -12, duration: 0.6, ease: "back.out(2)", clearProps: "transform" }, 0.15);
      kill = () => timeline.kill();
    });
    return () => {
      cancelled = true;
      kill?.();
    };
  }, []);

  const centered = align === "center";

  return (
    <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        ref={animateIn}
        role={alert ? "alertdialog" : "dialog"}
        showCloseButton={showCloseButton}
        onInteractOutside={alert ? (event) => event.preventDefault() : undefined}
        className={cn(
          "gap-3 overflow-hidden rounded-2xl bg-card p-6 text-teal shadow-[0_30px_60px_-20px_rgba(26,83,92,0.45)] ring-teal/10 data-open:animate-none sm:max-w-md",
          className,
        )}
      >
        {art ? (
          <div data-modal-art className={cn("-mx-6 -mt-6 mb-1 grid place-items-center pt-6", artTones[artTone])}>
            {art}
          </div>
        ) : null}
        <DialogTitle data-modal-part className={cn("text-lg font-bold leading-6 text-teal", centered && "text-center")}>
          {title}
        </DialogTitle>
        {description ? (
          <DialogDescription data-modal-part className={cn("text-sm text-muted-foreground", centered && "text-center")}>
            {description}
          </DialogDescription>
        ) : null}
        {/* min-w-0: wide children (carousels, tables) must not stretch the grid track. */}
        {children ? (
          <div data-modal-part className="min-w-0">
            {children}
          </div>
        ) : null}
        {footer ? (
          <div data-modal-part className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:sm:min-w-24">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Closes the surrounding Modal; wrap a Button in it (`<ModalClose asChild>`). */
export const ModalClose = DialogClose;
