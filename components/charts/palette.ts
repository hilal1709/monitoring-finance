import type { PaletteColor } from "@/lib/chart-builder/types";

// Same order and hues as the dashboards' own palette (lib/dashboard-constants.ts).
export const paletteHex: Record<PaletteColor, string> = {
  turquoise: "#4ECDC4",
  coral: "#FF6B6B",
  sun: "#FFE66D",
  teal: "#174D55",
  mint: "#A6E6E1",
  "turquoise-soft": "#7FDDD6",
  "coral-soft": "#FF9C9C",
  "sun-soft": "#FFF0A7",
  slate: "#4E8088",
};
