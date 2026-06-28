import { cn } from "@/lib/utils";
import { HoverValue } from "@/components/dashboard/charts/chart-primitives";
import { PeriodModeSelector } from "@/components/dashboard/period-mode-selector";
import { chartBarWidth, formatTrendValue, periodTrendPoints } from "@/lib/dashboard-data";
import type { PeriodMode } from "@/lib/dashboard-types";
import type { DashboardSection } from "@/lib/monitoring-dashboard-types";

export function CombinedMonthlyBars({
  invoice,
  payment,
  periodMode,
  onPeriodModeChange,
}: {
  invoice: DashboardSection;
  payment: DashboardSection;
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
}) {
  const monthMap = new Map<string, { label: string; invoice: number; payment: number }>();

  for (const point of periodTrendPoints(invoice, periodMode)) {
    const item = monthMap.get(point.key) ?? { label: point.label, invoice: 0, payment: 0 };
    item.invoice += point.value;
    monthMap.set(point.key, item);
  }

  for (const point of periodTrendPoints(payment, periodMode)) {
    const item = monthMap.get(point.key) ?? { label: point.label, invoice: 0, payment: 0 };
    item.payment += point.value;
    monthMap.set(point.key, item);
  }

  const points = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => ({ key, ...value }));
  const max = Math.max(...points.flatMap((point) => [Math.abs(point.invoice), Math.abs(point.payment)]), 1);

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-[#0c1724] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-100">
        <span>Billing vs Payment Trend</span>
        <span className="flex flex-wrap items-center gap-3">
          <PeriodModeSelector value={periodMode} onChange={onPeriodModeChange} />
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 bg-[#ffd166]" /> Invoice</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 bg-[#70f0bf]" /> Payment</span>
        </span>
      </div>
      {points.length > 0 ? (
        points.map((point) => (
          <div key={point.key} className="grid grid-cols-[64px_1fr] items-center gap-3 text-[10px] font-bold text-slate-300">
            <span className="truncate text-right">{point.label}</span>
            <div className="grid gap-1">
              <div tabIndex={0} title={`Invoice ${point.label}: ${formatTrendValue(point.invoice, periodMode)}`} className="group relative h-4 overflow-hidden rounded bg-white/[0.06] outline-none">
                <HoverValue text={`Invoice ${point.label}: ${formatTrendValue(point.invoice, periodMode)}`} />
                <div
                  className={cn("h-full border", point.invoice < 0 ? "border-[#b91c1c] bg-[#ff9f8e]" : "border-[#b88700] bg-[#ffd166]")}
                  style={{ width: `${chartBarWidth(point.invoice, max)}%` }}
                />
                <span className="chart-value absolute right-1 top-0 text-[9px] font-bold">{formatTrendValue(point.invoice, periodMode)}</span>
              </div>
              <div tabIndex={0} title={`Payment ${point.label}: ${formatTrendValue(point.payment, periodMode)}`} className="group relative h-4 overflow-hidden rounded bg-white/[0.06] outline-none">
                <HoverValue text={`Payment ${point.label}: ${formatTrendValue(point.payment, periodMode)}`} />
                <div
                  className={cn("h-full border", point.payment < 0 ? "border-[#b91c1c] bg-[#ff9f8e]" : "border-[#0f766e] bg-[#70f0bf]")}
                  style={{ width: `${chartBarWidth(point.payment, max)}%` }}
                />
                <span className="chart-value absolute right-1 top-0 text-[9px] font-bold">{formatTrendValue(point.payment, periodMode)}</span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="grid min-h-40 place-items-center text-center text-xs font-semibold text-slate-400">Tidak ada data pembanding</div>
      )}
    </div>
  );
}
