import {
  CalculateIcon,
  Calendar03Icon,
  ChartHistogramIcon,
  ChartLineData01Icon,
  DollarCircleIcon,
  Invoice03Icon,
  Location01Icon,
  PieChartIcon,
  ShipIcon,
  Target02Icon,
  Wallet01Icon,
  Xls01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@/components/ui/icon";

// Icons a classic KPI card can carry. Specs store the key, so layouts stay JSON.
export const cardIcons: Record<string, { icon: IconSvgElement; label: string }> = {
  dollar: { icon: DollarCircleIcon, label: "Uang" },
  wallet: { icon: Wallet01Icon, label: "Dompet" },
  invoice: { icon: Invoice03Icon, label: "Invoice" },
  ship: { icon: ShipIcon, label: "Kapal" },
  target: { icon: Target02Icon, label: "Target" },
  trend: { icon: ChartLineData01Icon, label: "Tren" },
  chart: { icon: ChartHistogramIcon, label: "Grafik" },
  calculate: { icon: CalculateIcon, label: "Hitung" },
  pie: { icon: PieChartIcon, label: "Porsi" },
  calendar: { icon: Calendar03Icon, label: "Kalender" },
  location: { icon: Location01Icon, label: "Lokasi" },
  sheet: { icon: Xls01Icon, label: "Dokumen" },
};

export function cardIcon(key: string | undefined) {
  return (key && cardIcons[key]?.icon) || ChartHistogramIcon;
}
