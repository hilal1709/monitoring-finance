"use client";

import dynamic from "next/dynamic";
import { preconnect } from "react-dom";
import type { DestinationGeoDatum } from "@/lib/export-destinations-geo";

// Leaflet membutuhkan `window`, jadi komponen intinya dimuat client-only
// (ssr:false) untuk menghindari error saat render di server Next.js.
const loadMap = () => import("@/components/export/destination-map-inner");

// The map's first tile is this page's largest paint. Start fetching Leaflet as
// soon as this module evaluates rather than after the view has hydrated.
if (typeof window !== "undefined") void loadMap();

const DestinationMapInner = dynamic(loadMap, {
  ssr: false,
  loading: () => (
    <div className="grid h-[280px] place-items-center sm:h-[360px] lg:h-[420px] text-xs text-[var(--muted-fg)]">Memuat peta…</div>
  ),
});

export function DestinationMap({
  points,
  metric,
}: {
  points: DestinationGeoDatum[];
  metric: "usd" | "tonnage";
}) {
  // Start the TLS handshakes with the tile CDN while Leaflet itself is still loading.
  for (const shard of ["a", "b", "c", "d"]) preconnect(`https://${shard}.basemaps.cartocdn.com`);

  if (points.length === 0) {
    return <div className="grid min-h-64 place-items-center p-4 text-xs text-[var(--muted-fg)]">Tidak ada tujuan yang bisa dipetakan</div>;
  }

  return (
    <div className="p-3">
      <DestinationMapInner points={points} metric={metric} />
    </div>
  );
}
