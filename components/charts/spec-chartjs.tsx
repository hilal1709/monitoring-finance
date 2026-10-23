"use client";

import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
  type ChartData as ChartJsData,
  type ChartOptions,
  type ScriptableContext,
} from "chart.js";
import { Chart, Doughnut, Pie, Radar, Scatter } from "react-chartjs-2";
import { COLORS } from "@/components/charts/colors";
import type { ChartData } from "@/lib/chart-builder/aggregate";
import { formatValue } from "@/lib/chart-builder/format";
import type { ChartKind } from "@/lib/chart-builder/types";
import { paletteHex } from "@/components/charts/palette";
import { prefersReducedMotion } from "@/lib/motion";

// Generic renderer for builder specs. Loaded lazily through components/charts/spec-chart.tsx;
// the shared chart.js defaults (fonts, tooltip card) are set in ./chartjs.tsx, imported here
// so they apply even when a page only shows custom widgets.
import "@/components/charts/chartjs";

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarController, LineController, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

export { paletteHex } from "@/components/charts/palette";

export type SpecChartProps = {
  kind: ChartKind;
  data: ChartData;
  legend?: boolean;
  dataLabels?: boolean;
  smooth?: boolean;
  targetLine?: number;
  /** Click-to-filter: receives the raw group key behind the clicked bar/slice. */
  onSelect?: (key: string) => void;
};

function animation(step = 50): unknown {
  if (typeof window !== "undefined" && prefersReducedMotion()) return false;
  return {
    duration: 800,
    easing: "easeOutQuart",
    delay: (context: ScriptableContext<"bar">) => (context.type === "data" && context.mode === "default" ? context.dataIndex * step : 0),
  };
}

function gradient(color: string) {
  return (context: ScriptableContext<"line">) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return "transparent";
    const fill = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    fill.addColorStop(0, `${color}66`);
    fill.addColorStop(1, `${color}00`);
    return fill;
  };
}

