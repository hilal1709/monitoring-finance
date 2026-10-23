import type { ChartKind } from "@/lib/chart-builder/types";

// Tiny palette drawings of each chart type for the "Pilih jenis grafik" tiles —
// pictures read faster than icon glyphs for people new to charts.

const T = "var(--palette-turquoise)";
const C = "var(--palette-coral)";
const S = "var(--palette-yellow)";
const D = "var(--palette-teal)";

export function ChartThumb({ kind, className }: { kind: ChartKind; className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden>
      {thumb(kind)}
    </svg>
  );
}

function thumb(kind: ChartKind) {
  switch (kind) {
    case "card":
      return (
        <>
          <rect x="6" y="6" width="52" height="28" rx="5" fill={T} />
          <rect x="11" y="11" width="18" height="3" rx="1.5" fill={D} opacity="0.6" />
          <rect x="11" y="18" width="28" height="7" rx="2" fill={D} />
          <rect x="44" y="25" width="10" height="4" rx="2" fill={D} opacity="0.8" />
        </>
      );
    case "bar":
      return [10, 22, 34, 46].map((x, index) => <rect key={x} x={x} y={34 - [14, 24, 10, 20][index]} width="8" height={[14, 24, 10, 20][index]} rx="2" fill={[T, S, C, T][index]} />);
    case "bar-h":
      return [6, 15, 24, 33].map((y, index) => <rect key={y} x="8" y={y} width={[48, 36, 26, 16][index]} height="6" rx="2" fill={index === 0 ? C : T} />);
    case "stacked":
      return [10, 24, 38].map((x, index) => (
        <g key={x}>
          <rect x={x} y={34 - [12, 16, 9][index]} width="10" height={[12, 16, 9][index]} rx="1.5" fill={T} />
          <rect x={x} y={34 - [12, 16, 9][index] - [8, 10, 12][index]} width="10" height={[8, 10, 12][index]} rx="1.5" fill={S} />
        </g>
      ));
    case "line":
      return <polyline points="6,30 18,22 30,25 42,12 58,8" fill="none" stroke={T} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
    case "area":
      return (
        <>
          <path d="M6 30 L18 22 L30 25 L42 12 L58 8 L58 34 L6 34 Z" fill={T} opacity="0.35" />
          <polyline points="6,30 18,22 30,25 42,12 58,8" fill="none" stroke={D} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      );
    case "combo":
      return (
        <>
          {[10, 24, 38, 52].map((x, index) => (
            <rect key={x} x={x - 4} y={34 - [10, 18, 14, 22][index]} width="8" height={[10, 18, 14, 22][index]} rx="2" fill={T} />
          ))}
          <polyline points="10,22 24,12 38,16 52,6" fill="none" stroke={C} strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case "pie":
      return (
        <>
          <circle cx="32" cy="20" r="15" fill={T} />
          <path d="M32 20 L32 5 A15 15 0 0 1 46 25 Z" fill={C} />
          <path d="M32 20 L46 25 A15 15 0 0 1 24 33 Z" fill={S} />
        </>
      );
    case "doughnut":
      return (
        <>
          <circle cx="32" cy="20" r="13" fill="none" stroke={T} strokeWidth="7" />
          <circle cx="32" cy="20" r="13" fill="none" stroke={C} strokeWidth="7" strokeDasharray="25 82" transform="rotate(-90 32 20)" />
          <circle cx="32" cy="20" r="13" fill="none" stroke={S} strokeWidth="7" strokeDasharray="18 82" strokeDashoffset="-25" transform="rotate(-90 32 20)" />
        </>
      );
    case "radar":
      return (
        <>
          <polygon points="32,4 50,16 44,36 20,36 14,16" fill="none" stroke={D} strokeOpacity="0.25" />
          <polygon points="32,10 44,18 38,30 24,32 20,18" fill={T} opacity="0.55" stroke={D} strokeWidth="1.5" />
        </>
      );
    case "scatter":
      return [
        [12, 28],
        [20, 22],
        [26, 26],
        [34, 16],
        [42, 18],
        [50, 9],
        [18, 31],
      ].map(([x, y], index) => <circle key={index} cx={x} cy={y} r="3" fill={index % 3 === 0 ? C : T} />);
    case "gauge":
      return (
        <>
          <path d="M10 34 A22 22 0 0 1 54 34" fill="none" stroke="var(--surface-4)" strokeWidth="7" strokeLinecap="round" />
          <path d="M10 34 A22 22 0 0 1 46 18" fill="none" stroke={T} strokeWidth="7" strokeLinecap="round" />
        </>
      );
    case "table":
      return (
        <>
          <rect x="6" y="5" width="52" height="7" rx="2" fill={T} />
          {[15, 23, 31].map((y) => (
            <g key={y}>
              <rect x="6" y={y} width="30" height="4" rx="1" fill={D} opacity="0.35" />
              <rect x="42" y={y} width="16" height="4" rx="1" fill={D} opacity="0.6" />
            </g>
          ))}
        </>
      );
  }
}
