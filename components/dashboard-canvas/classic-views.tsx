"use client";

import { useMemo, useState } from "react";
import { COLORS, GroupedHorizontalBarChart, HorizontalBarChart } from "@/components/charts";
import { EmptyChart } from "@/components/charts/empty-chart";
import { cardIcon } from "@/components/dashboard-canvas/card-icons";
import { paletteHex } from "@/components/charts/palette";
import { AchievementRing } from "@/components/dashboard/achievement-ring";
import { ChartTitle } from "@/components/dashboard/charts/chart-primitives";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { LineTrend } from "@/components/dashboard/charts/line-trend";
import { PeriodModeSelector } from "@/components/dashboard/period-mode-selector";
import { ReportKpi } from "@/components/dashboard/report-kpi";
import { ChartPanel } from "@/components/export/chart-panel";
import { DestinationMap } from "@/components/export/destination-map";
import { ExportKpi } from "@/components/export/export-kpi";
import { TrendChart } from "@/components/export/trend-chart";
import { buildCardData, buildChartData, periodTotals, widgetRows, type ChartData, type PageContext } from "@/lib/chart-builder/aggregate";
import { formatValue } from "@/lib/chart-builder/format";
import { compare } from "@/lib/chart-builder/time-intel";
import type { Row, SourceDef, WidgetSpec, WidgetView } from "@/lib/chart-builder/types";
import { formatCurrency, formatDeltaPercent, formatNumber, formatPercent } from "@/lib/dashboard-format";
import { resolveDestinationGeo, type DestinationGeoDatum } from "@/lib/export-destinations-geo";
import type { TrendPoint } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

// The dashboards' own components, driven by a widget spec. A built-in that is
// opened in the editor keeps looking (and counting) exactly as before; only
// what the user changes changes.

type Family = "report" | "export";

/** Invoice/Payment pages use the report look; Ekspor and KPI the export look. */
export function familyOf(spec: WidgetSpec): Family {
  if (spec.view === "report" || spec.view === "export") return spec.view;
  return spec.source === "invoice" || spec.source === "payment" || spec.source === "payment-target" ? "report" : "export";
}

/** Which classic view draws this spec, or null for the generic chart. */
export function classicView(spec: WidgetSpec): WidgetView | "card" | "bars" | "donut" | "trend" | null {
  const view = spec.view ?? "auto";
  if (view === "standard") return null;
  // Variance bars need a ratio; without one the widget draws as plain bars.
  if (view === "variance-bars" && !spec.measures[0]?.divideBy) return spec.dimension && spec.measures.length <= 1 && !spec.breakdown ? "bars" : null;
  if (view !== "auto" && view !== "report" && view !== "export") return view;
  const single = spec.measures.length <= 1 && !spec.breakdown;
  const plainCard = spec.chart === "card" && (spec.comparison ?? "none") === "none" && !spec.card?.sparkline && spec.card?.display !== "progress";
  if (plainCard) return "card";
  if (spec.chart === "bar-h" && single && spec.dimension) return "bars";
  if (spec.chart === "bar-h" && !spec.breakdown && spec.measures.length > 1 && spec.dimension) return "grouped-bars";
  if ((spec.chart === "doughnut" || spec.chart === "pie") && single && spec.dimension) return "donut";
  if ((spec.chart === "line" || spec.chart === "area") && spec.dimension === "periodKey" && !spec.breakdown) return "trend";
  return null;
}

const barTone = (color: string | undefined) => paletteHex[(color as keyof typeof paletteHex) ?? "turquoise"] ?? COLORS.turquoise;

function Frame({ spec, family, children, className, context }: { spec: WidgetSpec; family: Family; children: React.ReactNode; className?: string; context?: PageContext }) {
  const title = spec.options?.appendPeriodLabel && context?.periodLabel ? `${spec.title} - ${context.periodLabel}` : spec.title;
  if (family === "export") {
    return (
      <ChartPanel title={title} className={cn("h-full", className)}>
        {children}
      </ChartPanel>
    );
  }
  return (
    <div className={cn("h-full space-y-1.5 rounded-lg border border-border bg-card p-2", className)}>
      <ChartTitle title={title} />
      {children}
    </div>
  );
}

