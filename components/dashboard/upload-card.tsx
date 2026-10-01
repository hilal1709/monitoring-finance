"use client";

import { Banner } from "@/components/ui/banner";
import { DropZone } from "@/components/ui/drop-zone";
import { compactFileName, formatCurrency, formatNumber } from "@/lib/dashboard-format";
import type { LoadedReport } from "@/lib/dashboard-types";
import type { WorkbookRole } from "@/lib/monitoring-dashboard-types";

export function UploadCard({
  role,
  title,
  description,
  isLoading,
  loaded,
  error,
  onPick,
  onDrop,
}: {
  role: WorkbookRole;
  title: string;
  description: string;
  isLoading: boolean;
  loaded?: LoadedReport;
  error?: string;
  onPick: () => void;
  onDrop: (files: FileList) => void;
}) {
  return (
    <div id={role === "invoice" ? "upload-invoice" : "upload-payment"}>
      <DropZone
        title={title}
        description={description}
        buttonLabel={`Upload ${role === "invoice" ? "Invoice" : "Payment"}`}
        busyLabel="Memproses workbook…"
        busy={isLoading}
        onPick={onPick}
        onDrop={onDrop}
        className="min-h-[50vh] sm:min-h-[60vh]"
      >
        {loaded ? (
          <Banner tone="success" title={compactFileName(loaded.file.name)}>
            {formatNumber(loaded.file.rowCount)} baris · {formatCurrency(loaded.file.totalAmount, true)}
            {loaded.id ? ` · upload #${loaded.id}` : null}
          </Banner>
        ) : null}
        {error ? (
          <Banner tone="danger" title="Upload gagal">
            {error}
          </Banner>
        ) : null}
      </DropZone>
    </div>
  );
}
