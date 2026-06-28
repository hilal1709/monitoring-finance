import { BarChart3, Calculator, PieChart, ReceiptText, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { HorizontalBars, StatusBars } from "@/components/dashboard/charts/horizontal-bars";
import { LineTrend } from "@/components/dashboard/charts/line-trend";
import { PaymentMovementSummary } from "@/components/dashboard/charts/payment-movement-summary";
import { TargetAchievementChart, TargetVsRealizationChart } from "@/components/dashboard/charts/target-charts";
import { FilterPanel } from "@/components/dashboard/filter-panel";
import { ReportKpi } from "@/components/dashboard/report-kpi";
import { activeFilterCount, filterOptions, filteredSection, itemByLabel, listLabels, monthlyAverage, paymentMovementSummary, paymentTargetPoints, periodTrendPoints } from "@/lib/dashboard-data";
import { compactFileName, formatCurrency, formatNumber, formatPercent, formatTimestamp } from "@/lib/dashboard-format";
import { monthLabels, statusOrders } from "@/lib/dashboard-constants";
import type { FilterKey, PeriodMode, ReportFilters } from "@/lib/dashboard-types";
import type { DashboardSection, UploadedWorkbookSummary, WorkbookRole } from "@/lib/monitoring-dashboard-types";

export function ReportFrame({
  id,
  section,
  file,
  generatedAt,
  role,
  filters,
  onToggleFilter,
  onClearFilter,
  periodMode,
  onPeriodModeChange,
}: {
  id: string;
  section: DashboardSection;
  file: UploadedWorkbookSummary;
  generatedAt: string;
  role: WorkbookRole;
  filters: ReportFilters;
  onToggleFilter: (key: FilterKey, value: string) => void;
  onClearFilter: (key?: FilterKey) => void;
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
}) {
  const isInvoice = role === "invoice";
  const statusOrder = statusOrders[role];
  const activeSection = filteredSection(section, filters, statusOrder);
  const selectedCount = activeFilterCount(filters);
  const primaryShare = isInvoice ? itemByLabel(activeSection.statusMix, "Bucket 4")?.share ?? 0 : itemByLabel(activeSection.statusMix, "No Risk")?.share ?? 0;
  const groupShare = itemByLabel(activeSection.customerTypes, "Group")?.share ?? 0;
  const externalShare = itemByLabel(activeSection.customerTypes, "External")?.share ?? 0;
  const kpis = isInvoice
    ? [
        { title: "Total Outstanding", value: formatCurrency(activeSection.totalAmount, true), icon: Wallet },
        { title: "Total Invoice", value: formatNumber(activeSection.rowCount), icon: ReceiptText },
        { title: "Average Piutang / Bulan", value: formatCurrency(monthlyAverage(activeSection), true), icon: Calculator },
        { title: "% Bucket 4 (>365)", value: formatPercent(primaryShare), icon: PieChart },
        { title: "Piutang by Customer Type", value: `Group ${formatPercent(groupShare)}`, detail: `External ${formatPercent(externalShare)}`, icon: BarChart3 },
      ]
    : [
        { title: "Total Payment", value: formatCurrency(activeSection.totalAmount, true), icon: Wallet },
        { title: "Total Invoice", value: formatNumber(activeSection.rowCount), icon: ReceiptText },
        { title: "Average Payment", value: formatCurrency(activeSection.averageAmount, true), icon: Calculator },
        { title: "% Current (<30 Day)", value: formatPercent(primaryShare), icon: PieChart },
      ];
  const years = filterOptions(section, "year", [...new Set(section.monthly.map((point) => point.label.split(" ")[1]).filter(Boolean))], Infinity);
  const months = filterOptions(section, "month", monthLabels, 12);
  const customerTypes = filterOptions(section, "customerType", listLabels(section.customerTypes, 2), 4);
  const customerNames = filterOptions(section, "customerName", listLabels(section.topCustomers, isInvoice ? 7 : 8), isInvoice ? 7 : 8);
  const invoiceTypes = filterOptions(section, "invoiceType", listLabels(section.invoiceTypes, isInvoice ? 6 : 9), isInvoice ? 6 : 9);
  const statuses = filterOptions(section, "status", listLabels(section.statusMix, 6), 8);
  const trendPoints = periodTrendPoints(activeSection, periodMode);
  const paymentSummary = !isInvoice ? paymentMovementSummary(activeSection) : null;
  const targetPoints = !isInvoice ? paymentTargetPoints(activeSection) : [];

  return (
    <section id={id} data-animate-block className="overflow-hidden rounded-lg border border-white/10 bg-[#0b1320] shadow-[0_22px_45px_rgba(0,0,0,0.28)]">
      <div className="flex min-h-10 items-center justify-center border-b border-white/10 bg-[#0c1724] px-4 py-1 text-center">
        <h2 className="text-sm font-black uppercase tracking-wide text-[#ffd166] md:text-base">Section Non Cemen</h2>
      </div>

      <div className={cn("grid gap-2 p-2 sm:grid-cols-2", isInvoice ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        {kpis.map((item) => (
          <ReportKpi key={item.title} {...item} accent={isInvoice ? "amber" : "cyan"} compact />
        ))}
      </div>
      {paymentSummary ? <PaymentMovementSummary summary={paymentSummary} /> : null}

      <div className={cn("grid gap-2 p-2 pt-0", isInvoice ? "lg:grid-cols-[1.25fr_1.3fr_1.3fr_0.8fr]" : "lg:grid-cols-[1.1fr_0.9fr_1.1fr_0.95fr]")}>
        <div className="grid content-start gap-2">
          <FilterPanel
            title={isInvoice ? "Cust. Typ" : "Custo. Typ"}
            items={customerTypes}
            columns={2}
            selected={filters.customerType}
            onToggle={(value) => onToggleFilter("customerType", value)}
            onClear={() => onClearFilter("customerType")}
            compact
          />
          <FilterPanel
            title={isInvoice ? "Cust. Name" : "Cust.Name"}
            items={customerNames}
            selected={filters.customerName}
            onToggle={(value) => onToggleFilter("customerName", value)}
            onClear={() => onClearFilter("customerName")}
            compact
          />
        </div>

        <div className="grid content-start gap-2">
          <FilterPanel
            title="Year"
            items={years.length > 0 ? years : ["2025", "2026"]}
            columns={Math.min(3, Math.max(1, years.length)) as 1 | 2 | 3}
            selected={filters.year}
            onToggle={(value) => onToggleFilter("year", value)}
            onClear={() => onClearFilter("year")}
            compact
          />
          <FilterPanel
            title="Month"
            items={months.length > 0 ? months : monthLabels.slice(0, 3)}
            columns={3}
            selected={filters.month}
            onToggle={(value) => onToggleFilter("month", value)}
            onClear={() => onClearFilter("month")}
            compact
          />
          {!isInvoice ? (
            <FilterPanel
              title="Risk Status"
              items={statuses}
              columns={2}
              selected={filters.status}
              onToggle={(value) => onToggleFilter("status", value)}
              onClear={() => onClearFilter("status")}
              compact
            />
          ) : null}
        </div>

        <div className="grid content-start gap-2">
          <FilterPanel
            title="Invoice Typ"
            items={invoiceTypes}
            selected={filters.invoiceType}
            onToggle={(value) => onToggleFilter("invoiceType", value)}
            onClear={() => onClearFilter("invoiceType")}
            compact
          />
        </div>

        {isInvoice ? (
          <DonutChart title="Outstanding Aging by Bucket" items={activeSection.statusMix} centerLabel="Aging" compact />
        ) : (
          <StatusBars title="Payment Aging by Risk" items={activeSection.statusMix} />
        )}
      </div>

      <div className={cn("grid gap-2 p-2 pt-0", isInvoice ? "lg:grid-cols-2" : "lg:grid-cols-[1fr_0.9fr]")}>
        {isInvoice ? (
          <>
            <HorizontalBars title="Top Customers by Outstanding" items={activeSection.topCustomers} maxItems={6} />
            <DonutChart title="Outstanding by Invoice Type" items={activeSection.invoiceTypes} centerLabel="Type" compact />
          </>
        ) : (
          <>
            <DonutChart title="Payment Risk Composition" items={activeSection.statusMix} centerLabel={formatPercent(primaryShare)} compact />
            <HorizontalBars title="Top Customers by Payment" items={activeSection.topCustomers} maxItems={5} />
          </>
        )}
      </div>

      <div className={cn("grid gap-2 p-2 pt-0", isInvoice ? "lg:grid-cols-1" : "lg:grid-cols-[1.15fr_0.9fr_1.15fr]")}>
        <LineTrend title={isInvoice ? "Outstanding Trend" : "Payment Trend"} points={trendPoints} periodMode={periodMode} onPeriodModeChange={onPeriodModeChange} />
        {!isInvoice ? <TargetAchievementChart points={targetPoints} /> : null}
        {!isInvoice ? <TargetVsRealizationChart points={targetPoints} /> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#07111f] px-3 py-2 text-xs font-semibold text-slate-400">
        <span>{compactFileName(file.name)} - {file.sheetName}</span>
        <span>
          {selectedCount > 0 ? `${selectedCount} filter aktif - ` : null}
          Generated {formatTimestamp(generatedAt)}
        </span>
      </div>
    </section>
  );
}
