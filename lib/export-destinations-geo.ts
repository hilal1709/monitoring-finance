import type { ExportRecord } from "@/lib/export-dashboard-types";

// Titik koordinat (lng, lat) per negara/wilayah tujuan ekspor. Dipakai untuk
// menempatkan bubble pada peta dunia equirectangular (viewBox 0 0 360 180),
// di mana x = lng + 180 dan y = 90 - lat.
export type GeoPoint = {
  name: string;
  lng: number;
  lat: number;
};

// Resolver berbasis kata kunci: satu tujuan mentah (mis. "CHATTOGRAM, BANGLADESH"
// atau "KWINANA, AUSTRALIA") dipetakan ke negara kanoniknya sehingga bubble
// teragregasi per negara, bukan per kota.
const GEO_LOOKUP: { match: string[]; point: GeoPoint }[] = [
  { match: ["bangladesh", "chattogram", "chittagong"], point: { name: "Bangladesh", lng: 90.4, lat: 23.7 } },
  { match: ["kwinana", "australia"], point: { name: "Australia", lng: 134, lat: -25 } },
  { match: ["taiwan"], point: { name: "Taiwan", lng: 121, lat: 23.7 } },
  { match: ["timor"], point: { name: "Timor Leste", lng: 125.7, lat: -8.8 } },
  { match: ["maldives", "maladewa"], point: { name: "Maladewa", lng: 73.2, lat: 3.2 } },
  { match: ["sri lanka", "srilanka"], point: { name: "Sri Lanka", lng: 80.7, lat: 7.9 } },
  { match: ["south africa", "afrika selatan"], point: { name: "Afrika Selatan", lng: 24, lat: -29 } },
  { match: ["phillipina", "philippine", "filipina", "philipina"], point: { name: "Filipina", lng: 122, lat: 12.9 } },
  { match: ["mozambique", "mozambik"], point: { name: "Mozambik", lng: 35.5, lat: -18.7 } },
  { match: ["fiji"], point: { name: "Fiji", lng: 178, lat: -17.7 } },
  { match: ["togo"], point: { name: "Togo", lng: 0.8, lat: 8.6 } },
  { match: ["india"], point: { name: "India", lng: 78.9, lat: 20.6 } },
  { match: ["benin", "cotonou"], point: { name: "Benin", lng: 2.3, lat: 9.3 } },
  { match: ["mauritania"], point: { name: "Mauritania", lng: -10.9, lat: 21 } },
  { match: ["stockton", "usa", "united states", "amerika"], point: { name: "Amerika Serikat", lng: -121.3, lat: 38 } },
  { match: ["reunion"], point: { name: "Pulau Reunion", lng: 55.5, lat: -21.1 } },
];

export function resolveDestinationGeo(destination: string): GeoPoint | null {
  const normalized = destination.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  for (const entry of GEO_LOOKUP) {
    if (entry.match.some((keyword) => normalized.includes(keyword))) {
      return entry.point;
    }
  }

  return null;
}

export type DestinationGeoDatum = {
  name: string;
  lng: number;
  lat: number;
  usdValue: number;
  tonnage: number;
  count: number;
};

// Agregasi record ekspor menjadi titik per negara. Tujuan yang tidak dikenal
// koordinatnya dikumpulkan terpisah agar bisa ditampilkan sebagai catatan.
export function aggregateDestinations(records: ExportRecord[]): {
  points: DestinationGeoDatum[];
  unresolved: { name: string; usdValue: number }[];
} {
  const byCountry = new Map<string, DestinationGeoDatum>();
  const unresolvedMap = new Map<string, number>();

  for (const record of records) {
    const geo = resolveDestinationGeo(record.destination);

    if (!geo) {
      const label = record.destination.trim() || "Tidak diketahui";
      unresolvedMap.set(label, (unresolvedMap.get(label) ?? 0) + record.usdValue);
      continue;
    }

    const datum = byCountry.get(geo.name) ?? {
      name: geo.name,
      lng: geo.lng,
      lat: geo.lat,
      usdValue: 0,
      tonnage: 0,
      count: 0,
    };
    datum.usdValue += record.usdValue;
    datum.tonnage += record.tonnage;
    datum.count += 1;
    byCountry.set(geo.name, datum);
  }

  return {
    points: [...byCountry.values()].sort((left, right) => right.usdValue - left.usdValue),
    unresolved: [...unresolvedMap.entries()]
      .map(([name, usdValue]) => ({ name, usdValue }))
      .sort((left, right) => right.usdValue - left.usdValue),
  };
}
