"use client";

import { useRef } from "react";
import {
  Add01Icon,
  ChartHistogramIcon,
  Clock01Icon,
  Cursor01Icon,
  DashboardSquare01Icon,
  FilterAddIcon,
  FloppyDiskIcon,
  HelpCircleIcon,
  LayoutGridIcon,
  Loading03Icon,
  MoreHorizontalIcon,
  Redo02Icon,
  RefreshIcon,
  Undo02Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { withMotion } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "@/lib/use-reveal-animation";
import { cn } from "@/lib/utils";

/**
 * Edit-mode toolbar floating at the bottom of the screen, after Aceternity's
 * "Floating Dock": icons swell under the pointer (GSAP instead of framer-motion).
 */
export function CanvasDock({
  canUndo,
  canRedo,
  dirty,
  saving,
  crossFilter,
  hidden,
  onAddChart,
  onAddCard,
  onAddFilter,
  onTemplates,
  onUndo,
  onRedo,
  onToggleCrossFilter,
  onRestoreHidden,
  onGuide,
  onTour,
  onVersions,
  onReset,
  onCancel,
  onSave,
}: {
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  saving: boolean;
  crossFilter: boolean;
  hidden: { id: string; title: string }[];
  onAddChart: () => void;
  onAddCard: () => void;
  onAddFilter: () => void;
  onTemplates: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleCrossFilter: () => void;
  onRestoreHidden: (id: string) => void;
  onGuide: () => void;
  onTour: () => void;
  onVersions: () => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const dockRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    withMotion((gsap) => gsap.from(dock, { y: 40, opacity: 0, duration: 0.45, ease: "back.out(1.6)", clearProps: "transform,opacity" }));
  }, []);

  // Magnification: each icon scales with its distance from the pointer.
  function magnify(event: React.PointerEvent<HTMLDivElement>) {
    const icons = Array.from(dockRef.current?.querySelectorAll<HTMLElement>("[data-dock-icon]") ?? []);
    withMotion((gsap) => {
      for (const icon of icons) {
        const rect = icon.getBoundingClientRect();
        const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
        const scale = 1 + Math.max(0, 1 - distance / 110) * 0.35;
        gsap.to(icon, { scale, duration: 0.2, ease: "power2.out", overwrite: "auto" });
      }
    });
  }

  function settle() {
    const icons = Array.from(dockRef.current?.querySelectorAll<HTMLElement>("[data-dock-icon]") ?? []);
    withMotion((gsap) => gsap.to(icons, { scale: 1, duration: 0.25, ease: "power2.out", overwrite: "auto" }));
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3">
      <div
        ref={dockRef}
        role="toolbar"
        aria-label="Alat mengatur dashboard"
        data-tour="dock"
        onPointerMove={magnify}
        onPointerLeave={settle}
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-teal/15 bg-white/95 p-1.5 shadow-[0_24px_50px_-18px_rgba(26,83,92,0.55)] backdrop-blur"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" className="shrink-0" data-tour="add-widget">
              <Icon icon={Add01Icon} />
              Tambah
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60">
            <DropdownMenuLabel>Tambah ke dashboard</DropdownMenuLabel>
            <MenuItem icon={ChartHistogramIcon} label="Grafik" hint="Batang, garis, donat, tabel…" onSelect={onAddChart} />
            <MenuItem icon={DashboardSquare01Icon} label="Card angka" hint="Satu angka + MoM/YoY/YTD" onSelect={onAddCard} />
            <MenuItem icon={FilterAddIcon} label="Filter" hint="Saring semua atau sebagian widget" onSelect={onAddFilter} />
            <DropdownMenuSeparator />
            <MenuItem icon={LayoutGridIcon} label="Dari template" hint="Contoh siap pakai" onSelect={onTemplates} />
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="mx-1 h-6 w-px shrink-0 bg-teal/15" aria-hidden />
        <DockIcon label="Urungkan" icon={Undo02Icon} onClick={onUndo} disabled={!canUndo} />
        <DockIcon label="Ulangi" icon={Redo02Icon} onClick={onRedo} disabled={!canRedo} />
        <DockIcon label={crossFilter ? "Klik-untuk-filter: aktif" : "Klik-untuk-filter: mati"} icon={Cursor01Icon} onClick={onToggleCrossFilter} active={crossFilter} />

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button type="button" data-dock-icon aria-label="Widget tersembunyi" className="relative grid size-9 shrink-0 place-items-center rounded-xl text-teal hover:bg-turquoise/15">
                  <Icon icon={ViewIcon} className="size-4.5" />
                  {hidden.length ? <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-coral text-[9px] font-black text-mint">{hidden.length}</span> : null}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Widget tersembunyi</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="top" className="w-64">
            <DropdownMenuLabel>Munculkan lagi</DropdownMenuLabel>
            {hidden.length ? (
              hidden.map((item) => (
                <DropdownMenuItem key={item.id} onSelect={() => onRestoreHidden(item.id)}>
                  {item.title}
                </DropdownMenuItem>
              ))
            ) : (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Tidak ada widget yang disembunyikan.</p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DockIcon label="Panduan" icon={HelpCircleIcon} onClick={onGuide} tour="guide" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" data-dock-icon aria-label="Lainnya" className="grid size-9 shrink-0 place-items-center rounded-xl text-teal hover:bg-turquoise/15">
              <Icon icon={MoreHorizontalIcon} className="size-4.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-60">
            <MenuItem icon={HelpCircleIcon} label="Putar ulang tur" onSelect={onTour} />
            <MenuItem icon={Clock01Icon} label="Riwayat versi" hint="Pulihkan simpanan sebelumnya" onSelect={onVersions} />
            <DropdownMenuSeparator />
            <MenuItem icon={RefreshIcon} label="Kembalikan ke tampilan awal" onSelect={onReset} danger />
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="mx-1 h-6 w-px shrink-0 bg-teal/15" aria-hidden />
        <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={onCancel}>
          Batal
        </Button>
        <Button type="button" size="sm" variant="accent" className="shrink-0" onClick={onSave} disabled={saving || !dirty} data-tour="save">
          <Icon icon={saving ? Loading03Icon : FloppyDiskIcon} className={saving ? "animate-spin" : undefined} />
          {saving ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </div>
    </TooltipProvider>
  );
}

function DockIcon({ label, icon, onClick, disabled, active, tour }: { label: string; icon: IconSvgElement; onClick: () => void; disabled?: boolean; active?: boolean; tour?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-dock-icon
          data-tour={tour}
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-teal transition-colors hover:bg-turquoise/15 disabled:opacity-35", active && "bg-sun hover:bg-sun")}
        >
          <Icon icon={icon} className="size-4.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function MenuItem({ icon, label, hint, onSelect, danger }: { icon: IconSvgElement; label: string; hint?: string; onSelect: () => void; danger?: boolean }) {
  return (
    <DropdownMenuItem onSelect={onSelect} className={cn("items-start gap-2", danger && "text-coral-ink")}>
      <Icon icon={icon} className="mt-0.5 size-4" />
      <span className="grid">
        <span className="font-semibold">{label}</span>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </span>
    </DropdownMenuItem>
  );
}
