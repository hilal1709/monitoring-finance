"use client";

import { useMemo, useRef, useState, useLayoutEffect } from "react";
import { ArrowDownRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { SpecChart } from "@/components/charts/spec-chart";
import { cardToneStyles } from "@/components/dashboard-canvas/card-tones";
import { ClassicWidget, classicView } from "@/components/dashboard-canvas/classic-views";
import { NoDataIllustration } from "@/components/illustrations";
import { AnimatedDisplay } from "@/components/ui/animated-number";
import { Icon } from "@/components/ui/icon";
import { buildCardData, buildChartData, type CardData, type PageContext } from "@/lib/chart-builder/aggregate";
import { formatChange, formatValue } from "@/lib/chart-builder/format";
import { comparisonHelp } from "@/lib/chart-builder/time-intel";
import type { Row, SourceDef, WidgetSpec } from "@/lib/chart-builder/types";
import { useSpotlightLift } from "@/lib/use-spotlight-lift";
import { cn } from "@/lib/utils";


/** Panel chrome shared by every custom widget (matches components/export/chart-panel). */
export function WidgetPanel({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card", className)}>
      <header className="border-b border-border px-3 py-2">
        <h2 className="truncate text-xs font-bold uppercase text-teal" title={title}>
          {title}
        </h2>
        {subtitle ? <p className="truncate text-[10px] font-medium text-muted-foreground">{subtitle}</p> : null}
      </header>
      <div className="min-h-0 flex-1 p-2">{children}</div>
    </section>
  );
}

/** Measures the space a chart can fill inside its grid cell. */
function useFillHeight(minimum = 140) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(minimum);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setHeight(Math.max(minimum, Math.floor(entry.contentRect.height))));
    observer.observe(node);
    return () => observer.disconnect();
  }, [minimum]);
  return { ref, height };
}

function EmptyWidget({ message = "Belum ada data untuk pilihan ini." }: { message?: string }) {
  return (
    <div className="grid h-full place-items-center content-center gap-1 py-4 text-center">
      <NoDataIllustration className="h-16" />
      <p className="text-xs font-semibold text-muted-foreground">{message}</p>
    </div>
  );
}

function ChangeBadge({ data, onDark }: { data: CardData; onDark: boolean }) {
  if (data.comparison === "none") return null;
  if (data.comparison === "target") {
    if (data.achievement === null) return <span className="text-[10px] font-semibold opacity-80">Target belum diisi</span>;
    return (
      <span className="text-[10px] font-bold" title={comparisonHelp.target}>
        {formatValue(data.achievement, "percent")} dari target {formatValue(data.target, data.format)}
      </span>
    );
  }
  const change = data.change;
  if (!change || change.percent === null) {
    return (
      <span className="text-[10px] font-semibold opacity-80" title={comparisonHelp[data.comparison]}>
        {data.comparison.toUpperCase()}: data pembanding belum ada
      </span>
    );
  }
  const up = change.percent > 0;
  const good = data.lowerIsBetter ? !up : up;
  return (
    <span className="flex flex-wrap items-center gap-1 text-[10px] font-semibold" title={`${comparisonHelp[data.comparison]} ${change.currentLabel} vs ${change.previousLabel}.`}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-black",
          onDark ? "bg-mint/20" : good ? "bg-teal text-mint" : "bg-[#cc3f3f] text-mint",
        )}
      >
        <Icon icon={up ? ArrowUpRight01Icon : ArrowDownRight01Icon} className="size-3" />
        {formatChange(change.percent)}
      </span>
      <span className="opacity-85">
        {data.comparison.toUpperCase()} · vs {change.previousLabel}
      </span>
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${28 - ((value - min) / span) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-7 w-full opacity-80" aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function CardWidget({ spec, data }: { spec: WidgetSpec; data: CardData }) {
  const motion = useSpotlightLift<HTMLDivElement>();
  const tone = spec.card?.tone ?? "turquoise";
  const progress = spec.card?.display === "progress" ? Math.min(Math.max(data.achievement ?? 0, 0), 1.5) : null;
  const subtitle = data.change ? data.change.currentLabel : spec.subtitle;

  return (
    <div {...motion} style={cardToneStyles[tone]} className={cn("kpi-card relative flex h-full min-h-20 flex-col justify-between gap-1 overflow-hidden rounded-lg p-3", spec.card?.highlight && "kpi-shine")}>
      <span aria-hidden className="kpi-spotlight" />
      <div className="relative min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em]" title={spec.title}>
          {spec.title}
        </p>
        {subtitle ? <p className="truncate text-[10px] font-medium opacity-80">{subtitle}</p> : null}
      </div>
      <p className="relative truncate text-xl font-black tabular-nums" title={formatValue(data.value, data.format)}>
        {data.empty ? "—" : <AnimatedDisplay text={formatValue(data.value, data.format)} />}
      </p>
      {progress !== null ? (
        <div className="relative h-1.5 overflow-hidden rounded-full bg-current/20" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span className="block h-full rounded-full bg-current" style={{ width: `${Math.min(progress, 1) * 100}%` }} />
        </div>
      ) : null}
      {spec.card?.sparkline ? <Sparkline values={data.sparkline} /> : null}
      <div className="relative">
        <ChangeBadge data={data} onDark={tone === "coral"} />
      </div>
    </div>
  );
}

