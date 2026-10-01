"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download04Icon, Loading03Icon, Menu01Icon, PanelLeftCloseIcon, PanelLeftOpenIcon, CloudUploadIcon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Logo } from "@/components/brand/logo";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { Banner } from "@/components/ui/banner";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { TopProgress } from "@/components/ui/page-loader";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { notify } from "@/components/ui/notify";
import { cn } from "@/lib/utils";
import { useRevealAnimation } from "@/lib/use-reveal-animation";
import { SidebarNavigation } from "@/components/dashboard/sidebar-navigation";
import type { KpiPayload } from "@/components/kpi-dashboard";
import { loadedReportsFromPacked } from "@/lib/dashboard-data";
import { exportViewConfig, isExportDashboardView, uploadCards } from "@/lib/dashboard-constants";
import type { DashboardView, FilterKey, LoadedReport, OverviewFilters, PeriodMode, ReportFilters, StoredMonth } from "@/lib/dashboard-types";
import type { DashboardPayload, WorkbookRole } from "@/lib/monitoring-dashboard-types";
import type { ExportDashboardView, ExportDashboardWire } from "@/lib/export-dashboard-types";
import { readResponsePayload, responseError, uploadWorkbook } from "@/lib/upload-workbook";

// Every route renders exactly one of these views — split them so a page only
// downloads (and hydrates) the code it actually shows.
const CombinedOverview = dynamic(() => import("@/components/dashboard/combined-overview").then((module) => module.CombinedOverview));
const ReportFrame = dynamic(() => import("@/components/dashboard/report-frame").then((module) => module.ReportFrame));
const ExportDashboard = dynamic(() => import("@/components/export-dashboard"));
const KpiDashboard = dynamic(() => import("@/components/kpi-dashboard"));
const ExportPptMenu = dynamic(() => import("@/components/dashboard/export-ppt-menu").then((module) => module.ExportPptMenu));
const StoredMonthPanel = dynamic(() => import("@/components/dashboard/stored-month-panel").then((module) => module.StoredMonthPanel));
const UploadCard = dynamic(() => import("@/components/dashboard/upload-card").then((module) => module.UploadCard));

// Module-level so the collapse choice survives client navigation between views.
let sidebarCollapsedCache = false;

type ReportsState = Partial<Record<WorkbookRole, LoadedReport>>;
type MonthsState = Partial<Record<WorkbookRole, StoredMonth[]>>;

