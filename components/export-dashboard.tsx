"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NoDataIllustration } from "@/components/illustrations";
import { Banner } from "@/components/ui/banner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TopProgress } from "@/components/ui/page-loader";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { notify } from "@/components/ui/notify";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
import { useRevealAnimation } from "@/lib/use-reveal-animation";
import { ExportStoredMonthPanel } from "@/components/export/stored-month-panel";
import { ExportToolbar } from "@/components/export/toolbar";
import { ExportUploadProgress, ExportUploadSuccess } from "@/components/export/upload-feedback";
import { ExportUploadState } from "@/components/export/upload-state";
import { formatExportUploadSuccess } from "@/lib/export-dashboard-format";
import type { ExportViewPayload, ExportDashboardView, ExportDashboardWire, ExportStoredMonth } from "@/lib/export-dashboard-types";
import { unpackRows } from "@/lib/packed-rows";
import { readResponsePayload, responseError, uploadWorkbook } from "@/lib/upload-workbook";

// Each route renders exactly one view; load only that one's code.
const OverviewView = dynamic(() => import("@/components/export/views/overview-view").then((module) => module.OverviewView));
const RkapView = dynamic(() => import("@/components/export/views/rkap-view").then((module) => module.RkapView));
const TrendView = dynamic(() => import("@/components/export/views/trend-view").then((module) => module.TrendView));
const DestinationsView = dynamic(() => import("@/components/export/views/destinations-view").then((module) => module.DestinationsView));
const ForecastView = dynamic(() => import("@/components/export/views/forecast-view").then((module) => module.ForecastView));
const DemurrageView = dynamic(() => import("@/components/export/views/demurrage-view").then((module) => module.DemurrageView));

function fromWire(wire: ExportDashboardWire): ExportViewPayload {
  return { ...wire, records: unpackRows(wire.records) };
}

export default function ExportDashboard({ view, initialData }: { view: ExportDashboardView; initialData?: ExportDashboardWire }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const viewsRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();
  const [data, setData] = useState<ExportViewPayload | null>(() => (initialData ? fromWire(initialData) : null));
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [uploading, setUploading] = useState(false);
  const [deletingMonthKey, setDeletingMonthKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");

  // Fresh server data (e.g. after router.refresh()) replaces local state.
  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    if (initialData) setData(fromWire(initialData));
  }

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 8000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  // Fallback when the server render couldn't load the data.
  useEffect(() => {
    if (initialData) return;
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const response = await fetch("/api/export-dashboard", { signal: controller.signal });
        const payload = await readResponsePayload(response);
        if (!response.ok || !payload) throw new Error(responseError(response, payload, "Data Ekspor tidak bisa dimuat."));
        setData(fromWire(payload as unknown as ExportDashboardWire));
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Data Ekspor tidak bisa dimuat.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [initialData]);

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await uploadWorkbook({ endpoint: "/api/export-dashboard", file, fileField: "file", blobPrefix: "export" });
      const payload = await readResponsePayload(response);
      if (!response.ok || !payload) throw new Error(responseError(response, payload, "Workbook Ekspor tidak bisa diproses."));
      setData(fromWire(payload as unknown as ExportDashboardWire));
      setSelectedPeriod("all");
      setSelectedCompany("all");
      const message = formatExportUploadSuccess(file.name, payload.upsertedMonths as ExportViewPayload["upsertedMonths"]);
      setSuccessMessage(message);
      notify.success("Data Ekspor tersimpan", message);
      // Drop client-cached pages so every export view shows the new data.
      router.refresh();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Workbook Ekspor tidak bisa diproses.";
      setError(message);
      notify.error("Upload Ekspor gagal", message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function deleteMonth(month: ExportStoredMonth) {
    const confirmed = await confirm({
      title: `Hapus data Ekspor ${month.label}?`,
      description: "Semua baris Ekspor pada bulan ini akan dihapus dari dashboard. Tindakan ini tidak bisa dibatalkan.",
      confirmLabel: "Hapus data",
    });
    if (!confirmed) return;

    setDeletingMonthKey(month.periodKey);
    setError(null);

    try {
      const response = await fetch(`/api/export-dashboard?periodKey=${encodeURIComponent(month.periodKey)}`, { method: "DELETE" });
      const payload = await readResponsePayload(response);
      if (!response.ok || !payload) throw new Error(responseError(response, payload, "Data bulan Ekspor tidak bisa dihapus."));
      setData(fromWire(payload as unknown as ExportDashboardWire));
      if (selectedPeriod === month.periodKey) {
        setSelectedPeriod("all");
      }
      notify.success("Data dihapus", `Ekspor ${month.label} sudah dihapus.`);
      router.refresh();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Data bulan Ekspor tidak bisa dihapus.";
      setError(message);
      notify.error("Gagal menghapus", message);
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

  // Filter changes cross-fade the views instead of re-running the full reveal
  // (skipped on mount so the first paint is already the final state).
  const filtersChanged = useRef(false);
  useEffect(() => {
    if (!filtersChanged.current) {
      filtersChanged.current = true;
      return;
    }
    if (!viewsRef.current || prefersReducedMotion()) return;
    animate(viewsRef.current, [{ opacity: 0.35, translate: "0 6px" }, { opacity: 1, translate: "0 0" }], { duration: 0.4, ease: ease.out });
  }, [selectedPeriod, selectedCompany]);

  if (loading) {
    return (
      <div className="space-y-3">
        <TopProgress active />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <>
      <TopProgress active={uploading || deletingMonthKey !== null} />
      <input ref={inputRef} type="file" aria-label="Pilih workbook Ekspor" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => void upload(event.target.files)} />
      {!data || data.records.length === 0 ? (
        <ExportUploadState
          uploading={uploading}
          error={error}
          successMessage={successMessage}
          onPick={() => inputRef.current?.click()}
          onDrop={(files) => void upload(files)}
        />
      ) : (
        <div ref={revealRef} className="space-y-2">
          {uploading ? <ExportUploadProgress /> : null}
          {!uploading && successMessage ? <ExportUploadSuccess message={successMessage} /> : null}
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
          {error ? (
            <Banner tone="danger" title="Terjadi kendala" dismissible>
              {error}
            </Banner>
          ) : null}
          {filteredRecords.length === 0 ? (
            <div className="grid min-h-72 place-items-center content-center gap-2 rounded-lg border border-border bg-card p-6 text-center">
              <NoDataIllustration />
              <p className="text-sm font-bold text-teal">Tidak ada data untuk filter ini</p>
              <p className="text-xs text-muted-foreground">Coba pilih periode atau company lain.</p>
            </div>
          ) : (
            <div ref={viewsRef} className="space-y-2">
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
