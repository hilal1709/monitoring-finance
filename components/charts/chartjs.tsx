"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type Plugin,
  type ScriptableContext,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { COLORS } from "@/components/charts/colors";
import type { DoughnutChartProps, GroupedHorizontalBarChartProps, HorizontalBarChartProps, LineChartProps } from "@/components/charts/types";
import { prefersReducedMotion } from "@/lib/motion";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

ChartJS.defaults.font.family = "var(--font-geist-sans), Arial, sans-serif";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.font.weight = 600;
ChartJS.defaults.color = COLORS.teal;
ChartJS.defaults.borderColor = COLORS.grid;
ChartJS.defaults.maintainAspectRatio = false;
ChartJS.defaults.plugins.legend.display = false;
Object.assign(ChartJS.defaults.plugins.tooltip, {
  backgroundColor: "#ffffff",
  titleColor: COLORS.teal,
  bodyColor: COLORS.teal,
  borderColor: "rgba(26, 83, 92, 0.18)",
  borderWidth: 1,
  cornerRadius: 10,
  padding: 10,
  boxPadding: 4,
  usePointStyle: true,
  titleFont: { weight: 700 },
  bodyFont: { weight: 600 },
  caretSize: 6,
});

/** Staggered grow-in: each data point starts a little after the previous one. */
function staggeredAnimation(step = 60): unknown {
  if (typeof window !== "undefined" && prefersReducedMotion()) return false;
  return {
    duration: 900,
    easing: "easeOutQuart",
    delay: (context: ScriptableContext<"bar">) => (context.type === "data" && context.mode === "default" ? context.dataIndex * step + context.datasetIndex * 120 : 0),
  };
}

/** Prints the formatted value just past the end of each horizontal bar. */
function valueLabelPlugin(format: (value: number) => string): Plugin<"bar"> {
  return {
    id: "valueLabels",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = `700 10px ${ChartJS.defaults.font.family}`;
      ctx.fillStyle = COLORS.teal;
      ctx.textBaseline = "middle";
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (meta.hidden) return;
        meta.data.forEach((element, index) => {
          const value = Number(dataset.data[index]);
          if (!Number.isFinite(value)) return;
          const { x, y, base } = element.getProps(["x", "y", "base"], true) as { x: number; y: number; base: number };
          const negative = x < base;
          ctx.textAlign = negative ? "right" : "left";
          ctx.fillText(format(value), negative ? x - 6 : x + 6, y);
        });
      });
      ctx.restore();
    },
  };
}

/** Draws a two-line label in the doughnut hole. */
const centerTextPlugin: Plugin<"doughnut"> = {
  id: "centerText",
  afterDraw(chart, _args, options) {
    const text = (options as { text?: string }).text;
    if (!text) return;
    const { ctx, chartArea } = chart;
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;
    const lines = text.split("\n");
    ctx.save();
    ctx.fillStyle = COLORS.teal;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, index) => {
      ctx.font = `${index === 0 ? 800 : 600} ${index === 0 ? 12 : 10}px ${ChartJS.defaults.font.family}`;
      ctx.fillText(line, x, y + (index - (lines.length - 1) / 2) * 14);
    });
    ctx.restore();
  },
};

const hiddenGridScale = { grid: { display: false }, border: { display: false } };

// The chart.js implementations. Loaded lazily through components/charts/index.tsx,
// which owns each chart's sized box, so these render straight into their parent.

/** Ranked horizontal bars with value labels; negative values flip to `negativeColor`. */
export function HorizontalBarChart({
  items,
  color,
  negativeColor = COLORS.coral,
  format,
  labelWidth = 112,
}: HorizontalBarChartProps) {
  const values = items.map((item) => item.value);
  const max = Math.max(...values.map(Math.abs), 1);
  const hasNegative = values.some((value) => value < 0);

  return (
      <Bar
        data={{
          labels: items.map((item) => item.label),
          datasets: [
            {
              data: values,
              backgroundColor: values.map((value) => (value < 0 ? negativeColor : color)),
              hoverBackgroundColor: values.map((value) => (value < 0 ? negativeColor : color)),
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 0.78,
              categoryPercentage: 0.9,
            },
          ],
        }}
        plugins={[valueLabelPlugin(format)]}
        options={{
          indexAxis: "y",
          animation: staggeredAnimation() as ChartOptions<"bar">["animation"],
          layout: { padding: { right: 72, left: hasNegative ? 64 : 0 } },
          scales: {
            x: { ...hiddenGridScale, display: false, min: hasNegative ? -max : 0, max },
            y: {
              ...hiddenGridScale,
              afterFit: (scale) => {
                scale.width = labelWidth;
              },
              ticks: {
                callback(value) {
                  const label = String(this.getLabelForValue(Number(value)));
                  return label.length > 16 ? `${label.slice(0, 15)}…` : label;
                },
              },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                title: (tooltipItems) => items[tooltipItems[0].dataIndex]?.label ?? "",
                label: (tooltipItem) => items[tooltipItem.dataIndex]?.tooltip ?? format(Number(tooltipItem.raw)),
              },
            },
          },
        }}
      />
  );
}

