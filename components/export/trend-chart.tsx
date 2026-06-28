import type { MonthlyExportPoint } from "@/lib/export-dashboard-data";

export function TrendChart({
  points,
  series,
  valueFormatter,
}: {
  points: MonthlyExportPoint[];
  series: { key: keyof MonthlyExportPoint; label: string; color: string }[];
  valueFormatter: (value: number) => string;
}) {
  const values = points.flatMap((point) => series.map((item) => Number(point[item.key])));
  const max = Math.max(...values, 1);
  const pointX = (index: number) => (points.length === 1 ? 50 : 5 + (index / (points.length - 1)) * 90);
  const pointY = (value: number) => 36 - (value / max) * 28;

  if (points.length === 0) {
    return <div className="grid h-44 place-items-center text-xs text-[var(--muted-fg)]">Tidak ada data tren</div>;
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex flex-wrap justify-end gap-3 text-[10px] text-[var(--muted-fg)]">
        {series.map((item) => (
          <span key={String(item.key)} className="inline-flex items-center gap-1">
            <span className="h-2 w-2" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg className="h-40 w-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none" aria-label="Export trend chart">
        {[8, 15, 22, 29, 36].map((y) => (
          <line key={y} x1="3" x2="98" y1={y} y2={y} stroke="rgba(148,163,184,0.28)" strokeWidth="0.25" />
        ))}
        {series.map((item) => {
          const chartPoints = points
            .map((point, index) => `${pointX(index)},${pointY(Number(point[item.key]))}`)
            .join(" ");

          return (
            <g key={String(item.key)}>
              <polyline points={chartPoints} fill="none" stroke={item.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.8" />
              {points.map((point, index) => (
                <circle key={`${String(item.key)}-${point.key}`} cx={pointX(index)} cy={pointY(Number(point[item.key]))} r="1" fill={item.color}>
                  <title>{`${item.label} ${point.label}: ${valueFormatter(Number(point[item.key]))}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="relative h-4 text-[9px] text-[var(--muted-fg)]">
        {points.map((point, index) => (
          <span key={point.key} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${pointX(index)}%` }}>
            {point.label.split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}
