export function formatCompact(value: number, unit = "") {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absolute >= 1_000_000_000) return `${sign}${(absolute / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} B${unit}`;
  if (absolute >= 1_000_000) return `${sign}${(absolute / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M${unit}`;
  if (absolute >= 1_000) return `${sign}${(absolute / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} K${unit}`;
  return `${sign}${absolute.toLocaleString("id-ID", { maximumFractionDigits: 1 })}${unit}`;
}

export function formatUsd(value: number, compact = true) {
  return compact ? `USD ${formatCompact(value)}` : `USD ${value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

export function formatTonnage(value: number, compact = true) {
  return compact ? `${formatCompact(value)} MT` : `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })} MT`;
}

export function formatIdr(value: number) {
  return `Rp ${formatCompact(value)}`;
}
