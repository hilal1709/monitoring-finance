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

const EXPORT_MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function formatExportPeriodLabel(periodKey: string) {
  const [yearText, monthText] = periodKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  return Number.isFinite(year) && month >= 1 && month <= 12
    ? `${EXPORT_MONTH_NAMES[month]} ${year}`
    : periodKey;
}

export function formatExportUploadSuccess(
  filename: string,
  upsertedMonths: { periodKey: string; rowCount: number }[] | undefined,
) {
  if (!upsertedMonths?.length) {
    return `Upload "${filename}" berhasil.`;
  }

  const totalRows = upsertedMonths.reduce((sum, month) => sum + month.rowCount, 0);
  const monthLabels = upsertedMonths
    .map((month) => formatExportPeriodLabel(month.periodKey))
    .join(", ");

  return `Upload "${filename}" berhasil — ${totalRows.toLocaleString("id-ID")} baris untuk ${monthLabels}.`;
}
