export function formatCurrency(value: number, compact = false) {
  if (compact) {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (abs >= 1_000_000_000_000) {
      return `${sign}Rp ${(abs / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
    }

    if (abs >= 1_000_000_000) {
      return `${sign}Rp ${(abs / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
    }

    if (abs >= 1_000_000) {
      return `${sign}Rp ${(abs / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
    }
  }

  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

export function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

export function formatPercent(value: number) {
  return `${(value * 100).toLocaleString("id-ID", { maximumFractionDigits: 0 })}%`;
}

export function formatDeltaPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return `${value > 0 ? "+" : ""}${formatPercent(value)}`;
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function compactFileName(name: string) {
  return name.length > 34 ? `${name.slice(0, 17)}...${name.slice(-11)}` : name;
}