/** Grouped horizontal bars, e.g. Invoice vs Payment per month. */
export function GroupedHorizontalBarChart({ labels, series, format }: GroupedHorizontalBarChartProps) {
  const max = Math.max(...series.flatMap((item) => item.data.map(Math.abs)), 1);
  const hasNegative = series.some((item) => item.data.some((value) => value < 0));

  return (
      <Bar
        data={{
          labels,
          datasets: series.map((item) => ({
            label: item.label,
            data: item.data,
            backgroundColor: item.data.map((value) => (value < 0 ? item.negativeColor ?? COLORS.coral : item.color)),
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.86,
            categoryPercentage: 0.82,
          })),
        }}
        plugins={[valueLabelPlugin(format)]}
        options={{
          indexAxis: "y",
          animation: staggeredAnimation(70) as ChartOptions<"bar">["animation"],
          layout: { padding: { right: 70, left: hasNegative ? 60 : 0 } },
          scales: {
            x: { ...hiddenGridScale, display: false, min: hasNegative ? -max : 0, max },
            y: { ...hiddenGridScale, afterFit: (scale) => void (scale.width = 64) },
          },
          plugins: {
            tooltip: { callbacks: { label: (tooltipItem) => `${tooltipItem.dataset.label}: ${format(Number(tooltipItem.raw))}` } },
          },
        }}
      />
  );
}

/** Multi-series line chart with soft gradient fill under the emphasised series. */
export function LineChart({ labels, series, format }: LineChartProps) {
  return (
      <Line
        data={{
          labels,
          datasets: series.map((item, index) => ({
            label: item.label,
            data: item.data,
            borderColor: item.color,
            backgroundColor: (context: ScriptableContext<"line">) => {
              const { ctx, chartArea } = context.chart;
              if (!chartArea) return "transparent";
              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, `${item.color}55`);
              gradient.addColorStop(1, `${item.color}00`);
              return gradient;
            },
            fill: item.fill ?? false,
            borderWidth: item.emphasis ? 3 : 2.25,
            borderDash: item.dashed ? [6, 5] : undefined,
            tension: 0.38,
            pointRadius: labels.length > 18 ? 2 : 3.5,
            pointHoverRadius: 7,
            pointBackgroundColor: item.color,
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3,
            spanGaps: true,
            order: index,
          })),
        }}
        options={{
          animation: staggeredAnimation(labels.length > 18 ? 18 : 45) as ChartOptions<"line">["animation"],
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 8, callback(value) { return String(this.getLabelForValue(Number(value))).split(" ")[0]; } } },
            y: { border: { display: false }, grid: { color: COLORS.grid }, ticks: { maxTicksLimit: 5, callback: (value) => format(Number(value)) } },
          },
          plugins: {
            tooltip: { callbacks: { label: (tooltipItem) => `${tooltipItem.dataset.label}: ${tooltipItem.raw == null ? "-" : format(Number(tooltipItem.raw))}` } },
          },
        }}
      />
  );
}

/** Doughnut with an optional two-line center label ("Title\nsubtitle"). */
export function DoughnutChart({ labels, values, colors, centerText, tooltips }: DoughnutChartProps) {
  return (
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderColor: "#ffffff",
              borderWidth: 2,
              hoverOffset: 8,
              borderRadius: 4,
            },
          ],
        }}
        plugins={[centerTextPlugin]}
        options={{
          cutout: "62%",
          layout: { padding: 6 },
          animation:
            typeof window !== "undefined" && prefersReducedMotion()
              ? false
              : { animateRotate: true, animateScale: true, duration: 1100, easing: "easeOutQuart" },
          plugins: {
            // @ts-expect-error custom plugin options
            centerText: { text: centerText },
            tooltip: { callbacks: { label: (tooltipItem) => tooltips?.[tooltipItem.dataIndex] ?? `${tooltipItem.label}: ${tooltipItem.formattedValue}` } },
          },
        }}
      />
  );
}
