"use client";

import { Loading03Icon, CloudUploadIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExportViewPayload } from "@/lib/export-dashboard-types";

export function ExportToolbar({
  data,
  selectedPeriod,
  selectedCompany,
  uploading,
  onPeriodChange,
  onCompanyChange,
  onUpload,
}: {
  data: ExportViewPayload;
  selectedPeriod: string;
  selectedCompany: string;
  uploading: boolean;
  onPeriodChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onUpload: () => void;
}) {
  const companies = [...new Set(data.records.map((record) => record.companyCode))].sort();

  return (
    <section data-animate-card className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
      <div className="min-w-0 flex-1 px-1">
        <p className="truncate text-xs font-bold text-teal">{data.filename}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {data.records.length.toLocaleString("id-ID")} baris dari sheet {data.sheetName}
        </p>
      </div>
      <Select value={selectedPeriod} onValueChange={onPeriodChange}>
        <SelectTrigger aria-label="Filter periode" className="h-9 min-w-36 bg-muted text-xs font-semibold">
          <SelectValue>{selectedPeriod === "all" ? "Semua Periode" : data.months.find((month) => month.periodKey === selectedPeriod)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Periode</SelectItem>
          {data.months.map((month) => (
            <SelectItem key={month.periodKey} value={month.periodKey}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedCompany} onValueChange={onCompanyChange}>
        <SelectTrigger aria-label="Filter company" className="h-9 min-w-32 bg-muted text-xs font-semibold">
          <SelectValue>{selectedCompany === "all" ? "SIG Group" : selectedCompany}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">SIG Group</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company} value={company}>
              {company}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <MagneticButton disabled={uploading} onClick={onUpload}>
        <Icon icon={uploading ? Loading03Icon : CloudUploadIcon} className={uploading ? "animate-spin" : undefined} />
        <span className="sr-only sm:not-sr-only">{uploading ? "Menyimpan…" : "Perbarui Data"}</span>
      </MagneticButton>
    </section>
  );
}