export default function DashboardPage({
  view = "overview",
  initialData,
  initialExport,
  initialKpi,
}: {
  view?: DashboardView;
  /** Server-loaded invoice/payment data (undefined when the server load failed → client fetch). */
  initialData?: DashboardPayload;
  initialExport?: ExportDashboardWire;
  initialKpi?: KpiPayload;
}) {
  const router = useRouter();
  const [reports, setReports] = useState<ReportsState>(() => loadedReportsFromPacked(initialData?.reports));
  const [storedMonths, setStoredMonths] = useState<MonthsState>(() => initialData?.months ?? {});
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [errors, setErrors] = useState<Partial<Record<WorkbookRole, string>>>({});
  const [filters, setFilters] = useState<Record<WorkbookRole, ReportFilters>>({ invoice: {}, payment: {} });
  const [overviewFilters, setOverviewFilters] = useState<OverviewFilters>({ periodLabels: [] });
  const [periodMode, setPeriodMode] = useState<PeriodMode>("mom");
  const [loadingRole, setLoadingRole] = useState<WorkbookRole | null>(null);
  const [deletingMonthKey, setDeletingMonthKey] = useState<string | null>(null);
  const needsDashboardData = view === "overview" || view === "invoice" || view === "payment";
  const [isLoadingStoredReports, setIsLoadingStoredReports] = useState(needsDashboardData && !initialData);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(sidebarCollapsedCache);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();
  const [isScrolled, setIsScrolled] = useState(false);

  // Fresh server data (e.g. after router.refresh()) replaces local state.
  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    if (initialData) {
      setReports(loadedReportsFromPacked(initialData.reports));
      setStoredMonths(initialData.months);
    }
  }
  const hasAnyReport = Boolean(reports.invoice || reports.payment);
  const activeRole = view === "invoice" || view === "payment" ? view : null;
  const exportSection = isExportDashboardView(view) ? exportViewConfig[view] : null;
  const isKpiView = view === "kpi-otobos" || view === "kpi-timely";
  const isNonExportOverview = view === "overview";
  const activeUploadCards = activeRole ? uploadCards.filter((card) => card.role === activeRole) : uploadCards;
  const pageTitle = exportSection?.title
    ?? (view === "kpi-timely" ? "KPI Timely Task" : isKpiView ? "KPI Otobos" : activeRole === "invoice" ? "Invoice Report Monitoring" : activeRole === "payment" ? "Payment Report Monitoring" : "Overview Report Monitoring");
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


  // Header gains depth once the page scrolls under it (styled in globals.css).
  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

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


  // Fetch instead of a plain <a download> link: a failed generation returns a
  // JSON error, which the browser would otherwise save as the "pptx".
  async function downloadPptFrom(url: string, fallbackName: string) {
    notify.info("Menyiapkan PPT", "Proses generate bisa memakan waktu beberapa detik.");
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const payload = await readResponsePayload(response);
        throw new Error(responseError(response, payload, "Gagal generate PPT."));
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? decodeURIComponent(match[1]) : fallbackName;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      notify.error("Download PPT gagal", error instanceof Error ? error.message : "Gagal generate PPT.");
    }
  }

  function downloadPpt(role: WorkbookRole, customerType: "all" | "external" | "group") {
    void downloadPptFrom(`/api/dashboard/ppt?role=${role}&customerType=${customerType}`, `DeptControl_${role}.pptx`);
  }

  function downloadExportPpt(pptTheme: "black" | "light") {
    void downloadPptFrom(`/api/dashboard/ppt?type=export&theme=${pptTheme}`, `DeptControl_Ekspor_${pptTheme}.pptx`);
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

    // Drawer is hidden from lg up; close it so the scroll lock doesn't linger.
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setIsMobileNavOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);

    return () => {
      document.body.style.overflow = originalOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [isMobileNavOpen]);

  function applyDashboardPayload(payload: Record<string, unknown>, role?: WorkbookRole) {
    const dashboard = payload as unknown as DashboardPayload;
    const loaded = loadedReportsFromPacked(dashboard.reports);

    setReports((current) => {
      if (!role) return { ...current, ...loaded };
      const next = { ...current };
      if (loaded[role]) next[role] = loaded[role];
      else delete next[role];
      return next;
    });
    setStoredMonths((current) => ({ ...current, ...dashboard.months }));
  }

  // Fallback when the server render couldn't load the data.
  useEffect(() => {
    if (!needsDashboardData || initialData) {
      setIsLoadingStoredReports(false);
      return;
    }

    let cancelled = false;

    async function loadStoredReports() {
      setIsLoadingStoredReports(true);

      try {
        const response = await fetch(activeRole ? `/api/dashboard?role=${activeRole}` : "/api/dashboard");
        const payload = await readResponsePayload(response);

        if (!response.ok || !payload) {
          throw new Error(responseError(response, payload, "Data upload tersimpan tidak bisa dimuat."));
        }

        if (!cancelled) applyDashboardPayload(payload);
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
  }, [activeRole, initialData, needsDashboardData]);

  async function uploadRole(role: WorkbookRole, fileList: FileList | null) {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    setLoadingRole(role);
    setErrors((current) => ({ ...current, [role]: undefined }));

    try {
      // One round trip: the API stores the workbook and answers with the refreshed dashboard.
      const response = await uploadWorkbook({
        endpoint: "/api/dashboard",
        file,
        fileField: "files",
        blobPrefix: `dashboard/${role}`,
        fields: { role },
      });
      const payload = await readResponsePayload(response);

      if (!response.ok || !payload) {
        throw new Error(responseError(response, payload, "Workbook tidak bisa diproses."));
      }

      applyDashboardPayload(payload, role);
      clearFilters(role);
      setOverviewFilters({ periodLabels: [] });
      notify.success(`Upload ${role === "invoice" ? "Invoice" : "Payment"} berhasil`, file.name);
      // Drop client-cached pages (e.g. the overview) so they pick up the new data.
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workbook tidak bisa diproses.";
      setErrors((current) => ({ ...current, [role]: message }));
      notify.error("Upload gagal", message);
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
    const confirmed = await confirm({
      title: `Hapus data ${month.label}?`,
      description: `Data ${role === "invoice" ? "Invoice" : "Payment"} bulan ${month.label} akan dihapus dari dashboard. Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: "Hapus data",
    });

    if (!confirmed) {
      return;
    }

    const key = `${role}:${month.periodKey}`;
    setDeletingMonthKey(key);
    setErrors((current) => ({ ...current, [role]: undefined }));

    try {
      const response = await fetch(`/api/dashboard?role=${role}&periodKey=${encodeURIComponent(month.periodKey)}`, {
        method: "DELETE",
      });
      const payload = await readResponsePayload(response);

      if (!response.ok || !payload) {
        throw new Error(responseError(response, payload, "Data bulan tidak bisa dihapus."));
      }

      applyDashboardPayload(payload, role);
      clearFilters(role);
      setOverviewFilters({ periodLabels: [] });
      router.refresh();
      notify.success("Data dihapus", `${role === "invoice" ? "Invoice" : "Payment"} ${month.label} sudah dihapus.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Data bulan tidak bisa dihapus.";
      setErrors((current) => ({ ...current, [role]: message }));
      notify.error("Gagal menghapus", message);
    } finally {
      setDeletingMonthKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <TopProgress active={loadingRole !== null || deletingMonthKey !== null || isLoadingStoredReports} />
      <input
        ref={invoiceInputRef}
        type="file"
        aria-label="Pilih workbook invoice"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => void uploadRole("invoice", event.target.files)}
      />
      <input
        ref={paymentInputRef}
        type="file"
        aria-label="Pilih workbook payment"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => void uploadRole("payment", event.target.files)}
      />

      {isMobileNavOpen ? (
        <div aria-label="Mobile navigation" aria-modal="true" className="fixed inset-0 z-50 lg:hidden" role="dialog">
          <button aria-label="Close navigation" className="absolute inset-0 bg-teal/40 backdrop-blur-sm animate-in fade-in duration-300" type="button" onClick={() => setIsMobileNavOpen(false)} />
          <aside className="relative flex h-full w-80 max-w-[88vw] flex-col bg-[#174D55] p-5 shadow-2xl animate-in slide-in-from-left duration-300 ease-out">
            <div className="flex items-center justify-between gap-3">
              <Logo onDark />
              <Button
                aria-label="Close navigation"
                className="shrink-0 rounded-lg border border-[#F7FFF7]/20 bg-[#F7FFF7]/10 text-[#F7FFF7] hover:bg-[#F7FFF7]/20"
                size="icon"
                type="button"
                variant="secondary"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <Icon icon={Cancel01Icon} className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1">
              <SidebarNavigation view={view} onNavigate={() => setIsMobileNavOpen(false)} />
            </div>

          </aside>
        </div>
      ) : null}

      <aside className={cn("fixed left-0 top-0 z-40 hidden h-screen w-64 bg-[#174D55] transition-transform duration-300 ease-in-out lg:block", isSidebarCollapsed ? "lg:-translate-x-full" : "lg:translate-x-0")}>
        <div className="flex h-full flex-col p-6">
          <div className="mb-10 flex items-center justify-between gap-3">
            <Logo onDark />
            <Button
              aria-label="Tutup sidebar"
              title="Tutup sidebar"
              className="shrink-0 rounded-lg border border-[#F7FFF7]/20 bg-[#F7FFF7]/10 text-[#F7FFF7] hover:bg-[#F7FFF7]/20"
              size="icon"
              type="button"
              variant="secondary"
              onClick={toggleSidebar}
            >
              <Icon icon={PanelLeftCloseIcon} className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <SidebarNavigation view={view} />
          </div>
        </div>
      </aside>

      <header data-scrolled={isScrolled} className={cn("app-header fixed right-0 top-0 z-30 flex min-h-20 w-full items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 transition-[width] duration-300 ease-in-out sm:px-6 lg:px-8", isSidebarCollapsed ? "lg:w-full" : "lg:w-[calc(100%-16rem)]")}>
        <div className="flex min-w-0 items-center gap-3">
          {isSidebarCollapsed ? (
            <Button
              aria-label="Buka sidebar"
              title="Buka sidebar"
              className="hidden shrink-0 lg:inline-flex"
              size="icon"
              type="button"
              variant="outline"
              onClick={toggleSidebar}
            >
              <Icon icon={PanelLeftOpenIcon} className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            aria-expanded={isMobileNavOpen}
            aria-label="Open navigation"
            className="shrink-0 lg:hidden"
            size="icon"
            type="button"
            variant="outline"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <Icon icon={Menu01Icon} className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-[#174D55] md:text-2xl">{pageTitle}</h1>
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
                variant="accent"
              >
                <Icon icon={Download04Icon} className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">PPT NonEkspor</span>
              </Button>
              <MagneticButton type="button" onClick={() => openWorkbookPicker(activeRole)} disabled={loadingRole === activeRole}>
                {loadingRole === activeRole ? <Icon icon={Loading03Icon} className="animate-spin" /> : <Icon icon={CloudUploadIcon} />}
                <span className="sr-only sm:not-sr-only">{loadingRole === activeRole ? "Mengunggah…" : "Upload"}</span>
              </MagneticButton>
            </>
          ) : null}
        </div>
      </header>

      <main className={cn("ml-0 min-h-screen px-4 pb-4 pt-24 transition-[margin] duration-300 ease-in-out sm:px-6 lg:px-8", isSidebarCollapsed ? "lg:ml-0" : "lg:ml-64")}>
        <div ref={contentRef} className="mx-auto max-w-[1500px] space-y-3">
          {exportSection ? <ExportDashboard view={view as ExportDashboardView} initialData={initialExport} /> : null}
          {isKpiView ? <KpiDashboard embedded metricIndex={view === "kpi-timely" ? 1 : 0} initialData={initialKpi} /> : null}

          {activeRole && !reports[activeRole] && !isLoadingStoredReports ? (
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
            <Banner tone="danger" title="Terjadi kendala" dismissible>
              {errors[activeRole]}
            </Banner>
          ) : null}

          {isLoadingStoredReports ? (
            <div data-animate-block className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-teal">
                <Icon icon={Loading03Icon} className="animate-spin text-turquoise" />
                Memuat upload terakhir…
              </p>
              <DashboardSkeleton />
            </div>
          ) : null}

          {activeRole && !hasAnyReport && !isLoadingStoredReports ? (
            <Card data-animate-block className="overflow-hidden border-border bg-card">
              <CardContent className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#174D55]">Separated Reports</p>
                  <h2 className="mt-2 text-2xl font-bold sm:text-3xl tracking-tight text-teal">Upload file {activeRole === "invoice" ? "invoice" : "payment"}</h2>
                  <p className="mt-3 leading-7 text-[#174D55]/90">
                    Dashboard {activeRole === "invoice" ? "Invoice Report Monitoring" : "Payment Report Monitoring"} langsung muncul setelah file diunggah.
                  </p>
                </div>
                <div className="grid place-items-center rounded-xl bg-[linear-gradient(135deg,rgba(78,205,196,0.18),rgba(255,230,109,0.22))] p-6">
                  <EmptyUploadIllustration className="h-40" />
                  <MagneticButton type="button" className="mt-4" onClick={() => openWorkbookPicker(activeRole)}>
                    <Icon icon={CloudUploadIcon} />
                    Pilih file {activeRole === "invoice" ? "invoice" : "payment"}
                  </MagneticButton>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isNonExportOverview && !overviewReady && !isLoadingStoredReports ? (
            <Card data-animate-block className="overflow-hidden border-border bg-card">
              <CardContent className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#174D55]">Combined Overview</p>
                  <h2 className="mt-2 text-2xl font-bold sm:text-3xl tracking-tight text-teal">Upload invoice dan payment</h2>
                  <p className="mt-3 leading-7 text-[#174D55]/90">
                    Setelah kedua file masuk, overview menggabungkan outstanding, payment, exposure, aging, risk, dan trend bulanan.
                  </p>
                </div>
                <div className="grid place-items-center gap-4 rounded-xl bg-[linear-gradient(135deg,rgba(78,205,196,0.18),rgba(255,230,109,0.22))] p-6">
                  <EmptyUploadIllustration className="h-40" />
                  <div className="flex flex-wrap justify-center gap-2 text-xs font-bold">
                    {(["invoice", "payment"] as const).map((role) => (
                      <span key={role} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5", reports[role] ? "bg-teal text-mint" : "bg-white text-teal ring-1 ring-teal/15")}>
                        <span className={cn("size-2 rounded-full", reports[role] ? "bg-turquoise" : "bg-coral")} />
                        {role === "invoice" ? "Invoice" : "Payment"} {reports[role] ? "siap" : "belum ada"}
                      </span>
                    ))}
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
