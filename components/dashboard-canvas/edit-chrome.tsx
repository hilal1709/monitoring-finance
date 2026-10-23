"use client";

import { Cancel01Icon, Copy01Icon, Delete02Icon, DragDropVerticalIcon, Edit02Icon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconSvgElement } from "@/components/ui/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Edit-mode frame around one widget: dashed outline, a hover toolbar and a drag
// strip. Loaded with the edit grid, never in view mode.

export type EditChromeProps = {
  title: string;
  isFilter: boolean;
  canEdit: boolean;
  canDuplicate: boolean;
  /** A built-in that was customised: offer going back to the shipped version. */
  canRevert: boolean;
  /** Built-ins are hidden (restorable); custom widgets and filters are deleted. */
  hides: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onRevert: () => void;
  onRemove: () => void;
  children: React.ReactNode;
};

export default function EditChrome({ title, isFilter, canEdit, canDuplicate, canRevert, hides, onEdit, onDuplicate, onRevert, onRemove, children }: EditChromeProps) {
  return (
    <div className="group/widget relative h-full rounded-lg outline-2 outline-dashed outline-offset-2 outline-turquoise/60 hover:outline-turquoise">
      <div className="pointer-events-none h-full overflow-hidden rounded-lg [&_*]:pointer-events-none">{children}</div>
      <div className="absolute right-1 top-1 z-10 flex items-center gap-0.5 rounded-lg bg-teal/95 p-0.5 text-mint opacity-0 shadow-lg transition-opacity focus-within:opacity-100 group-hover/widget:opacity-100 [@media(hover:none)]:opacity-100">
        <ToolButton label="Geser" icon={DragDropVerticalIcon} dragHandle />
        {canEdit ? <ToolButton label={isFilter ? "Ubah filter" : "Ubah"} icon={Edit02Icon} onClick={onEdit} tour="edit-widget" /> : null}
        {canDuplicate ? <ToolButton label="Duplikat" icon={Copy01Icon} onClick={onDuplicate} /> : null}
        {canRevert ? <ToolButton label="Kembalikan versi bawaan" icon={Cancel01Icon} onClick={onRevert} /> : null}
        <ToolButton label={hides ? "Sembunyikan" : "Hapus"} icon={hides ? ViewOffSlashIcon : Delete02Icon} onClick={onRemove} />
      </div>
      <span data-drag-handle className="absolute inset-x-0 top-0 h-6 cursor-grab active:cursor-grabbing" aria-hidden />
      <span className="pointer-events-none absolute bottom-1 left-2 rounded bg-white/90 px-1.5 text-[10px] font-bold text-teal opacity-0 shadow-sm transition-opacity group-hover/widget:opacity-100">{title}</span>
    </div>
  );
}

function ToolButton({ label, icon, onClick, dragHandle, tour }: { label: string; icon: IconSvgElement; onClick?: () => void; dragHandle?: boolean; tour?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-drag-handle={dragHandle ? "" : undefined}
          data-no-drag={dragHandle ? undefined : ""}
          data-tour={tour}
          onClick={onClick}
          className={cn("grid size-7 place-items-center rounded-md transition-colors hover:bg-mint/15 focus-visible:bg-mint/20", dragHandle && "cursor-grab active:cursor-grabbing")}
        >
          <Icon icon={icon} className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
