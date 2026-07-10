"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");

  if (months.length === 0) {
    return null;
  }

  const selectedMonth = months.find((month) => month.periodKey === selectedPeriodKey) ?? months[0];
  const isDeleting = deletingKey === `${role}:${selectedMonth.periodKey}`;

  return (
    <section data-animate-block className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--soft-shadow)] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <Badge className="shrink-0 border-[#ffd166]/30 bg-[#ffd166]/10 text-[#ffd166]">
          {role === "invoice" ? "Invoice" : "Payment"}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          aria-label="Pilih bulan untuk dihapus"
          value={selectedMonth.periodKey}
          onChange={(event) => setSelectedPeriodKey(event.target.value)}
          className="h-9 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--app-fg)] outline-none focus:border-[#ffd166]/60 sm:min-w-64"
        >
          {months.map((month) => (
            <option key={month.periodKey} value={month.periodKey}>
              {month.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isDeleting}
          onClick={() => onDelete(selectedMonth)}
          className="h-9 shrink-0 rounded-lg border border-[#ff9f8e]/25 bg-[#ff9f8e]/10 text-[#ffb4a6] hover:bg-[#ff9f8e]/15"
        >
          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Hapus Bulan
        </Button>
      </div>
    </section>
  );
}
