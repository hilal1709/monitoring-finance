"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, CheckCircle2, Download, Loader2, Menu, MoonStar, PanelLeftClose, PanelLeftOpen, SunMedium, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRevealAnimation } from "@/lib/use-reveal-animation";
import { CombinedOverview } from "@/components/dashboard/combined-overview";
import { ExportPptMenu } from "@/components/dashboard/export-ppt-menu";
import { ReportFrame } from "@/components/dashboard/report-frame";
import { SidebarNavigation } from "@/components/dashboard/sidebar-navigation";
import { StoredMonthPanel } from "@/components/dashboard/stored-month-panel";
import { UploadCard } from "@/components/dashboard/upload-card";
import ExportDashboard from "@/components/export-dashboard";
import { fromPersistedReport, loadedReportsFromPersisted } from "@/lib/dashboard-data";
import { exportViewConfig, isExportDashboardView, uploadCards } from "@/lib/dashboard-constants";
import type { DashboardView, FilterKey, LoadedReport, OverviewFilters, PeriodMode, ReportFilters, StoredMonth, ThemeMode } from "@/lib/dashboard-types";
import type { DashboardSection, PersistedDashboardReport, PersistedDashboardReports, UploadedWorkbookSummary, WorkbookRole } from "@/lib/monitoring-dashboard-types";
import type { ExportDashboardView } from "@/lib/export-dashboard-types";

let dashboardReportsCache: Partial<Record<WorkbookRole, LoadedReport>> = {};
let dashboardMonthsCache: Partial<Record<WorkbookRole, StoredMonth[]>> = {};
// Module-level so the collapse choice survives client navigation between views.
let sidebarCollapsedCache = false;

function cacheReports(reports: Partial<Record<WorkbookRole, LoadedReport>>) {
  dashboardReportsCache = {
    ...dashboardReportsCache,
    ...reports,
  };

  return dashboardReportsCache;
}

function cacheRoleReport(role: WorkbookRole, report?: LoadedReport) {
  dashboardReportsCache = { ...dashboardReportsCache };

  if (report) {
    dashboardReportsCache[role] = report;
  } else {
    delete dashboardReportsCache[role];
  }

  return dashboardReportsCache;
}

function cacheMonths(months: Partial<Record<WorkbookRole, StoredMonth[]>>) {
  dashboardMonthsCache = {
    ...dashboardMonthsCache,
    ...months,
  };

  return dashboardMonthsCache;
}

async function readResponsePayload(response: Response) {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw: raw.slice(0, 500) };
  }
}