const GAUGE_RADIUS = 52;
const GAUGE_LENGTH = Math.PI * GAUGE_RADIUS;

function GaugeWidget({ spec, data }: { spec: WidgetSpec; data: CardData }) {
  const ratio = data.achievement ?? 0;
  const shown = Math.min(Math.max(ratio, 0), 1);
  return (
    <WidgetPanel title={spec.title} subtitle={spec.subtitle}>
      <div className="grid h-full place-items-center content-center">
        <svg viewBox="0 0 128 76" className="w-full max-w-56" role="img" aria-label={`${formatValue(ratio, "percent")} dari target`}>
          <path d="M12 70 A52 52 0 0 1 116 70" fill="none" stroke="var(--surface-4)" strokeWidth="12" strokeLinecap="round" />
          <path
            className="kpi-gauge-arc"
            d="M12 70 A52 52 0 0 1 116 70"
            fill="none"
            stroke={ratio >= 1 ? "var(--palette-turquoise)" : ratio >= 0.75 ? "var(--palette-yellow)" : "var(--palette-coral)"}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={GAUGE_LENGTH}
            strokeDashoffset={GAUGE_LENGTH * (1 - shown)}
            style={{ "--gauge-length": GAUGE_LENGTH } as React.CSSProperties}
          />
          <text x="64" y="62" textAnchor="middle" className="fill-teal text-[18px] font-black">
            {formatValue(ratio, "percent")}
          </text>
        </svg>
        <p className="text-center text-[11px] font-semibold text-muted-foreground">
          {formatValue(data.value, data.format)} dari {formatValue(data.target, data.format)}
        </p>
      </div>
    </WidgetPanel>
  );
}

function TableWidget({ spec, def, rows, context }: { spec: WidgetSpec; def: SourceDef | undefined; rows: Row[]; context: PageContext }) {
  const data = useMemo(() => buildChartData(spec, def, rows, context), [spec, def, rows, context]);
  if (data.empty) return <EmptyWidget />;
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-[var(--kpi-table-header)] text-left">
          <tr>
            <th className="px-2 py-1.5 font-bold">{def?.fields.find((field) => field.id === spec.dimension)?.label ?? "Kelompok"}</th>
            {data.series.map((series) => (
              <th key={series.id} className="px-2 py-1.5 text-right font-bold">
                {series.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.labels.map((label, index) => (
            <tr key={data.keys[index]} className="odd:bg-[var(--kpi-table-body)] even:bg-[var(--kpi-table-alt)]">
              <td className="max-w-48 truncate px-2 py-1.5 font-semibold" title={label}>
                {label}
              </td>
              {data.series.map((series) => (
                <td key={series.id} className="px-2 py-1.5 text-right tabular-nums">
                  {formatValue(series.values[index], data.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartWidget({ spec, def, rows, context, onSelect }: { spec: WidgetSpec; def: SourceDef | undefined; rows: Row[]; context: PageContext; onSelect?: (key: string) => void }) {
  const data = useMemo(() => buildChartData(spec, def, rows, context), [spec, def, rows, context]);
  const { ref, height } = useFillHeight();
  return (
    <div ref={ref} className="h-full min-h-36">
      {data.empty ? (
        <EmptyWidget />
      ) : (
        <SpecChart
          key={`${spec.chart}-${data.timeMode ?? ""}`}
          height={height}
          kind={spec.chart}
          data={data}
          legend={spec.options?.legend}
          dataLabels={spec.options?.dataLabels}
          smooth={spec.options?.smooth}
          targetLine={spec.options?.targetLine}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

/** Renders any custom widget spec against the rows of its source. */
export function SpecWidget({
  spec,
  def,
  rows,
  context,
  onSelect,
}: {
  spec: WidgetSpec;
  def: SourceDef | undefined;
  rows: Row[] | undefined;
  context: PageContext;
  onSelect?: (key: string) => void;
}) {
  const cardData = useMemo(() => (spec.chart === "card" || spec.chart === "gauge") && rows ? buildCardData(spec, def, rows, context) : null, [spec, def, rows, context]);

  if (!rows || !def) {
    return (
      <WidgetPanel title={spec.title}>
        <EmptyWidget message="Sumber data belum tersedia di halaman ini." />
      </WidgetPanel>
    );
  }
  // Built-ins and new widgets alike draw with the dashboards' own components when one fits.
  if (classicView(spec)) return <ClassicWidget spec={spec} def={def} rows={rows} context={context} />;
  if (spec.chart === "card" && cardData) return <CardWidget spec={spec} data={cardData} />;
  if (spec.chart === "gauge" && cardData) return <GaugeWidget spec={spec} data={cardData} />;
  return (
    <WidgetPanel title={spec.title} subtitle={spec.subtitle}>
      {spec.chart === "table" ? <TableWidget spec={spec} def={def} rows={rows} context={context} /> : <ChartWidget spec={spec} def={def} rows={rows} context={context} onSelect={onSelect} />}
    </WidgetPanel>
  );
}
