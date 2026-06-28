"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ExportPptMenu({ onSelect }: { onSelect: (theme: "black" | "light") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (theme: "black" | "light") => {
    setOpen(false);
    onSelect(theme);
  };

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-[#34d399]/50 bg-[#34d399]/10 text-[#a7f3d0] hover:bg-[#34d399]/20"
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span className="hidden sm:inline">PPT Ekspor</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => choose("black")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--app-fg)] hover:bg-white/10"
          >
            <span className="h-3 w-3 shrink-0 rounded-full bg-[#0e2841]" />
            Template SIG Black
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose("light")}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--app-fg)] hover:bg-white/10"
          >
            <span className="h-3 w-3 shrink-0 rounded-full border border-[var(--border)] bg-[#f1f5f9]" />
            Template SIG Light
          </button>
        </div>
      ) : null}
    </div>
  );
}
