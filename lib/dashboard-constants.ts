import { ChartHistogramIcon, Building03Icon, CalculateIcon, DashboardSquare01Icon, Location01Icon, Invoice03Icon, ShipIcon, Target02Icon, Wallet01Icon, DashboardSpeed01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

import type { ExportDashboardView } from "@/lib/export-dashboard-types";
import type { WorkbookRole } from "@/lib/monitoring-dashboard-types";
import type { DashboardView, PeriodMode } from "@/lib/dashboard-types";

export const navigationGroups = [
  {
    id: "export",
    label: "Ekspor",
    icon: ShipIcon,
    items: [
      { label: "Overview", icon: DashboardSquare01Icon, href: "/ekspor", view: "export-overview" },
      { label: "RKAP", icon: Target02Icon, href: "/ekspor/rkap", view: "export-rkap" },
      { label: "Tren Ekspor", icon: ChartHistogramIcon, href: "/ekspor/tren-ekspor", view: "export-trend" },
      { label: "Tujuan Ekspor", icon: Location01Icon, href: "/ekspor/tujuan-ekspor", view: "export-destinations" },
      { label: "Prognosa", icon: CalculateIcon, href: "/ekspor/prognosa", view: "export-forecast" },
      { label: "Demurrage", icon: Invoice03Icon, href: "/ekspor/demurrage", view: "export-demurrage" },
    ],
  },
  {
    id: "non-export",
    label: "Non Semen",
    icon: Building03Icon,
    items: [
      { label: "Overview", icon: DashboardSquare01Icon, href: "/", view: "overview" },
      { label: "Payment", icon: Wallet01Icon, href: "/payment", view: "payment" },
      { label: "Invoice", icon: Invoice03Icon, href: "/invoice", view: "invoice" },
    ],
  },
  {
    id: "kpi",
    label: "KPI",
    icon: DashboardSpeed01Icon,
    items: [
      { label: "Otobos", icon: Target02Icon, href: "/kpi", view: "kpi-otobos" },
      { label: "Timely Task", icon: DashboardSpeed01Icon, href: "/kpi/timely", view: "kpi-timely" },
    ],
  },
] satisfies {
  id: "export" | "non-export" | "kpi";
  label: string;
  icon: IconSvgElement;
  items: { label: string; icon: IconSvgElement; href: string; view: DashboardView }[];
}[];

export const exportViewConfig: Record<ExportDashboardView, { title: string; icon: IconSvgElement }> = {
  "export-overview": { title: "Overview Ekspor", icon: DashboardSquare01Icon },
  "export-rkap": { title: "RKAP Ekspor", icon: Target02Icon },
  "export-trend": { title: "Tren Ekspor", icon: ChartHistogramIcon },
  "export-destinations": { title: "Tujuan Ekspor", icon: Location01Icon },
  "export-forecast": { title: "Prognosa Ekspor", icon: CalculateIcon },
  "export-demurrage": { title: "Demurrage", icon: Invoice03Icon },
};

export function isExportDashboardView(view: DashboardView): view is ExportDashboardView {
  return view.startsWith("export-");
}

export const uploadCards = [
  {
    role: "invoice" as const,
    title: "Invoice Workbook",
    description: "Sistem membaca sheet Billing Detail lalu menyusun Invoice Report Monitoring.",
  },
  {
    role: "payment" as const,
    title: "Payment Workbook",
    description: "Sistem membaca sheet Detail Payment lalu menyusun Payment Report Monitoring.",
  },
];

// Vivid, well-separated colors retain their distinction on the dark dashboard.
export const palette = ["#4ECDC4", "#FF6B6B", "#FFE66D", "#174D55", "#7FDDD6", "#FF9C9C", "#FFF0A7", "#4E8088"];
export const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const monthOrder = new Map(monthLabels.map((month, index) => [month, index + 1]));
export const periodModeOptions: { value: PeriodMode; label: string }[] = [
  { value: "mom", label: "MoM" },
  { value: "yoy", label: "YoY" },
  { value: "ytd", label: "YTD" },
];
export const statusOrders: Record<WorkbookRole, string[]> = {
  invoice: ["Current", "Bucket 1", "Bucket 2", "Bucket 3", "Bucket 4"],
  payment: ["No Risk", "Low Risk", "Warning", "Warning +", "High Risk", "High Risk +"],
};
export const paymentTargetPenerimaan = [
  { month: "Jan", target: 12_323_786_908 },
  { month: "Feb", target: 25_884_808_736 },
  { month: "Mar", target: 32_722_949_848 },
  { month: "Apr", target: 28_783_651_701 },
  { month: "Mei", target: 35_554_538_011 },
  { month: "Jun", target: 27_885_041_941 },
  { month: "Jul", target: 328_456_515_999 },
  { month: "Agu", target: 81_615_143_177 },
  { month: "Sep", target: 149_332_360_873 },
  { month: "Okt", target: 199_811_339_782 },
  { month: "Nov", target: 73_977_040_044 },
  { month: "Des", target: 94_688_251_257 },
];
