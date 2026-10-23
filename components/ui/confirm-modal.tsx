"use client";

import { Button } from "@/components/ui/button";
import type { ConfirmOptions } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { ErrorIllustration } from "@/components/illustrations";

/** The modal behind `useConfirm()`; loaded on first use (see ConfirmProvider). */
export default function ConfirmModal({ options, onSettle }: { options: ConfirmOptions | null; onSettle: (value: boolean) => void }) {
  const danger = (options?.tone ?? "danger") === "danger";

  return (
    <Modal
      open={options !== null}
      onOpenChange={(open) => !open && onSettle(false)}
      alert
      art={<ErrorIllustration className="h-24" />}
      artTone={danger ? "coral" : "turquoise"}
      title={options?.title}
      description={options?.description}
      className="sm:max-w-sm"
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onSettle(false)}>
            {options?.cancelLabel ?? "Batal"}
          </Button>
          <Button variant={danger ? "destructive" : "default"} onClick={() => onSettle(true)}>
            {options?.confirmLabel ?? (danger ? "Hapus" : "Lanjutkan")}
          </Button>
        </div>
      }
    />
  );
}
