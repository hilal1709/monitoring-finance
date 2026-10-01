"use client";

import { ArrowDown01Icon, Download04Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";

export function ExportPptMenu({ onSelect }: { onSelect: (theme: "black" | "light") => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="accent" className="group">
          <Icon icon={Download04Icon} className="transition-transform group-hover:translate-y-0.5" />
          <span className="sr-only sm:not-sr-only">PPT Ekspor</span>
          <Icon icon={ArrowDown01Icon} className="transition-transform group-aria-expanded:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Pilih template</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onSelect("black")} className="gap-2.5">
          <span className="size-3.5 shrink-0 rounded-full bg-teal ring-2 ring-teal/20" />
          Template SIG Black
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect("light")} className="gap-2.5">
          <span className="size-3.5 shrink-0 rounded-full bg-mint ring-2 ring-teal/20" />
          Template SIG Light
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
