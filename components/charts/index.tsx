"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";
import type { DoughnutChartProps, GroupedHorizontalBarChartProps, HorizontalBarChartProps, LineChartProps } from "@/components/charts/types";
import { cn } from "@/lib/utils";

export { COLORS } from "@/components/charts/colors";
export type { BarSeries, HorizontalBarDatum, LineSeries } from "@/components/charts/types";

// chart.js (~200 KB) is the heaviest client dependency. Each chart reserves its
// final size up front (no layout shift), and the chart code is only fetched
// once a chart comes near the viewport, keeping it off the critical path.

const loadCharts = () => import("@/components/charts/chartjs");

const LazyHorizontalBarChart = dynamic(() => loadCharts().then((module) => module.HorizontalBarChart), { ssr: false });
const LazyGroupedHorizontalBarChart = dynamic(() => loadCharts().then((module) => module.GroupedHorizontalBarChart), { ssr: false });
const LazyLineChart = dynamic(() => loadCharts().then((module) => module.LineChart), { ssr: false });
const LazyDoughnutChart = dynamic(() => loadCharts().then((module) => module.DoughnutChart), { ssr: false });

function ChartBox<P extends object>({ chart: Chart, props, style, label }: { chart: ComponentType<P>; props: P; style: CSSProperties; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} role="img" aria-label={label} style={style} className={cn("relative", !visible && "rounded-lg bg-muted/40")}>
      {visible ? <Chart {...props} /> : null}
    </div>
  );
}

/** Ranked horizontal bars with value labels; negative values flip to `negativeColor`. */
export function HorizontalBarChart(props: HorizontalBarChartProps) {
  const height = Math.max(props.items.length * (props.rowHeight ?? 30) + 16, 80);
  const label = props.items.map((item) => `${item.label}: ${props.format(item.value)}`).join(", ");
  return <ChartBox chart={LazyHorizontalBarChart} props={props} style={{ height }} label={label} />;
}

/** Grouped horizontal bars, e.g. Invoice vs Payment per month. */
export function GroupedHorizontalBarChart(props: GroupedHorizontalBarChartProps) {
  const height = Math.max(props.labels.length * (props.rowHeight ?? 46) + 16, 120);
  const label = props.series.map((series) => `${series.label}: ${props.labels.map((name, index) => `${name} ${props.format(series.data[index] ?? 0)}`).join(", ")}`).join("; ");
  return <ChartBox chart={LazyGroupedHorizontalBarChart} props={props} style={{ height }} label={label} />;
}

/** Multi-series line chart with soft gradient fill under the emphasised series. */
export function LineChart(props: LineChartProps) {
  const label = `Grafik tren ${props.series.map((series) => series.label).join(", ")} (${props.labels[0] ?? ""} – ${props.labels.at(-1) ?? ""})`;
  return <ChartBox chart={LazyLineChart} props={props} style={{ height: props.height ?? 176 }} label={label} />;
}

/** Doughnut with an optional two-line center label ("Title\nsubtitle"). */
export function DoughnutChart(props: DoughnutChartProps) {
  const size = props.size ?? 144;
  const label = props.labels.map((name, index) => props.tooltips?.[index] ?? `${name}: ${props.values[index]}`).join(", ");
  return <ChartBox chart={LazyDoughnutChart} props={props} style={{ height: size, width: size }} label={label} />;
}
