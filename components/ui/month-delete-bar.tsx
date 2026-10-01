"use client";

import { useState } from "react";
import { Delete02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Month = { periodKey: string; label: string };

/** Picks one stored month and asks to delete it. Shared by every data source. */
export function MonthDeleteBar<T extends Month>({
  badge,
  badgeClassName,
  months,
  isDeleting,
  onDelete,
  animateAttr = "data-animate-block",
}: {
  badge: string;
  badgeClassName?: string;
  months: T[];
  isDeleting: (month: T) => boolean;
  onDelete: (month: T) => void;
  animateAttr?: "data-animate-block" | "data-animate-card";
}) {
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");

  if (months.length === 0) return null;

  const selected = months.find((month) => month.periodKey === selectedPeriodKey) ?? months[0];
  const deleting = isDeleting(selected);

  return (
    <section
      {...{ [animateAttr]: true }}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2 shadow-[var(--soft-shadow)] lg:flex-row lg:items-center lg:justify-between"
    >
      <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-teal", badgeClassName ?? "bg-sun")}>
        <span className="size-1.5 rounded-full bg-teal" />
        {badge}
      </span>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={selected.periodKey} onValueChange={setSelectedPeriodKey}>
          <SelectTrigger aria-label={`Pilih bulan ${badge} untuk dihapus`} className="h-9 min-w-0 bg-muted text-xs font-semibold sm:min-w-64">
            <SelectValue>{selected.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.periodKey} value={month.periodKey}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={deleting}
          onClick={() => onDelete(selected)}
          className="h-9 shrink-0 border-coral/40 text-coral-ink hover:border-coral hover:bg-coral hover:text-white"
        >
          <Icon icon={deleting ? Loading03Icon : Delete02Icon} className={cn("size-3.5", deleting && "animate-spin")} />
          Hapus Bulan
        </Button>
      </div>
    </section>
  );
}
