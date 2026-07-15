"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRevealAnimation } from "@/lib/use-reveal-animation";
import { ExportStoredMonthPanel } from "@/components/export/stored-month-panel";
import { ExportToolbar } from "@/components/export/toolbar";
import { ExportUploadState } from "@/components/export/upload-state";
import { DemurrageView } from "@/components/export/views/demurrage-view";
import { DestinationsView } from "@/components/export/views/destinations-view";
import { ForecastView } from "@/components/export/views/forecast-view";
import { OverviewView } from "@/components/export/views/overview-view";
import { RkapView } from "@/components/export/views/rkap-view";
import { TrendView } from "@/components/export/views/trend-view";
import type { ExportDashboardPayload, ExportDashboardView, ExportStoredMonth } from "@/lib/export-dashboard-types";

let exportDashboardCache: ExportDashboardPayload | null = null;

export default function ExportDashboard({ view }: { view: ExportDashboardView }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ExportDashboardPayload | null>(exportDashboardCache);
  const [loading, setLoading] = useState(!exportDashboardCache);
  const [uploading, setUploading] = useState(false);
  const [deletingMonthKey, setDeletingMonthKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");

  useEffect(() => {
    if (exportDashboardCache) return;
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const response = await fetch("/api/export-dashboard", { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Data Ekspor tidak bisa dimuat.");
        exportDashboardCache = payload as ExportDashboardPayload;
        setData(exportDashboardCache);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Data Ekspor tidak bisa dimuat.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, []);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/export-dashboard", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Workbook Ekspor tidak bisa diproses.");
      exportDashboardCache = payload as ExportDashboardPayload;
      setData(exportDashboardCache);
      setSelectedPeriod("all");
      setSelectedCompany("all");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Workbook Ekspor tidak bisa diproses.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function deleteMonth(month: ExportStoredMonth) {
    if (!window.confirm(`Hapus data Ekspor ${month.label}?`)) return;

    setDeletingMonthKey(month.periodKey);
    setError(null);

    try {
      const response = await fetch(`/api/export-dashboard?periodKey=${encodeURIComponent(month.periodKey)}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Data bulan Ekspor tidak bisa dihapus.");
      exportDashboardCache = payload as ExportDashboardPayload;
      setData(exportDashboardCache);
      if (selectedPeriod === month.periodKey) {
        setSelectedPeriod("all");
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Data bulan Ekspor tidak bisa dihapus.");
    } finally {
      setDeletingMonthKey(null);
    }
  }

  const latestPeriodKey = data?.months[0]?.periodKey ?? "";
  const latestPeriodLabel = data?.months[0]?.label ?? "Bulan Ini";
  const filteredRecords = useMemo(() => {
    if (!data) return [];
    const effectivePeriod = selectedPeriod;

    return data.records.filter((record) => {
      const periodMatch = effectivePeriod === "all" || record.periodKey === effectivePeriod;
      const companyMatch = selectedCompany === "all" || record.companyCode === selectedCompany;
      return periodMatch && companyMatch;
    });
  }, [data, latestPeriodKey, selectedCompany, selectedPeriod, view]);
  const effectivePeriodLabel = selectedPeriod === "all"
    ? "Semua Periode"
    : data?.months.find((month) => month.periodKey === selectedPeriod)?.label ?? selectedPeriod;

  // Stagger-reveal export cards on view switch and first data load only —
  // not on filter changes, so adjusting a filter doesn't re-animate (flicker).
  useRevealAnimation(
    revealRef,
    [view, Boolean(data)],
    { selector: "[data-animate-card]" },
  );

  if (loading) {
    return <div className="grid min-h-[calc(100vh-7rem)] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#ffd166]" /></div>;
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => void upload(event.target.files)} />
      {!data || data.records.length === 0 ? (
        <ExportUploadState uploading={uploading} error={error} onPick={() => inputRef.current?.click()} onDrop={(files) => void upload(files)} />
      ) : (
        <div ref={revealRef} className="space-y-2">
          <ExportToolbar
            data={data}
            selectedPeriod={selectedPeriod}
            selectedCompany={selectedCompany}
            uploading={uploading}
            onPeriodChange={setSelectedPeriod}
            onCompanyChange={setSelectedCompany}
            onUpload={() => inputRef.current?.click()}
          />
          <ExportStoredMonthPanel
            months={data.months}
            deletingKey={deletingMonthKey}
            onDelete={(month) => void deleteMonth(month)}
          />
          {error ? <p className="rounded-lg border border-[#ff7b72]/25 bg-[#ff7b72]/10 p-3 text-sm text-[#ff9f8e]">{error}</p> : null}
          {filteredRecords.length === 0 ? (
            <div className="grid min-h-72 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted-fg)]">Tidak ada data untuk filter ini.</div>
          ) : (
            <div className="space-y-2">
              {view === "export-overview" ? <OverviewView records={filteredRecords} /> : null}
              {view === "export-rkap" ? <RkapView records={filteredRecords} kpi={data.kpi ?? null} /> : null}
              {view === "export-trend" ? <TrendView records={filteredRecords} /> : null}
              {view === "export-destinations" ? <DestinationsView records={filteredRecords} /> : null}
              {view === "export-forecast" ? <ForecastView records={filteredRecords} kpi={data.kpi ?? null} /> : null}
              {view === "export-demurrage" ? <DemurrageView records={filteredRecords} /> : null}
            </div>
          )}
        </div>
      )}
    </>
  );
}
