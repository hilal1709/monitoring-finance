import { Calculator, PieChart, ReceiptText, Wallet } from "lucide-react";
import { CombinedMonthlyBars } from "@/components/dashboard/charts/combined-monthly-bars";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { HorizontalBars } from "@/components/dashboard/charts/horizontal-bars";
import { OverviewMonthDropdown } from "@/components/dashboard/overview-month-dropdown";
import { ReportKpi } from "@/components/dashboard/report-kpi";
import { filteredSectionByPeriodLabels, itemByLabel, overviewPeriodLabels } from "@/lib/dashboard-data";
import { compactFileName, formatCurrency, formatNumber, formatPercent } from "@/lib/dashboard-format";
import { statusOrders } from "@/lib/dashboard-constants";
import type { LoadedReport, OverviewFilters, PeriodMode } from "@/lib/dashboard-types";

export function CombinedOverview({
  invoice,
  payment,
  periodMode,
  onPeriodModeChange,
  periodFilters,
  onTogglePeriodFilter,
  onClearPeriodFilter,
}: {
  invoice: LoadedReport;
  payment: LoadedReport;
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
  periodFilters: OverviewFilters;
  onTogglePeriodFilter: (value: string) => void;
  onClearPeriodFilter: () => void;
}) {
  const invoiceSection = filteredSectionByPeriodLabels(invoice.section, periodFilters.periodLabels, statusOrders.invoice);
  const paymentSection = filteredSectionByPeriodLabels(payment.section, periodFilters.periodLabels, statusOrders.payment);
  const outstanding = invoiceSection.totalAmount;
  const paid = paymentSection.totalAmount;
  const coverage = outstanding > 0 ? paid / outstanding : 0;
  const exposure = outstanding - paid;
  const invoiceBucket4 = itemByLabel(invoiceSection.statusMix, "Bucket 4")?.share ?? 0;
  const currentPayment = itemByLabel(paymentSection.statusMix, "No Risk")?.share ?? 0;
  const availablePeriods = overviewPeriodLabels(invoice.section, payment.section);
  const kpis = [
    { title: "Total Outstanding", value: formatCurrency(outstanding, true), icon: ReceiptText, accent: "amber" as const },
    { title: "Total Payment", value: formatCurrency(paid, true), icon: Wallet, accent: "emerald" as const },
    { title: "Cash Coverage", value: formatPercent(coverage), icon: PieChart, accent: "cyan" as const },
    { title: "Net Exposure", value: formatCurrency(exposure, true), icon: Calculator, accent: "amber" as const },
  ];

  return (
    <section id="overview-dashboard" data-animate-block className="overflow-hidden rounded-lg border border-white/10 bg-[#0b1320] shadow-[0_22px_45px_rgba(0,0,0,0.28)]">
      <div className="flex min-h-11 items-center justify-center border-b border-white/10 bg-[#0c1724] px-4 py-2 text-center">
        <h2 className="text-lg font-black uppercase tracking-wide text-white md:text-2xl">
          Overview Report Monitoring <span className="text-[#ffd166]">|</span> <span className="text-sm text-[#ffd166] md:text-lg">Invoice + Payment</span>
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-[#07111f] p-2.5">
        <OverviewMonthDropdown
          items={availablePeriods.length > 0 ? availablePeriods : ["Jan 2025"]}
          selected={periodFilters.periodLabels}
          onToggle={onTogglePeriodFilter}
          onClear={onClearPeriodFilter}
        />
      </div>

      <div className="grid gap-2.5 p-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => (
          <ReportKpi key={item.title} {...item} compact />
        ))}
      </div>

      <div className="grid gap-2.5 p-2.5 pt-0 lg:grid-cols-[0.95fr_0.95fr_1.25fr]">
        <DonutChart
          title="Invoice Aging by Bucket"
          items={invoiceSection.statusMix}
          centerLabel="Invoice Aging"
          summary={`Bucket 4 (>365): ${formatPercent(invoiceBucket4)}`}
          compact
        />
        <DonutChart
          title="Payment Risk Composition"
          items={paymentSection.statusMix}
          centerLabel="Payment Risk"
          summary={`Current: ${formatPercent(currentPayment)}`}
          compact
        />
        <CombinedMonthlyBars invoice={invoiceSection} payment={paymentSection} periodMode={periodMode} onPeriodModeChange={onPeriodModeChange} />
      </div>

      <div className="grid gap-2.5 p-2.5 pt-0 lg:grid-cols-2">
        <div>
          <div className="rounded-t-lg border border-b-0 border-white/10 bg-[#0c1724] p-2 text-center text-sm font-black uppercase text-[#ffd166]">Top Billing Customers</div>
          <HorizontalBars items={invoiceSection.topCustomers} maxItems={5} />
        </div>
        <div>
          <div className="rounded-t-lg border border-b-0 border-white/10 bg-[#0c1724] p-2 text-center text-sm font-black uppercase text-[#70f0bf]">Top Payment Customers</div>
          <HorizontalBars items={paymentSection.topCustomers} maxItems={5} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#07111f] px-3 py-2 text-xs font-semibold text-slate-400">
        <span>{compactFileName(invoice.file.name)} + {compactFileName(payment.file.name)}</span>
        <span>Invoice {formatNumber(invoice.file.rowCount)} rows - Payment {formatNumber(payment.file.rowCount)} rows</span>
      </div>
    </section>
  );
}
