"use client";

import { useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ConfirmOptions } from "@/components/ui/confirm-dialog";
import { ErrorIllustration } from "@/components/illustrations";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";

/** The modal behind `useConfirm()`; loaded on first use (see ConfirmProvider). */
export default function ConfirmModal({ options, onSettle }: { options: ConfirmOptions | null; onSettle: (value: boolean) => void }) {
  // Stagger the modal content in once Radix has mounted it.
  const animateIn = useCallback((node: HTMLDivElement | null) => {
    if (!node || prefersReducedMotion()) return;
    animate(node.querySelectorAll("[data-confirm-part]"), [{ opacity: 0, translate: "0 14px" }, { opacity: 1, translate: "0 0" }], { duration: 0.45, stagger: 0.07, delay: 0.05, ease: ease.back });
  }, []);

  const danger = (options?.tone ?? "danger") === "danger";

  return (
    <AlertDialog open={options !== null} onOpenChange={(open) => !open && onSettle(false)}>
      <AlertDialogContent ref={animateIn} className="max-w-sm! gap-3 overflow-hidden rounded-2xl p-6 text-center shadow-[0_30px_60px_-20px_rgba(26,83,92,0.45)]">
        <div data-confirm-part className="-mx-6 -mt-6 mb-1 grid place-items-center bg-[linear-gradient(180deg,rgba(255,107,107,0.14),transparent)] pt-6">
          <ErrorIllustration className="h-24" />
        </div>
        <AlertDialogTitle data-confirm-part className="text-center text-lg font-bold text-teal">
          {options?.title}
        </AlertDialogTitle>
        {options?.description ? (
          <AlertDialogDescription data-confirm-part className="text-center text-sm text-muted-foreground">
            {options.description}
          </AlertDialogDescription>
        ) : null}
        <AlertDialogFooter data-confirm-part className="mx-0 mb-0 mt-2 grid grid-cols-2 gap-2 border-0 bg-transparent p-0">
          <AlertDialogCancel onClick={() => onSettle(false)}>{options?.cancelLabel ?? "Batal"}</AlertDialogCancel>
          <AlertDialogAction variant={danger ? "destructive" : "default"} onClick={() => onSettle(true)}>
            {options?.confirmLabel ?? (danger ? "Hapus" : "Lanjutkan")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
