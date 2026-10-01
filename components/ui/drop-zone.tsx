"use client";

import { useEffect, useRef, useState } from "react";
import { CloudUploadIcon, Loading03Icon } from "@hugeicons/core-free-icons";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { LoaderBars } from "@/components/ui/page-loader";
import { withMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Upload area modelled on 21st.dev's file-upload card: a faded dot grid, an
 * illustration that floats up while a file is dragged over, a marching
 * border, and a magnetic pick button. Shows animated bars while busy.
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
  const rootRef = useRef<HTMLDivElement>(null);

  const mounted = useRef(false);

  // Drag feedback: the card swells a little and the artwork floats up.
  // Busy changes fade the loader/artwork in. Both skip the first render.
  useEffect(() => {
    if (!mounted.current) return;
    const root = rootRef.current;
    withMotion((gsap) => {
      gsap.to(root, { scale: dragging ? 1.015 : 1, duration: 0.35, ease: "power3.out", overwrite: "auto" });
      gsap.to(root?.querySelector("[data-drop-art]") ?? [], {
        ...(dragging ? { y: -10, rotate: -3, scale: 1.06, ease: "back.out(2.2)" } : { y: 0, rotate: 0, scale: 1, ease: "power3.out" }),
        duration: 0.4,
        overwrite: "auto",
      });
    });
  }, [dragging]);

  useEffect(() => {
    if (!mounted.current) return;
    const art = rootRef.current?.querySelector("[data-drop-art] > *");
    withMotion((gsap) => gsap.from(art ?? [], { autoAlpha: 0, y: 8, scale: 0.94, duration: 0.35, ease: "power2.out" }));
  }, [busy]);

  useEffect(() => {
    mounted.current = true;
  }, []);

  return (
    <Card
      ref={rootRef}
      data-animate-block
      className={cn(
        "relative grid place-items-center gap-0 rounded-2xl p-6 text-center shadow-[var(--soft-shadow)] ring-border transition-colors duration-300 motion-reduce:transition-none",
        dragging && "drop-zone-active bg-turquoise/10",
        className,
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        if (depth.current === 1) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (event.dataTransfer.files.length) onDrop(event.dataTransfer.files);
      }}
    >
      <div aria-hidden className="drop-zone-grid pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-sun/30 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full bg-turquoise/25 blur-2xl" />
      <div className="relative w-full max-w-md">
        <div data-drop-art className="grid place-items-center">
          {busy ? <LoaderBars className="h-28 w-40" /> : art ?? <EmptyUploadIllustration className="h-36" />}
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-teal">{dragging ? "Lepaskan file di sini" : title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        <MagneticButton type="button" size="lg" className="mt-5 w-full" disabled={busy} onClick={onPick}>
          <Icon icon={busy ? Loading03Icon : CloudUploadIcon} className={busy ? "animate-spin" : undefined} />
          {busy ? busyLabel : buttonLabel}
        </MagneticButton>
        <p className="mt-3 text-xs font-medium text-muted-foreground">atau seret & lepas file .xlsx ke area ini</p>
        {children ? <div className="mt-4 space-y-3 text-left">{children}</div> : null}
      </div>
    </Card>
  );
}
