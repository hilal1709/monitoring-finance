"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/export-dashboard-format";
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
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");

  if (months.length === 0) {
    return null;
  }

  const totalRows = months.reduce((sum, month) => sum + month.rowCount, 0);
  const totalUsd = months.reduce((sum, month) => sum + month.totalUsd, 0);
  const selectedMonth = months.find((month) => month.periodKey === selectedPeriodKey) ?? months[0];
  const isDeleting = deletingKey === selectedMonth.periodKey;

  return (
    <section data-animate-card className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--soft-shadow)] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <Badge className="shrink-0 border-[#7dd3fc]/30 bg-[#7dd3fc]/10 text-[#7dd3fc]">Ekspor</Badge>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Data Bulanan</p>
          <p className="truncate text-xs font-semibold text-[var(--app-fg)]">
            {months.length} bulan - {totalRows.toLocaleString("id-ID")} rows - {formatUsd(totalUsd)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          aria-label="Pilih bulan Ekspor untuk dihapus"
          value={selectedMonth.periodKey}
          onChange={(event) => setSelectedPeriodKey(event.target.value)}
          className="h-9 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-semibold text-[var(--app-fg)] outline-none focus:border-[#ffd166]/60 sm:min-w-64"
        >
          {months.map((month) => (
            <option key={month.periodKey} value={month.periodKey}>
              {month.label} - {month.rowCount.toLocaleString("id-ID")} rows - {formatUsd(month.totalUsd)}
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
