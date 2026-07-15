"use client";

import { useState } from "react";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import type { DestinationGeoDatum } from "@/lib/export-destinations-geo";

// Path benua tersederhana dalam proyeksi equirectangular.
// Sistem koordinat: viewBox "0 0 360 180", x = lng + 180, y = 90 - lat.
// Cukup sebagai konteks visual untuk menempatkan bubble tujuan ekspor.
const WORLD_LAND_PATH =
  "M40,44 L92,40 L152,38 L176,46 L172,58 L150,60 L120,56 L96,62 L70,60 L48,56 Z " +
  "M150,60 L168,58 L190,62 L210,60 L232,66 L246,80 L244,104 L232,128 L214,150 L200,150 L196,128 L188,104 L176,84 L160,72 Z " +
  "M244,58 L268,52 L296,54 L322,60 L336,72 L332,92 L318,104 L300,108 L286,100 L272,88 L256,74 L248,66 Z " +
  "M300,108 L318,110 L330,124 L332,146 L322,158 L308,150 L300,132 Z " +
  "M270,120 L286,118 L292,132 L286,146 L274,144 L268,132 Z " +
  "M300,44 L322,44 L318,54 L302,54 Z";

type BubbleAccent = { fill: string; stroke: string };

function accentForRank(rank: number): BubbleAccent {
  if (rank === 0) return { fill: "rgba(255,209,102,0.55)", stroke: "#ffd166" };
  if (rank === 1) return { fill: "rgba(124,211,252,0.5)", stroke: "#7dd3fc" };
  if (rank === 2) return { fill: "rgba(112,240,191,0.5)", stroke: "#70f0bf" };
  return { fill: "rgba(148,163,184,0.4)", stroke: "#94a3b8" };
}

export function DestinationMap({
  points,
  metric,
}: {
  points: DestinationGeoDatum[];
  metric: "usd" | "tonnage";
}) {
  const [activeName, setActiveName] = useState<string | null>(null);

  if (points.length === 0) {
    return <div className="grid min-h-64 place-items-center p-4 text-xs text-[var(--muted-fg)]">Tidak ada tujuan yang bisa dipetakan</div>;
  }

  const value = (datum: DestinationGeoDatum) => (metric === "usd" ? datum.usdValue : datum.tonnage);
  const format = metric === "usd" ? formatUsd : formatTonnage;
  const maxValue = Math.max(...points.map(value), 1);
  const projectX = (lng: number) => lng + 180;
  const projectY = (lat: number) => 90 - lat;
  // Radius bubble proporsional akar (agar area ~ nilai), dibatasi agar tidak menutupi peta.
  const radius = (datum: DestinationGeoDatum) => 2 + Math.sqrt(value(datum) / maxValue) * 12;

  return (
    <div className="p-3">
      <svg viewBox="0 0 360 180" className="h-auto w-full" preserveAspectRatio="xMidYMid meet" aria-label="Peta tujuan ekspor">
        <rect x="0" y="0" width="360" height="180" fill="rgba(15,23,42,0.35)" rx="4" />
        {[45, 90, 135].map((y) => (
          <line key={`h-${y}`} x1="0" x2="360" y1={y} y2={y} stroke="rgba(148,163,184,0.12)" strokeWidth="0.4" />
        ))}
        {[90, 180, 270].map((x) => (
          <line key={`v-${x}`} x1={x} x2={x} y1="0" y2="180" stroke="rgba(148,163,184,0.12)" strokeWidth="0.4" />
        ))}
        <path d={WORLD_LAND_PATH} fill="rgba(148,163,184,0.16)" stroke="rgba(148,163,184,0.35)" strokeWidth="0.4" />
        {points.map((datum, index) => {
          const accent = accentForRank(index);
          const isActive = activeName === datum.name;
          const cx = projectX(datum.lng);
          const cy = projectY(datum.lat);

          return (
            <g key={datum.name} onMouseEnter={() => setActiveName(datum.name)} onMouseLeave={() => setActiveName(null)}>
              <circle
                cx={cx}
                cy={cy}
                r={radius(datum)}
                fill={accent.fill}
                stroke={accent.stroke}
                strokeWidth={isActive ? 1 : 0.6}
                className="cursor-pointer transition-[stroke-width]"
              />
              <circle cx={cx} cy={cy} r="0.8" fill={accent.stroke} />
              {isActive ? (
                <g pointerEvents="none">
                  <text x={cx} y={cy - radius(datum) - 3} textAnchor="middle" className="fill-[var(--app-fg)]" style={{ fontSize: 6, fontWeight: 700 }}>
                    {datum.name}
                  </text>
                  <text x={cx} y={cy - radius(datum) + 3.5} textAnchor="middle" className="fill-[var(--muted-fg)]" style={{ fontSize: 5 }}>
                    {format(value(datum))}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--muted-fg)]">
        {points.slice(0, 4).map((datum, index) => (
          <span key={datum.name} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentForRank(index).stroke }} />
            {datum.name}: {format(value(datum))}
          </span>
        ))}
      </div>
    </div>
  );
}