export default function DashboardPage({
  view = "overview",
  initialReports,
}: {
  view?: DashboardView;
  initialReports?: PersistedDashboardReports;
}) {
  const [reports, setReports] = useState<Partial<Record<WorkbookRole, LoadedReport>>>(() => {
    const loadedReports = loadedReportsFromPersisted(initialReports);

    return cacheReports(loadedReports);
  });
  const [storedMonths, setStoredMonths] = useState<Partial<Record<WorkbookRole, StoredMonth[]>>>(() => ({ ...dashboardMonthsCache }));
  const [errors, setErrors] = useState<Partial<Record<WorkbookRole, string>>>({});
  const [successMessages, setSuccessMessages] = useState<Partial<Record<WorkbookRole, string>>>({});
  const [filters, setFilters] = useState<Record<WorkbookRole, ReportFilters>>({ invoice: {}, payment: {} });
  const [overviewFilters, setOverviewFilters] = useState<OverviewFilters>({ periodLabels: [] });
  const [periodMode, setPeriodMode] = useState<PeriodMode>("mom");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof document === "undefined") {
      return "dark";
    }

    return document.documentElement.dataset.theme === "light" ? "light" : "dark";
  });
  const [loadingRole, setLoadingRole] = useState<WorkbookRole | null>(null);
  const [deletingMonthKey, setDeletingMonthKey] = useState<string | null>(null);
  const [isLoadingStoredReports, setIsLoadingStoredReports] = useState(!initialReports && !isExportDashboardView(view));
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(sidebarCollapsedCache);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasAnyReport = Boolean(reports.invoice || reports.payment);
  const activeRole = view === "invoice" || view === "payment" ? view : null;
  const exportSection = isExportDashboardView(view) ? exportViewConfig[view] : null;
  const isNonExportOverview = view === "overview";
  const activeUploadCards = activeRole ? uploadCards.filter((card) => card.role === activeRole) : uploadCards;
  const pageTitle = exportSection?.title
    ?? (activeRole === "invoice" ? "Invoice Report Monitoring" : activeRole === "payment" ? "Payment Report Monitoring" : "Overview Report Monitoring");
  const overviewReady = Boolean(reports.invoice && reports.payment);

  // Stagger-reveal the dashboard blocks whenever the view or its data changes.
  useRevealAnimation(contentRef, [
    view,
    overviewReady,
    activeRole,
    isLoadingStoredReports,
    Boolean(reports.invoice),
    Boolean(reports.payment),
  ]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("deptcontrol-theme");
    const nextTheme: ThemeMode = storedTheme === "light" ? "light" : "dark";
    setThemeMode(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    window.localStorage.setItem("deptcontrol-theme", themeMode);
  }, [themeMode]);

  useEffect(() => {
    const stored = window.localStorage.getItem("deptcontrol-sidebar");
    if (stored === "collapsed" || stored === "open") {
      const collapsed = stored === "collapsed";
      sidebarCollapsedCache = collapsed;
      setIsSidebarCollapsed(collapsed);
    }
  }, []);

  function toggleSidebar() {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      sidebarCollapsedCache = next;
      window.localStorage.setItem("deptcontrol-sidebar", next ? "collapsed" : "open");
      return next;
    });
  }

  function toggleFilter(role: WorkbookRole, key: FilterKey, value: string) {
    setFilters((current) => {
      const roleFilters = current[role];
      const selected = roleFilters[key] ?? [];
      const nextSelected = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
      const nextRoleFilters: ReportFilters = { ...roleFilters };

      if (nextSelected.length > 0) {
        nextRoleFilters[key] = nextSelected;
      } else {
        delete nextRoleFilters[key];
      }

      return {
        ...current,
        [role]: nextRoleFilters,
      };
    });
  }

  function clearFilters(role: WorkbookRole, key?: FilterKey) {
    setFilters((current) => {
      if (!key) {
        return {
          ...current,
          [role]: {},
        };
      }

      const nextRoleFilters: ReportFilters = { ...current[role] };
      delete nextRoleFilters[key];

      return {
        ...current,
        [role]: nextRoleFilters,
      };
    });
  }

  function openWorkbookPicker(role: WorkbookRole) {
    if (role === "invoice") {
      invoiceInputRef.current?.click();
      return;
    }

    paymentInputRef.current?.click();
  }

  function toggleOverviewPeriodFilter(value: string) {
    setOverviewFilters((current) => {
      const nextSelected = current.periodLabels.includes(value)
        ? current.periodLabels.filter((item) => item !== value)
        : [...current.periodLabels, value];

      return { periodLabels: nextSelected };
    });
  }

  function clearOverviewPeriodFilter() {
    setOverviewFilters({ periodLabels: [] });
  }

  function toggleThemeMode() {
    setThemeMode((current) => (current === "dark" ? "light" : "dark"));
  }

  function downloadPpt(role: WorkbookRole, customerType: "all" | "external" | "group") {
    const url = `/api/dashboard/ppt?role=${role}&customerType=${customerType}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function downloadExportPpt(pptTheme: "black" | "light") {
    const a = document.createElement("a");
    a.href = `/api/dashboard/ppt?type=export&theme=${pptTheme}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [view]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (exportSection) {
      setIsLoadingStoredReports(false);
      return;
    }

    if (initialReports) {
      setReports(loadedReportsFromPersisted(initialReports));
      setIsLoadingStoredReports(false);
      return;
    }

    const hasCachedRouteData = activeRole
      ? Boolean(dashboardReportsCache[activeRole] && dashboardMonthsCache[activeRole])
      : Boolean(dashboardReportsCache.invoice && dashboardReportsCache.payment && dashboardMonthsCache.invoice && dashboardMonthsCache.payment);

    if (hasCachedRouteData) {
      setReports({ ...dashboardReportsCache });
      setStoredMonths({ ...dashboardMonthsCache });
      setIsLoadingStoredReports(false);
      return;
    }

    let cancelled = false;

    async function loadStoredReports() {
      setIsLoadingStoredReports(true);

      try {
        const response = await fetch(activeRole ? `/api/dashboard?role=${activeRole}` : "/api/dashboard");
        const payload = await readResponsePayload(response);

        if (!payload || typeof payload !== "object") {
          throw new Error("Data upload tersimpan tidak bisa dimuat.");
        }

        if (!response.ok) {
          throw new Error((payload.error as string | undefined) ?? (payload.raw as string | undefined) ?? "Data upload tersimpan tidak bisa dimuat.");
        }

        if (cancelled) {
          return;
        }

        const storedReports = (payload.reports ?? {}) as PersistedDashboardReports;
        const months = (payload.months ?? {}) as Partial<Record<WorkbookRole, StoredMonth[]>>;

        const loadedReports = loadedReportsFromPersisted(storedReports);

        setReports((current) => ({
          ...current,
          ...cacheReports(loadedReports),
        }));
        setStoredMonths({ ...cacheMonths(months) });
      } catch (error) {
        if (!cancelled && activeRole) {
          setErrors((current) => ({
            ...current,
            [activeRole]: error instanceof Error ? error.message : "Data upload tersimpan tidak bisa dimuat.",
          }));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStoredReports(false);
        }
      }
    }

    void loadStoredReports();

    return () => {
      cancelled = true;
    };
  }, [activeRole, exportSection, initialReports]);

  async function uploadRole(role: WorkbookRole, fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    setLoadingRole(role);
    setErrors((current) => ({ ...current, [role]: undefined }));
    setSuccessMessages((current) => ({ ...current, [role]: undefined }));

    try {
      const formData = new FormData();
      formData.append("role", role);
      formData.append("files", file);

      const response = await fetch("/api/dashboard", {
        method: "POST",
        body: formData,
      });
      const payload = await readResponsePayload(response);

      if (!payload || typeof payload !== "object") {
        throw new Error("Workbook tidak bisa diproses.");
      }

      if (!response.ok) {
        throw new Error((payload.error as string | undefined) ?? (payload.raw as string | undefined) ?? "Workbook tidak bisa diproses.");
      }

      setSuccessMessages((current) => ({
        ...current,
        [role]: `Upload ${role === "invoice" ? "Invoice" : "Payment"} berhasil.`,
      }));

      void (async () => {
        try {
          const refreshResponse = await fetch(`/api/dashboard?role=${role}`);
          const refreshPayload = await readResponsePayload(refreshResponse);

          if (!refreshPayload || typeof refreshPayload !== "object") {
            throw new Error("Dashboard setelah upload tidak bisa dimuat.");
          }

          if (!refreshResponse.ok) {
            throw new Error((refreshPayload.error as string | undefined) ?? (refreshPayload.raw as string | undefined) ?? "Dashboard setelah upload tidak bisa dimuat.");
          }

          const storedReports = (refreshPayload.reports ?? {}) as PersistedDashboardReports;
          const months = (refreshPayload.months ?? {}) as Partial<Record<WorkbookRole, StoredMonth[]>>;
          const reportsFromApi = loadedReportsFromPersisted(storedReports);
          const loadedReport = reportsFromApi[role];

          if (!loadedReport) {
            throw new Error("Dashboard setelah upload tidak bisa dimuat.");
          }

          cacheReports({ [role]: loadedReport });
          setReports((current) => ({
            ...current,
            [role]: loadedReport,
          }));
          setStoredMonths({ ...cacheMonths(months) });
          clearFilters(role);
          setOverviewFilters({ periodLabels: [] });
        } catch (error) {
          setSuccessMessages((current) => ({ ...current, [role]: undefined }));
          setErrors((current) => ({
            ...current,
            [role]: error instanceof Error ? error.message : "Dashboard setelah upload tidak bisa dimuat.",
          }));
        }
      })();
    } catch (error) {
      setSuccessMessages((current) => ({ ...current, [role]: undefined }));
      setErrors((current) => ({
        ...current,
        [role]: error instanceof Error ? error.message : "Workbook tidak bisa diproses.",
      }));
    } finally {
      setLoadingRole(null);

      if (role === "invoice" && invoiceInputRef.current) {
        invoiceInputRef.current.value = "";
      }

      if (role === "payment" && paymentInputRef.current) {
        paymentInputRef.current.value = "";
      }
    }
  }

  async function deleteStoredMonth(role: WorkbookRole, month: StoredMonth) {
    const confirmed = window.confirm(`Hapus data ${month.label} untuk ${role === "invoice" ? "Invoice" : "Payment"}?`);

    if (!confirmed) {
      return;
    }

    const key = `${role}:${month.periodKey}`;
    setDeletingMonthKey(key);
    setErrors((current) => ({ ...current, [role]: undefined }));
    setSuccessMessages((current) => ({ ...current, [role]: undefined }));

    try {
      const response = await fetch(`/api/dashboard?role=${role}&periodKey=${encodeURIComponent(month.periodKey)}`, {
        method: "DELETE",
      });
      const payload = await readResponsePayload(response);

      if (!payload || typeof payload !== "object") {
        throw new Error("Data bulan tidak bisa dihapus.");
      }

      if (!response.ok) {
        throw new Error((payload.error as string | undefined) ?? (payload.raw as string | undefined) ?? "Data bulan tidak bisa dihapus.");
      }

      const storedReports = (payload.reports ?? {}) as PersistedDashboardReports;
      const months = (payload.months ?? {}) as Partial<Record<WorkbookRole, StoredMonth[]>>;
      const nextReport = loadedReportsFromPersisted(storedReports)[role];

      cacheRoleReport(role, nextReport);
      cacheMonths(months);

      setReports((current) => {
        const next = { ...current };

        if (nextReport) {
          next[role] = nextReport;
        } else {
          delete next[role];
        }

        return next;
      });
      setStoredMonths({ ...dashboardMonthsCache });
      clearFilters(role);
      setOverviewFilters({ periodLabels: [] });
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [role]: error instanceof Error ? error.message : "Data bulan tidak bisa dihapus.",
      }));
    } finally {
      setDeletingMonthKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <input
        ref={invoiceInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => void uploadRole("invoice", event.target.files)}
      />
      <input
        ref={paymentInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => void uploadRole("payment", event.target.files)}
      />

      {isMobileNavOpen ? (
        <div aria-label="Mobile navigation" aria-modal="true" className="fixed inset-0 z-50 md:hidden" role="dialog">
          <button aria-label="Close navigation" className="absolute inset-0 bg-black/60" type="button" onClick={() => setIsMobileNavOpen(false)} />
          <aside className="relative flex h-full w-80 max-w-[88vw] flex-col border-r border-white/10 bg-[#0c1724] p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ffd166] text-[#211600]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold leading-tight tracking-tight text-white">Commercial Finance 2</h1>
                </div>
              </div>
              <Button
                aria-label="Close navigation"
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                size="icon"
                type="button"
                variant="secondary"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1">
              <SidebarNavigation view={view} onNavigate={() => setIsMobileNavOpen(false)} />
            </div>

          </aside>
        </div>
      ) : null}

      <aside className={cn("fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-white/10 bg-[#0c1724] transition-transform duration-300 ease-in-out md:block", isSidebarCollapsed ? "md:-translate-x-full" : "md:translate-x-0")}>
        <div className="flex h-full flex-col p-6">
          <div className="mb-10 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ffd166] text-[#211600]">
                <Building2 className="h-5 w-5" />
              </div>
              <h1 className="text-base font-semibold leading-tight tracking-tight text-white">Commercial Finance 2</h1>
            </div>
            <Button
              aria-label="Tutup sidebar"
              title="Tutup sidebar"
              className="shrink-0 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              size="icon"
              type="button"
              variant="secondary"
              onClick={toggleSidebar}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <SidebarNavigation view={view} />
          </div>
        </div>
      </aside>

      <header className={cn("fixed right-0 top-0 z-30 flex min-h-20 w-full items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--app-bg)_92%,transparent)] px-4 backdrop-blur transition-[width] duration-300 ease-in-out md:px-8", isSidebarCollapsed ? "md:w-full" : "md:w-[calc(100%-16rem)]")}>
        <div className="flex min-w-0 items-center gap-3">
          {isSidebarCollapsed ? (
            <Button
              aria-label="Buka sidebar"
              title="Buka sidebar"
              className="hidden shrink-0 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 md:inline-flex"
              size="icon"
              type="button"
              variant="secondary"
              onClick={toggleSidebar}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            aria-expanded={isMobileNavOpen}
            aria-label="Open navigation"
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 md:hidden"
            size="icon"
            type="button"
            variant="secondary"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-white md:text-2xl">{pageTitle}</h2>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {exportSection ? (
            <ExportPptMenu onSelect={downloadExportPpt} />
          ) : activeRole ? (
            <>
              <Button
                type="button"
                onClick={() => downloadPpt(activeRole, "group")}
                disabled={!reports[activeRole]}
                className="rounded-lg border border-[#fbbf24]/50 bg-[#fbbf24]/10 text-[#fde68a] hover:bg-[#fbbf24]/20"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">PPT NonEkspor</span>
              </Button>
              <Button
                type="button"
                onClick={() => openWorkbookPicker(activeRole)}
                disabled={loadingRole === activeRole}
                className="rounded-lg bg-[#ffd166] text-[#211600] hover:bg-[#ffe29a]"
              >
                {loadingRole === activeRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </>
          ) : null}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Button
              type="button"
              variant="secondary"
              onClick={toggleThemeMode}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--app-fg)] hover:bg-[var(--surface-4)]"
            >
              {themeMode === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
              {themeMode === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("ml-0 min-h-screen px-4 pb-4 pt-24 transition-[margin] duration-300 ease-in-out md:px-8", isSidebarCollapsed ? "md:ml-0" : "md:ml-64")}>
        <div ref={contentRef} className="mx-auto max-w-[1500px] space-y-3">
          {exportSection ? <ExportDashboard view={view as ExportDashboardView} /> : null}

          {activeRole && !reports[activeRole] ? (
            <section id="upload" className="grid gap-4 lg:grid-cols-1">
              {activeUploadCards.map((card) => (
                <UploadCard
                  key={card.role}
                  {...card}
                  isLoading={loadingRole === card.role}
                  loaded={reports[card.role]}
                  error={errors[card.role]}
                  onPick={() => openWorkbookPicker(card.role)}
                  onDrop={(files) => void uploadRole(card.role, files)}
                />
              ))}
            </section>
          ) : null}

          {activeRole && reports[activeRole] && errors[activeRole] ? (
            <p className="rounded-lg border border-[#ff9f8e]/25 bg-[#ff9f8e]/10 p-3 text-sm text-[#ffb4a6]">{errors[activeRole]}</p>
          ) : null}

          {activeRole && reports[activeRole] && successMessages[activeRole] ? (
            <p className="flex items-center gap-2 rounded-lg border border-[#70f0bf]/25 bg-[#70f0bf]/10 p-3 text-sm text-[#70f0bf]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMessages[activeRole]}
            </p>
          ) : null}

          {isLoadingStoredReports ? (
            <Card data-animate-block className="border-white/10 bg-[#0c1724]/80">
              <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-[#ffd166]" />
                Memuat upload terakhir...
              </CardContent>
            </Card>
          ) : null}

          {activeRole && !hasAnyReport && !isLoadingStoredReports ? (
            <Card data-animate-block className="border-white/10 bg-[#0c1724]/80">
              <CardContent className="grid gap-5 p-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#ffd166]">Separated Reports</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Upload file {activeRole === "invoice" ? "invoice" : "payment"}</h2>
                  <p className="mt-3 leading-7 text-slate-300">
                    Dashboard {activeRole === "invoice" ? "Invoice Report Monitoring" : "Payment Report Monitoring"} langsung muncul setelah file diunggah.
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="min-h-44 rounded-lg border border-white/10 bg-[#07111f] p-3">
                    <div className="rounded-md border border-white/10 bg-[#0c1724] p-2 text-center text-lg font-black text-[#ffd166]">{activeRole === "invoice" ? "INVOICE REPORT" : "PAYMENT REPORT"}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="h-16 rounded-md border border-[#ffd166]/25 bg-[#ffd166]/10" />
                      <div className="h-16 rounded-md border border-[#7dd3fc]/25 bg-[#7dd3fc]/10" />
                      <div className="h-24 rounded-md border border-white/10 bg-white/[0.04]" />
                      <div className="h-24 rounded-full border border-[#70f0bf]/25 bg-[#70f0bf]/10" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isNonExportOverview && !overviewReady && !isLoadingStoredReports ? (
            <Card data-animate-block className="border-white/10 bg-[#0c1724]/80">
              <CardContent className="grid gap-5 p-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#ffd166]">Combined Overview</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Upload invoice dan payment</h2>
                  <p className="mt-3 leading-7 text-slate-300">
                    Setelah kedua file masuk, overview menggabungkan outstanding, payment, exposure, aging, risk, dan trend bulanan.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className={cn("min-h-44 rounded-lg border p-3", reports.invoice ? "border-[#70f0bf]/40 bg-[#70f0bf]/10" : "border-white/10 bg-[#07111f]")}>
                    <div className="rounded-md border border-white/10 bg-[#0c1724] p-2 text-center text-lg font-black text-[#ffd166]">INVOICE SOURCE</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="h-16 rounded-md border border-[#ffd166]/25 bg-[#ffd166]/10" />
                      <div className="h-16 rounded-md border border-[#7dd3fc]/25 bg-[#7dd3fc]/10" />
                      <div className="h-24 rounded-md border border-white/10 bg-white/[0.04]" />
                      <div className="h-24 rounded-full border border-[#70f0bf]/25 bg-[#70f0bf]/10" />
                    </div>
                  </div>
                  <div className={cn("min-h-44 rounded-lg border p-3", reports.payment ? "border-[#70f0bf]/40 bg-[#70f0bf]/10" : "border-white/10 bg-[#07111f]")}>
                    <div className="rounded-md border border-white/10 bg-[#0c1724] p-2 text-center text-lg font-black text-[#70f0bf]">PAYMENT SOURCE</div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="h-16 rounded-md border border-[#70f0bf]/25 bg-[#70f0bf]/10" />
                      <div className="h-16 rounded-md border border-[#7dd3fc]/25 bg-[#7dd3fc]/10" />
                      <div className="h-24 rounded-full border border-[#94a3b8]/25 bg-[#94a3b8]/10" />
                      <div className="h-24 rounded-md border border-white/10 bg-white/[0.04]" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isNonExportOverview && reports.invoice && reports.payment ? (
            <CombinedOverview
              invoice={reports.invoice}
              payment={reports.payment}
              periodMode={periodMode}
              onPeriodModeChange={setPeriodMode}
              periodFilters={overviewFilters}
              onTogglePeriodFilter={toggleOverviewPeriodFilter}
              onClearPeriodFilter={clearOverviewPeriodFilter}
            />
          ) : null}

          {activeRole && reports[activeRole] ? (
            <StoredMonthPanel
              role={activeRole}
              months={storedMonths[activeRole] ?? []}
              deletingKey={deletingMonthKey}
              onDelete={(month) => void deleteStoredMonth(activeRole, month)}
            />
          ) : null}

          {activeRole === "invoice" && reports.invoice ? (
            <ReportFrame
              id="invoice-dashboard"
              role="invoice"
              section={reports.invoice.section}
              file={reports.invoice.file}
              generatedAt={reports.invoice.generatedAt}
              filters={filters.invoice}
              onToggleFilter={(key, value) => toggleFilter("invoice", key, value)}
              onClearFilter={(key) => clearFilters("invoice", key)}
              periodMode={periodMode}
              onPeriodModeChange={setPeriodMode}
            />
          ) : null}

          {activeRole === "payment" && reports.payment ? (
            <ReportFrame
              id="payment-dashboard"
              role="payment"
              section={reports.payment.section}
              file={reports.payment.file}
              generatedAt={reports.payment.generatedAt}
              filters={filters.payment}
              onToggleFilter={(key, value) => toggleFilter("payment", key, value)}
              onClearFilter={(key) => clearFilters("payment", key)}
              periodMode={periodMode}
              onPeriodModeChange={setPeriodMode}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
