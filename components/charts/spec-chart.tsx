"use client";

import dynamic from "next/dynamic";
import { ChartBox } from "@/components/charts";
import type { SpecChartProps } from "@/components/charts/spec-chartjs";
import { formatValue } from "@/lib/chart-builder/format";

// Builder charts share the lazy loading of components/charts: the chart.js
// chunk is fetched only once a chart nears the viewport.
const LazySpecChart = dynamic(() => import("@/components/charts/spec-chartjs").then((module) => module.SpecChartView), { ssr: false });

export function SpecChart({ height, ...props }: SpecChartProps & { height: number }) {
  const label = props.data.series
    .map((series) => `${series.label}: ${props.data.labels.map((name, index) => `${name} ${formatValue(series.values[index], props.data.format)}`).join(", ")}`)
    .join("; ");
  return <ChartBox chart={LazySpecChart} props={props} style={{ height }} label={label || "Grafik"} />;
}
