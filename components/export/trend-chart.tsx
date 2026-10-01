"use client";

import { LineChart } from "@/components/charts";
import { EmptyChart } from "@/components/charts/empty-chart";

export function TrendChart<T extends Record<string, unknown>>({
  points,
  series,
  valueFormatter,
}: {
  points: (T & { key: string; label: string })[];
  series: { key: keyof T; label: string; color: string }[];
  valueFormatter: (value: number) => string;
}) {
  if (points.length === 0) return <EmptyChart text="Tidak ada data tren" />;

  return (
    <div className="p-3">
      <div className="mb-2 flex flex-wrap justify-end gap-4 text-xs font-semibold text-teal">
        {series.map((item) => (
          <span key={String(item.key)} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <LineChart
        labels={points.map((point) => point.label)}
        series={series.map((item, index) => ({
          label: item.label,
          color: item.color,
          data: points.map((point) => {
            const value = Number(point[item.key]);
            return Number.isFinite(value) ? value : null;
          }),
          // The first series is the headline one: emphasised with a soft area fill.
          emphasis: index === 0,
          fill: index === 0,
        }))}
        format={valueFormatter}
      />
    </div>
  );
}
