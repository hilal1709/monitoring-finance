"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import type { DestinationGeoDatum } from "@/lib/export-destinations-geo";

// Warna aksen untuk 3 tujuan terbesar; sisanya abu-abu netral.
function accentForRank(rank: number) {
  if (rank === 0) return "#ffd166";
  if (rank === 1) return "#7dd3fc";
  if (rank === 2) return "#70f0bf";
  return "#94a3b8";
}

export default function DestinationMapInner({
  points,
  metric,
}: {
  points: DestinationGeoDatum[];
  metric: "usd" | "tonnage";
}) {
  const value = (datum: DestinationGeoDatum) => (metric === "usd" ? datum.usdValue : datum.tonnage);
  const format = metric === "usd" ? formatUsd : formatTonnage;
  const maxValue = Math.max(...points.map(value), 1);
  // Radius bubble proporsional akar (area ~ nilai), dalam piksel, dibatasi agar tidak menutupi peta.
  const radius = (datum: DestinationGeoDatum) => 6 + Math.sqrt(value(datum) / maxValue) * 26;

  return (
    <MapContainer
      center={[10, 90]}
      zoom={2}
      minZoom={1}
      scrollWheelZoom
      worldCopyJump
      className="h-[420px] w-full rounded-lg"
      style={{ background: "rgba(15,23,42,0.35)" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((datum, index) => {
        const accent = accentForRank(index);

        return (
          <CircleMarker
            key={datum.name}
            center={[datum.lat, datum.lng]}
            radius={radius(datum)}
            pathOptions={{ color: accent, fillColor: accent, fillOpacity: 0.45, weight: 1.5 }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              <div className="text-[11px] font-semibold text-slate-900">{datum.name}</div>
              <div className="text-[10px] text-slate-600">
                {format(value(datum))} · {datum.count.toLocaleString("id-ID")} transaksi
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
