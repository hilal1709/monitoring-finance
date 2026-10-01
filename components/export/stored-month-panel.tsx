"use client";

import { MonthDeleteBar } from "@/components/ui/month-delete-bar";
import type { ExportStoredMonth } from "@/lib/export-dashboard-types";

export function ExportStoredMonthPanel({
  months,
  deletingKey,
  onDelete,
}: {
  months: ExportStoredMonth[];
  deletingKey: string | null;
  onDelete: (month: ExportStoredMonth) => void;
}) {
  return (
    <MonthDeleteBar
      badge="Ekspor"
      badgeClassName="bg-turquoise"
      animateAttr="data-animate-card"
      months={months}
      isDeleting={(month) => deletingKey === month.periodKey}
      onDelete={onDelete}
    />
  );
}
