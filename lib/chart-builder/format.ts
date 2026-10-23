import { formatCurrency, formatDeltaPercent, formatNumber, formatPercent } from "@/lib/dashboard-format";
import { formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import type { ValueFormat } from "@/lib/chart-builder/types";

export function formatValue(value: number | null | undefined, format: ValueFormat = "number") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  switch (format) {
    case "idr":
      return formatCurrency(value, true);
    case "usd":
      return formatUsd(value);
    case "tonnage":
      return formatTonnage(value);
    case "percent":
      return formatPercent(value);
    case "percent-round":
      return `${Math.round(value * 100)}%`;
    case "delta-percent":
      return formatDeltaPercent(value);
    case "days":
      return `${formatNumber(Math.round(value))} hari`;
    case "miliar":
      return `${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
    default:
      return value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  }
}

export function formatChange(percent: number | null | undefined) {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) return "—";
  const sign = percent > 0 ? "+" : "";
  return `${sign}${(percent * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

export const formatOptions: { value: ValueFormat; label: string }[] = [
  { value: "idr", label: "Rupiah (Rp)" },
  { value: "usd", label: "Dolar (USD)" },
  { value: "tonnage", label: "Tonase (MT)" },
  { value: "number", label: "Angka biasa" },
  { value: "percent", label: "Persen (%)" },
  { value: "percent-round", label: "Persen dibulatkan (%)" },
  { value: "delta-percent", label: "Perubahan (+/− %)" },
  { value: "miliar", label: "Miliar (M)" },
  { value: "days", label: "Hari" },
];
