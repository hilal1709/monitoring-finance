"use client";

import { MonthDeleteBar } from "@/components/ui/month-delete-bar";
import type { StoredMonth } from "@/lib/dashboard-types";
import type { WorkbookRole } from "@/lib/monitoring-dashboard-types";

export function StoredMonthPanel({
  role,
  months,
  deletingKey,
  onDelete,
}: {
  role: WorkbookRole;
  months: StoredMonth[];
  deletingKey: string | null;
  onDelete: (month: StoredMonth) => void;
}) {
  return (
    <MonthDeleteBar
      badge={role === "invoice" ? "Invoice" : "Payment"}
      badgeClassName={role === "invoice" ? "bg-sun" : "bg-turquoise"}
      months={months}
      isDeleting={(month) => deletingKey === `${role}:${month.periodKey}`}
      onDelete={onDelete}
    />
  );
}
