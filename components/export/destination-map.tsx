"use client";

import dynamic from "next/dynamic";
import type { DestinationGeoDatum } from "@/lib/export-destinations-geo";

// Leaflet membutuhkan `window`, jadi komponen intinya dimuat client-only
// (ssr:false) untuk menghindari error saat render di server Next.js.
const DestinationMapInner = dynamic(() => import("@/components/export/destination-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[420px] place-items-center text-xs text-[var(--muted-fg)]">Memuat peta…</div>
  ),
});

export function DestinationMap({
  points,
  metric,
}: {
  points: DestinationGeoDatum[];
  metric: "usd" | "tonnage";
}) {
  if (points.length === 0) {
    return <div className="grid min-h-64 place-items-center p-4 text-xs text-[var(--muted-fg)]">Tidak ada tujuan yang bisa dipetakan</div>;
  }

  return (
    <div className="p-3">
      <DestinationMapInner points={points} metric={metric} />
    </div>
  );
}