function shortLabel(label: string, max = 16) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function SpecChartView({ kind, data, legend, dataLabels, smooth = true, targetLine, onSelect }: SpecChartProps) {
  const format = (value: number) => formatValue(value, data.format);
  const showLegend = legend ?? data.series.length > 1;
  const onClick: ChartOptions["onClick"] = onSelect
    ? (_event, elements) => {
        const index = elements[0]?.index;
        if (index !== undefined && data.keys[index] !== undefined) onSelect(data.keys[index]);
      }
    : undefined;
  const legendOptions = { display: showLegend, position: "bottom" as const, labels: { usePointStyle: true, boxWidth: 8, padding: 14 } };
  const tooltipLabel = (item: { dataset: { label?: string }; raw: unknown }) => `${item.dataset.label ?? ""}: ${item.raw == null ? "—" : format(Number(item.raw))}`;

  if (kind === "pie" || kind === "doughnut") {
    const values = data.series[0]?.values.map((value) => value ?? 0) ?? [];
    const colors = data.labels.map((_, index) => paletteHex[(["turquoise", "coral", "sun", "teal", "turquoise-soft", "coral-soft", "sun-soft", "slate"] as const)[index % 8]]);
    const total = values.reduce((sum, value) => sum + value, 0);
    const chartData = {
      labels: data.labels,
      datasets: [{ data: values, backgroundColor: colors, borderColor: "#ffffff", borderWidth: 2, hoverOffset: 8, borderRadius: 4 }],
    };
    const options: ChartOptions<"doughnut"> = {
      cutout: kind === "pie" ? 0 : "62%",
      layout: { padding: 6 },
      onClick: onClick as ChartOptions<"doughnut">["onClick"],
      animation: typeof window !== "undefined" && prefersReducedMotion() ? false : { animateRotate: true, duration: 1000, easing: "easeOutQuart" },
      plugins: {
        legend: { ...legendOptions, display: legend ?? true },
        tooltip: { callbacks: { label: (item) => `${item.label}: ${format(Number(item.raw))} (${total ? Math.round((Number(item.raw) / total) * 100) : 0}%)` } },
      },
    };
    return kind === "pie" ? <Pie data={chartData} options={options as ChartOptions<"pie">} /> : <Doughnut data={chartData} options={options} />;
  }

  if (kind === "radar") {
    return (
      <Radar
        data={{
          labels: data.labels,
          datasets: data.series.map((series) => ({
            label: series.label,
            data: series.values,
            borderColor: paletteHex[series.color],
            backgroundColor: `${paletteHex[series.color]}33`,
            pointBackgroundColor: paletteHex[series.color],
            borderWidth: 2,
          })),
        }}
        options={{
          scales: { r: { grid: { color: COLORS.grid }, angleLines: { color: COLORS.grid }, ticks: { display: false }, pointLabels: { callback: (label) => shortLabel(String(label), 14) } } },
          plugins: { legend: legendOptions, tooltip: { callbacks: { label: tooltipLabel } } },
        }}
      />
    );
  }

  if (kind === "scatter") {
    const [x, y] = data.series;
    return (
      <Scatter
        data={{
          datasets: [
            {
              label: `${x?.label ?? ""} vs ${y?.label ?? ""}`,
              data: data.labels.map((_, index) => ({ x: x?.values[index] ?? 0, y: y?.values[index] ?? 0 })),
              backgroundColor: `${COLORS.turquoise}cc`,
              borderColor: COLORS.teal,
              pointRadius: 5,
              pointHoverRadius: 8,
            },
          ],
        }}
        options={{
          onClick: onClick as ChartOptions<"scatter">["onClick"],
          scales: {
            x: { grid: { color: COLORS.grid }, title: { display: true, text: x?.label }, ticks: { maxTicksLimit: 6, callback: (value) => format(Number(value)) } },
            y: { grid: { color: COLORS.grid }, title: { display: true, text: y?.label }, ticks: { maxTicksLimit: 5, callback: (value) => format(Number(value)) } },
          },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (item) => `${data.labels[item.dataIndex]}: ${format(Number((item.raw as { x: number }).x))} · ${format(Number((item.raw as { y: number }).y))}` } },
          },
        }}
      />
    );
  }

  // Bar / line / area / stacked / combo all share one mixed chart.
  const horizontal = kind === "bar-h";
  const lineKind = kind === "line" || kind === "area";
  const stacked = kind === "stacked";
  const hasRightAxis = data.series.some((series) => series.axis === "right");
  const datasets = data.series.map((series, index) => {
    const color = paletteHex[series.color];
    const asLine = lineKind || series.asLine || (kind === "combo" && index > 0);
    if (asLine) {
      return {
        type: "line" as const,
        label: series.label,
        data: series.values,
        borderColor: color,
        backgroundColor: kind === "area" && !series.dashed ? gradient(color) : color,
        fill: kind === "area" && !series.dashed,
        borderWidth: series.dashed ? 2 : 2.5,
        borderDash: series.dashed ? [6, 5] : undefined,
        tension: smooth ? 0.38 : 0,
        pointRadius: data.labels.length > 18 ? 2 : 3.5,
        pointHoverRadius: 7,
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        spanGaps: true,
        yAxisID: series.axis === "right" ? "y1" : "y",
        order: 0,
      };
    }
    return {
      type: "bar" as const,
      label: series.label,
      data: series.values,
      backgroundColor: series.values.map((value) => ((value ?? 0) < 0 ? COLORS.coral : color)),
      borderRadius: 6,
      borderSkipped: false,
      barPercentage: 0.8,
      categoryPercentage: 0.85,
      stack: stacked ? "stack" : undefined,
      yAxisID: horizontal ? undefined : series.axis === "right" ? "y1" : "y",
      order: 1,
    };
  });

  if (targetLine !== undefined && !horizontal) {
    datasets.push({
      type: "line" as const,
      label: "Target",
      data: data.labels.map(() => targetLine),
      borderColor: COLORS.coral,
      backgroundColor: COLORS.coral,
      fill: false,
      borderWidth: 1.5,
      borderDash: [4, 4],
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointBackgroundColor: COLORS.coral,
      pointBorderColor: COLORS.coral,
      pointBorderWidth: 0,
      spanGaps: true,
      yAxisID: "y",
      order: -1,
    });
  }

  const valueAxis = {
    stacked,
    border: { display: false },
    grid: { color: COLORS.grid },
    ticks: { maxTicksLimit: 5, callback: (value: string | number) => format(Number(value)) },
  };
  const categoryAxis = {
    stacked,
    grid: { display: false },
    border: { display: false },
    ticks: {
      maxRotation: 0,
      autoSkipPadding: 8,
      callback(this: { getLabelForValue: (value: number) => string }, value: string | number) {
        const label = String(this.getLabelForValue(Number(value)));
        return data.isTime && !horizontal ? label.split(" ")[0] : shortLabel(label);
      },
    },
  };

  return (
    <Chart
      type="bar"
      data={{ labels: data.labels, datasets } as ChartJsData<"bar">}
      plugins={dataLabels ? [valueLabels(format, horizontal)] : []}
      options={{
        indexAxis: horizontal ? "y" : "x",
        onClick: onClick as ChartOptions<"bar">["onClick"],
        animation: animation(data.labels.length > 18 ? 15 : 45) as ChartOptions<"bar">["animation"],
        interaction: { mode: "index", intersect: false },
        layout: { padding: { right: dataLabels && horizontal ? 64 : 0, top: dataLabels && !horizontal ? 18 : 0 } },
        scales: horizontal
          ? { x: { ...valueAxis, display: !dataLabels }, y: categoryAxis }
          : {
              x: categoryAxis,
              y: valueAxis,
              ...(hasRightAxis ? { y1: { ...valueAxis, position: "right" as const, grid: { display: false } } } : {}),
            },
        plugins: { legend: legendOptions, tooltip: { callbacks: { label: tooltipLabel } } },
      }}
    />
  );
}

/** Prints formatted values at the end of each bar. */
function valueLabels(format: (value: number) => string, horizontal: boolean) {
  return {
    id: "specValueLabels",
    afterDatasetsDraw(chart: ChartJS) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = `700 10px ${ChartJS.defaults.font.family}`;
      ctx.fillStyle = COLORS.teal;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (meta.hidden || meta.type !== "bar") return;
        meta.data.forEach((element, index) => {
          const value = Number(dataset.data[index]);
          if (!Number.isFinite(value)) return;
          const { x, y } = element.getProps(["x", "y"], true) as { x: number; y: number };
          ctx.textAlign = horizontal ? "left" : "center";
          ctx.textBaseline = horizontal ? "middle" : "bottom";
          ctx.fillText(format(value), horizontal ? x + 6 : x, horizontal ? y : y - 4);
        });
      });
      ctx.restore();
    },
  };
}
