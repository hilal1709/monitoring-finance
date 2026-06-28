import { PeriodModeSelector } from "@/components/dashboard/period-mode-selector";
import type { PeriodMode, TrendPoint } from "@/lib/dashboard-types";

export function LineTrend({
  title,
  points,
  periodMode,
  onPeriodModeChange,
}: {
  title: string;
  points: TrendPoint[];
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
}) {
  const values = points.map((point) => point.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const pointX = (index: number) => (points.length === 1 ? 50 : 5 + (index / (points.length - 1)) * 90);
  const polyline = points
    .map((point, index) => {
      const x = pointX(index);
      const y = 36 - ((point.value - min) / range) * 28;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="h-full rounded-lg border border-white/10 bg-[#0c1724] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-slate-100">{title}</h4>
        <PeriodModeSelector value={periodMode} onChange={onPeriodModeChange} />
      </div>
      {points.length > 0 ? (
        <>
          <svg className="h-40 w-full overflow-visible" viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
            {[8, 15, 22, 29, 36].map((y) => (
              <line key={y} x1="3" x2="98" y1={y} y2={y} stroke="rgba(148,163,184,0.28)" strokeWidth="0.25" />
            ))}
            <line x1="3" x2="98" y1="28" y2="28" stroke="#ef4444" strokeDasharray="1 1" strokeWidth="0.35" />
            <polyline points={polyline} fill="none" stroke="#7dd3fc" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.9" />
            {points.map((point, index) => {
              const x = pointX(index);
              const y = 36 - ((point.value - min) / range) * 28;

              return (
                <circle key={point.key} cx={x} cy={y} r="1.25" fill="#70f0bf" className="cursor-help">
                  <title>{`${point.label}: ${point.valueLabel}`}</title>
                </circle>
              );
            })}
          </svg>
          <div className="relative h-4 text-[10px] text-slate-400">
            {points.map((point, index) => (
              <span
                key={point.key}
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-center"
                style={{ left: `${pointX(index)}%` }}
                title={`${point.label}: ${point.valueLabel}`}
              >
                {point.label.split(" ")[0]}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="grid h-40 place-items-center text-center text-xs font-semibold text-slate-400">Tidak ada data pembanding</div>
      )}
    </div>
  );
}
