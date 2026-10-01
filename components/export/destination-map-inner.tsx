"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import type { DestinationGeoDatum } from "@/lib/export-destinations-geo";

// Warna aksen untuk 3 tujuan terbesar; sisanya abu-abu netral.
function accentForRank(rank: number) {
  if (rank === 0) return "#FFE66D";
  if (rank === 1) return "#4ECDC4";
  if (rank === 2) return "#174D55";
  return "#174D55";
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
      className="h-[280px] w-full rounded-lg sm:h-[360px] lg:h-[420px]"
      style={{ background: "rgba(26,83,92,0.25)" }}
    >
      {/* Basemap tanpa label bawaan (nama negara di tile OSM memakai aksara lokal
          masing-masing); label negara tujuan dirender sendiri dalam bahasa Indonesia. */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png"
        // On high-DPI screens request the next zoom level at half size: crisp
        // tiles whose pixel size matches how large they're drawn.
        detectRetina
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
            {/* Nama negara (bahasa Indonesia) selalu tampil; detail nilai muncul saat diklik. */}
            <Tooltip direction="top" offset={[0, -4]} opacity={0.9} permanent>
              <span className="text-[10px] font-semibold text-[#174D55]">{datum.name}</span>
            </Tooltip>
            <Popup>
              <div className="text-[11px] font-semibold text-[#174D55]">{datum.name}</div>
              <div className="text-[10px] text-[#174D55]/90">
                {format(value(datum))} · {datum.count.toLocaleString("id-ID")} transaksi
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
