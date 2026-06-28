import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExportDashboardPayload } from "@/lib/export-dashboard-types";

export function ExportToolbar({
  data,
  selectedPeriod,
  selectedCompany,
  uploading,
  onPeriodChange,
  onCompanyChange,
  onUpload,
}: {
  data: ExportDashboardPayload;
  selectedPeriod: string;
  selectedCompany: string;
  uploading: boolean;
  onPeriodChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onUpload: () => void;
}) {
  const companies = [...new Set(data.records.map((record) => record.companyCode))].sort();

  return (
    <section data-animate-card className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
      <div className="min-w-0 flex-1 px-1">
        <p className="truncate text-xs font-bold text-[var(--app-fg)]">{data.filename}</p>
        <p className="truncate text-[10px] text-[var(--muted-fg)]">{data.records.length.toLocaleString("id-ID")} baris dari sheet {data.sheetName}</p>
      </div>
      <select className="h-9 min-w-36 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs font-semibold text-[var(--app-fg)]" value={selectedPeriod} onChange={(event) => onPeriodChange(event.target.value)}>
        <option value="all">Semua Periode</option>
        {data.months.map((month) => <option key={month.periodKey} value={month.periodKey}>{month.label}</option>)}
      </select>
      <select className="h-9 min-w-32 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs font-semibold text-[var(--app-fg)]" value={selectedCompany} onChange={(event) => onCompanyChange(event.target.value)}>
        <option value="all">SIG Group</option>
        {companies.map((company) => <option key={company} value={company}>{company}</option>)}
      </select>
      <Button className="rounded-lg bg-[#ffd166] text-[#211600] hover:bg-[#ffe29a]" disabled={uploading} onClick={onUpload}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        <span className="hidden sm:inline">Perbarui Data</span>
      </Button>
    </section>
  );
}