function tooltipFor(data: ChartData, index: number, family: Family) {
  const series = data.series[0];
  const value = series?.values[index] ?? 0;
  if (family !== "report" || !series) return undefined;
  return `${data.labels[index]}: ${formatCurrency(value)} | ${formatPercent(series.total ? value / series.total : 0)} | ${formatNumber(data.counts?.[index] ?? 0)} rows`;
}

function ClassicBars({ spec, data, family }: { spec: WidgetSpec; data: ChartData; family: Family }) {
  const series = data.series[0];
  const color = barTone(spec.measures[0]?.color);
  const items = data.labels.map((label, index) => ({ label, value: series?.values[index] ?? 0, tooltip: tooltipFor(data, index, family) }));
  return (
    <Frame spec={spec} family={family}>
      {items.length === 0 ? (
        <EmptyChart text={family === "export" ? "Tidak ada data" : undefined} />
      ) : (
        <div className={family === "export" ? "p-3" : undefined}>
          <HorizontalBarChart items={items} color={color} negativeColor={color === COLORS.coral ? COLORS.teal : COLORS.coral} format={(value) => formatValue(value, data.format)} />
        </div>
      )}
    </Frame>
  );
}

function ClassicGroupedBars({ spec, data, family, context }: { spec: WidgetSpec; data: ChartData; family: Family; context: PageContext }) {
  const series = data.series.filter((item) => !item.dashed && item.id !== "trend");
  const followsPage = spec.timeMode === "page" && context.periodMode && context.onPeriodModeChange;
  return (
    <div className="h-full space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-teal">
        <span className={family === "report" ? "uppercase" : undefined}>{spec.title}</span>
        <span className="flex flex-wrap items-center gap-3">
          {followsPage ? <PeriodModeSelector value={context.periodMode!} onChange={context.onPeriodModeChange!} /> : null}
          {series.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1">
              <span className="size-3 rounded-sm" style={{ backgroundColor: paletteHex[item.color] }} /> {item.label}
            </span>
          ))}
        </span>
      </div>
      {data.labels.length ? (
        <GroupedHorizontalBarChart
          key={data.timeMode}
          labels={data.labels}
          series={series.map((item) => ({ label: item.label, data: item.values.map((value) => value ?? 0), color: paletteHex[item.color] }))}
          format={(value) => formatValue(value, data.format)}
        />
      ) : (
        <EmptyChart text="Tidak ada data pembanding" />
      )}
    </div>
  );
}

function ClassicDonut({ spec, data }: { spec: WidgetSpec; data: ChartData }) {
  const series = data.series[0];
  const items = data.labels.map((label, index) => {
    const value = series?.values[index] ?? 0;
    return { label, value, count: data.counts?.[index] ?? 0, share: series?.total ? value / series.total : 0 };
  });
  const summaryOf = spec.options?.summaryOf;
  const summaryItem = summaryOf ? items.find((item) => item.label.toLowerCase() === summaryOf.label.toLowerCase()) : undefined;
  const centerOf = spec.options?.centerShareOf;
  const centerItem = centerOf ? items.find((item) => item.label.toLowerCase() === centerOf.toLowerCase()) : undefined;
  return (
    <DonutChart
      title={spec.title}
      items={items}
      centerLabel={centerOf ? formatPercent(centerItem?.share ?? 0) : spec.options?.centerLabel}
      summary={summaryOf ? `${summaryOf.caption}: ${formatPercent(summaryItem?.share ?? 0)}` : undefined}
      compact
    />
  );
}

