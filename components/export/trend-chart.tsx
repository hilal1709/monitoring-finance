export function TrendChart<T extends Record<string, unknown>>({
  points,
  series,
  valueFormatter,
}: {
  points: (T & { key: string; label: string })[];
  series: { key: keyof T; label: string; color: string }[];
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
      <div className="mb-2 flex flex-wrap justify-end gap-4 text-xs font-semibold text-[var(--app-fg)]">
        {series.map((item) => (
          <span key={String(item.key)} className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm border border-white/70" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg className="h-40 w-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none" aria-label="Export trend chart">
        {[8, 15, 22, 29, 36].map((y) => (
          <line key={y} x1="3" x2="98" y1={y} y2={y} stroke="rgba(226,232,240,0.55)" strokeWidth="0.35" />
        ))}
        {/* Render in reverse so first series (Penjualan) is drawn last = on top */}
        {[...series].reverse().map((item, reversedIndex) => {
          const isTopSeries = reversedIndex === series.length - 1;
          const chartPoints = points
            .map((point, index) => `${pointX(index)},${pointY(Number(point[item.key]))}`)
            .join(" ");

          return (
            <g key={String(item.key)}>
              <polyline
                points={chartPoints}
                fill="none"
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={isTopSeries ? "1.7" : "1.35"}
                strokeDasharray={isTopSeries ? "3 1.5" : undefined}
              />
              {points.map((point, index) => (
                <circle key={`${String(item.key)}-${point.key}`} cx={pointX(index)} cy={pointY(Number(point[item.key]))} r={isTopSeries ? "1.65" : "1.35"} fill={item.color} stroke="#0c1724" strokeWidth="0.45">
                  <title>{`${item.label} ${point.label}: ${valueFormatter(Number(point[item.key]))}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="relative h-5 text-[11px] font-semibold text-[var(--app-fg)]">
        {points.map((point, index) => (
          <span key={point.key} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${pointX(index)}%` }}>
            {point.label.split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}
