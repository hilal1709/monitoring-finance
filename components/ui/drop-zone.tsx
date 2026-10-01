"use client";

import { useRef, useState } from "react";
import { CloudUploadIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { Icon } from "@/components/ui/icon";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { LoaderBars } from "@/components/ui/page-loader";
import { cn } from "@/lib/utils";

/**
 * Upload area with an illustration, a magnetic pick button and a lively
 * drag state (marching border, slight zoom). Shows animated bars while busy.
 */
export function DropZone({
  title,
  description,
  buttonLabel,
  busyLabel = "Mengunggah…",
  busy,
  onPick,
  onDrop,
  art,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  buttonLabel: string;
  busyLabel?: string;
  busy: boolean;
  onPick: () => void;
  onDrop: (files: FileList) => void;
  art?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const setDrag = setDragging;

  return (
    <div
      data-animate-block
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--soft-shadow)] transition-[background-color,scale] duration-300 ease-out motion-reduce:transition-none",
        dragging && "drop-zone-active bg-turquoise/10 scale-[1.015]",
        className,
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        if (depth.current === 1) setDrag(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDrag(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDrag(false);
        if (event.dataTransfer.files.length) onDrop(event.dataTransfer.files);
      }}
    >
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-sun/30 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full bg-turquoise/25 blur-2xl" />
      <div className="relative w-full max-w-md">
        <div className="grid place-items-center">{busy ? <LoaderBars className="h-28 w-40" /> : art ?? <EmptyUploadIllustration className="h-36" />}</div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-teal">{dragging ? "Lepaskan file di sini" : title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        <MagneticButton type="button" size="lg" className="mt-5 w-full" disabled={busy} onClick={onPick}>
          <Icon icon={busy ? Loading03Icon : CloudUploadIcon} className={busy ? "animate-spin" : undefined} />
          {busy ? busyLabel : buttonLabel}
        </MagneticButton>
        <p className="mt-3 text-xs font-medium text-muted-foreground">atau seret & lepas file .xlsx ke area ini</p>
        {children ? <div className="mt-4 space-y-3 text-left">{children}</div> : null}
      </div>
    </div>
  );
}