function ClassicTrend({ spec, data, family, context }: { spec: WidgetSpec; data: ChartData; family: Family; context: PageContext }) {
  // The report pages' trend: one line + last year, with the MoM/YoY/YTD selector in the header.
  if (family === "report" && spec.timeMode === "page" && context.periodMode && context.onPeriodModeChange) {
    const main = data.series[0];
    const last = data.series.find((item) => item.dashed);
    const points: TrendPoint[] = data.keys.map((key, index) => {
      const value = main?.values[index] ?? 0;
      const compareValue = context.periodMode === "yoy" ? 0 : (last?.values[index] ?? null);
      return {
        key,
        label: data.labels[index],
        value,
        valueLabel: formatValue(value, data.format),
        compareValue,
        compareLabel: compareValue === null ? null : formatValue(compareValue, data.format),
      };
    });
    return <LineTrend title={spec.title} points={points} periodMode={context.periodMode} onPeriodModeChange={context.onPeriodModeChange} />;
  }
  const points = data.keys.map((key, index) => ({ key, label: data.labels[index], ...Object.fromEntries(data.series.map((item) => [item.id, item.values[index]])) }));
  return (
    <Frame spec={spec} family={family} context={context}>
      <TrendChart points={points} series={data.series.map((item) => ({ key: item.id, label: item.label, color: paletteHex[item.color] }))} valueFormatter={(value) => formatValue(value, data.format)} />
    </Frame>
  );
}

function ClassicVarianceBars({ spec, data }: { spec: WidgetSpec; data: ChartData }) {
  const series = data.series[0];
  return (
    <div className="h-full rounded-lg border border-border bg-card p-2">
      <ChartTitle title={spec.title} />
      <div className="mt-2">
        <HorizontalBarChart
          rowHeight={26}
          labelWidth={40}
          color={COLORS.teal}
          negativeColor={COLORS.coral}
          items={data.labels.map((label, index) => {
            const ratio = series?.values[index] ?? 0;
            const variance = ratio ? ratio - 1 : -1;
            return { label, value: variance, tooltip: formatDeltaPercent(variance) };
          })}
          format={(value) => formatDeltaPercent(value)}
        />
      </div>
    </div>
  );
}

function ClassicMovement({ spec, def, rows, context }: { spec: WidgetSpec; def: SourceDef | undefined; rows: Row[]; context: PageContext }) {
  const totals = useMemo(() => {
    const measure = spec.measures[0] ?? { field: "amount", agg: "sum" as const };
    // A measure picked from another page source counts that source's rows.
    const other = measure.source && measure.source !== spec.source ? context.resolve?.(measure.source) : undefined;
    return periodTotals(other ? widgetRows(spec, other.rows, context, other.def) : widgetRows(spec, rows, context, def), measure);
  }, [spec, def, rows, context]);
  const items = (["mom", "yoy", "ytd"] as const).map((mode) => ({ label: mode.toUpperCase(), result: compare(totals, mode, context.referencePeriod) }));
  return (
    <div className="grid gap-2 px-2 pb-2 sm:grid-cols-3">
      {items.map((item) => {
        const value = item.result?.percent ?? null;
        const positive = value !== null && value >= 0;
        return (
          <div key={item.label} title={item.result ? `${item.result.currentLabel} vs ${item.result.previousLabel}` : undefined} className="rounded-lg border border-[#174D55]/30 bg-[#FFFFFF] px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#174D55]/90">{item.label}</span>
              <span className={cn("text-base font-black", positive ? "text-[#174D55]" : "text-coral-ink")}>{formatDeltaPercent(value)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClassicKpiSummary({ spec, def, rows, context }: { spec: WidgetSpec; def: SourceDef | undefined; rows: Row[]; context: PageContext }) {
  const data = useMemo(() => buildCardData({ ...spec, card: { display: "progress", ...spec.card, compute: "value" } }, def, rows, context), [spec, def, rows, context]);
  const actual = data.value ?? 0;
  const target = data.target ?? 0;
  const percent = target ? (actual / target) * 100 : 0;
  const metric = spec.subtitle ?? spec.title;
  const fmt = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  return (
    <article className="grid h-full min-h-[260px] grid-rows-[auto_1fr_auto] gap-4 rounded-lg border border-border bg-card p-4 sm:min-h-[340px]">
      <div className="overflow-hidden rounded-md border border-[var(--kpi-table-border)]">
        <div className="grid grid-cols-[1.55fr_repeat(3,0.85fr)] bg-[var(--kpi-table-header)] text-center text-xs font-bold text-[var(--kpi-table-text)]">
          <span className="px-2 py-3">Indikator KPI {context.periodTag ?? ""}</span>
          <span className="border-l border-[var(--kpi-table-border)] px-2 py-3">Realisasi</span>
          <span className="border-l border-[var(--kpi-table-border)] px-2 py-3">Target</span>
          <span className="border-l border-[var(--kpi-table-border)] px-2 py-3">Prosentase</span>
        </div>
        <div className="grid grid-cols-[1.55fr_repeat(3,0.85fr)] border-t border-[var(--kpi-table-border)] text-center text-xs font-bold text-[var(--kpi-table-text)]">
          <span className="flex items-center justify-center bg-[var(--kpi-table-body)] px-2 py-4 sm:px-3">{metric}</span>
          <span className="flex items-center justify-center border-l border-[var(--kpi-table-border)] bg-[var(--kpi-table-alt)] px-2 py-4">{fmt(actual)}</span>
          <span className="flex items-center justify-center border-l border-[var(--kpi-table-border)] bg-[var(--kpi-table-body)] px-2 py-4">{fmt(target)}</span>
          <span className="flex items-center justify-center border-l border-[var(--kpi-table-border)] bg-[var(--kpi-table-alt)] px-2 py-4">{fmt(percent)}%</span>
        </div>
      </div>
      <div className="grid place-items-center py-1 text-center">
        <AchievementRing key={`${context.periodLabel}-${percent}`} percent={percent} />
      </div>
      <p className="text-center text-sm font-bold leading-6">
        {spec.source === "kpi"
          ? `Realisasi ${context.periodLabel ?? "periode ini"} mencapai Rp ${fmt(actual)} Miliar dari target sebesar Rp ${fmt(target)} Miliar`
          : `Realisasi ${context.periodLabel ?? "periode ini"} mencapai ${formatValue(actual, data.format)} dari target sebesar ${formatValue(target, data.format)}`}
      </p>
    </article>
  );
}

function ClassicKpiTable({ spec, data }: { spec: WidgetSpec; data: ChartData }) {
  const fmt = (value: number | null) => (value ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
  const rows = data.series.filter((item) => !item.dashed && item.id !== "trend");
  return (
    <div className="h-full overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-180 text-center text-xs">
        <thead className="bg-[var(--kpi-table-header)] text-[var(--kpi-table-text)]">
          <tr>
            <th colSpan={2} className="min-w-56 px-3 py-2 text-left">
              KETERANGAN
            </th>
            <th className="min-w-22 px-2 py-2">
              Total
              <br />
              End year
            </th>
            {data.labels.map((label, index) => (
              <th key={data.keys[index]} className="min-w-16 px-2 py-2">
                {label.split(" ")[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[var(--kpi-table-text)]">
          {rows.map((series, index) => (
            <tr key={series.id} className="border-t border-[var(--kpi-table-border)] transition-colors hover:bg-turquoise/5">
              {index === 0 ? (
                <th rowSpan={rows.length} className="bg-[var(--kpi-table-header)] px-3 py-3 text-left">
                  {spec.subtitle ?? spec.title}
                </th>
              ) : null}
              <th className="bg-[var(--kpi-table-body)] px-2 py-2">{series.label}</th>
              <td className={cn("px-2 py-2 font-bold", index % 2 ? "bg-[var(--kpi-table-alt)]" : "bg-[var(--kpi-table-body)]")}>{fmt(series.total)}</td>
              {series.values.map((value, column) => (
                <td key={data.keys[column]} className={cn("px-2 py-2", index % 2 ? "bg-[var(--kpi-table-alt)]" : "bg-[var(--kpi-table-body)]")}>
                  {fmt(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Nilai (USD)" → "USD", as the map title always showed. */
const unit = (label: string) => label.match(/\(([^)]+)\)\s*$/)?.[1] ?? label;

function ClassicMap({ spec, data }: { spec: WidgetSpec; data: ChartData }) {
  const [index, setIndex] = useState(0);
  const { points, unresolved } = useMemo(() => {
    const byName = new Map<string, DestinationGeoDatum>();
    const missing: string[] = [];
    data.labels.forEach((label, position) => {
      const geo = resolveDestinationGeo(label);
      if (!geo) {
        missing.push(label);
        return;
      }
      const point = byName.get(geo.name) ?? { ...geo, usdValue: 0, tonnage: 0, count: 0 };
      point.usdValue += data.series[0]?.values[position] ?? 0;
      point.tonnage += data.series[1]?.values[position] ?? 0;
      point.count += data.counts?.[position] ?? 0;
      byName.set(geo.name, point);
    });
    return { points: [...byName.values()], unresolved: missing };
  }, [data]);
  const metrics = data.series.slice(0, 2);
  return (
    <ChartPanel title={`${spec.title} (${unit(metrics[index]?.label ?? "")})`} className="h-full">
      {metrics.length > 1 ? (
        <div className="flex items-center justify-end gap-1 px-3 pt-2">
          {metrics.map((metric, position) => (
            <button
              key={metric.id}
              type="button"
              onClick={() => setIndex(position)}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                index === position ? (position === 0 ? "border-[#FFE66D] bg-[#FFE66D] text-[#174D55]" : "border-[#174D55] bg-[#174D55] text-[#F7FFF7]") : "border-[var(--border)] text-[var(--muted-fg)]",
              )}
            >
              {metric.label}
            </button>
          ))}
        </div>
      ) : null}
      <DestinationMap points={points} metric={index === 0 ? "usd" : "tonnage"} />
      {unresolved.length > 0 ? <p className="border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--muted-fg)]">Tujuan tanpa koordinat: {unresolved.join(", ")}</p> : null}
    </ChartPanel>
  );
}

function ClassicCard({ spec, def, rows, context, family }: { spec: WidgetSpec; def: SourceDef | undefined; rows: Row[]; context: PageContext; family: Family }) {
  const data = useMemo(() => buildCardData(spec, def, rows, context), [spec, def, rows, context]);
  const value = data.text ?? (data.empty && data.value === null ? "-" : formatValue(data.value, data.format));
  const icon = cardIcon(spec.card?.icon);
  if (family === "report") {
    return <ReportKpi icon={icon} title={spec.title} value={value} detail={data.detail} tone={spec.card?.tone} compact highlight={spec.card?.highlight} />;
  }
  const ring = spec.card?.ring ? (data.achievement ?? 0) * 100 : undefined;
  return <ExportKpi title={spec.title} value={value} icon={icon} tone={spec.card?.tone} highlight={spec.card?.highlight} gauge={ring} />;
}

/** The classic rendering of `spec`, or null when only the generic chart can draw it. */
export function ClassicWidget({ spec, def, rows, context }: { spec: WidgetSpec; def: SourceDef | undefined; rows: Row[]; context: PageContext }) {
  const view = classicView(spec);
  const family = familyOf(spec);
  const needsChart = view !== "card" && view !== "movement" && view !== "kpi-summary";
  const data = useMemo(() => (needsChart ? buildChartData(spec, def, rows, context) : null), [needsChart, spec, def, rows, context]);

  switch (view) {
    case "card":
      return <ClassicCard spec={spec} def={def} rows={rows} context={context} family={family} />;
    case "movement":
      return <ClassicMovement spec={spec} def={def} rows={rows} context={context} />;
    case "kpi-summary":
      return <ClassicKpiSummary spec={spec} def={def} rows={rows} context={context} />;
    case "bars":
      return <ClassicBars spec={spec} data={data!} family={family} />;
    case "grouped-bars":
      return <ClassicGroupedBars spec={spec} data={data!} family={family} context={context} />;
    case "donut":
      return <ClassicDonut spec={spec} data={data!} />;
    case "trend":
      return <ClassicTrend spec={spec} data={data!} family={family} context={context} />;
    case "variance-bars":
      return <ClassicVarianceBars spec={spec} data={data!} />;
    case "kpi-table":
      return <ClassicKpiTable spec={spec} data={data!} />;
    case "map":
      return <ClassicMap spec={spec} data={data!} />;
    default:
      return null;
  }
}
