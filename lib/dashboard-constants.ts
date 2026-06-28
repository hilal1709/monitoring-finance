import {
  BarChart3,
  Building2,
  Calculator,
  CalendarDays,
  LayoutDashboard,
  MapPin,
  ReceiptText,
  Ship,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { ExportDashboardView } from "@/lib/export-dashboard-types";
import type { WorkbookRole } from "@/lib/monitoring-dashboard-types";
import type { DashboardView, PeriodMode } from "@/lib/dashboard-types";

export const navigationGroups = [
  {
    id: "export",
    label: "Ekspor",
    icon: Ship,
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/ekspor", view: "export-overview" },
      { label: "RKAP", icon: Target, href: "/ekspor/rkap", view: "export-rkap" },
      { label: "Tren Ekspor", icon: BarChart3, href: "/ekspor/tren-ekspor", view: "export-trend" },
      { label: "Ekspor SIG Grup Bulan Ini", icon: CalendarDays, href: "/ekspor/sig-grup-bulan-ini", view: "export-sig-group" },
      { label: "Tujuan Ekspor", icon: MapPin, href: "/ekspor/tujuan-ekspor", view: "export-destinations" },
      { label: "Prognosa", icon: Calculator, href: "/ekspor/prognosa", view: "export-forecast" },
      { label: "Demurrage", icon: ReceiptText, href: "/ekspor/demurrage", view: "export-demurrage" },
    ],
  },
  {
    id: "non-export",
    label: "Non Ekspor",
    icon: Building2,
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/", view: "overview" },
      { label: "Payment", icon: Wallet, href: "/payment", view: "payment" },
      { label: "Invoice", icon: ReceiptText, href: "/invoice", view: "invoice" },
    ],
  },
] satisfies {
  id: "export" | "non-export";
  label: string;
  icon: LucideIcon;
  items: { label: string; icon: LucideIcon; href: string; view: DashboardView }[];
}[];

export const exportViewConfig: Record<ExportDashboardView, { title: string; icon: LucideIcon }> = {
  "export-overview": { title: "Overview Ekspor", icon: LayoutDashboard },
  "export-rkap": { title: "RKAP Ekspor", icon: Target },
  "export-trend": { title: "Tren Ekspor", icon: BarChart3 },
  "export-sig-group": { title: "Ekspor SIG Grup Bulan Ini", icon: CalendarDays },
  "export-destinations": { title: "Tujuan Ekspor", icon: MapPin },
  "export-forecast": { title: "Prognosa Ekspor", icon: Calculator },
  "export-demurrage": { title: "Demurrage", icon: ReceiptText },
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

export const palette = ["#4cc9d8", "#ef4444", "#f97316", "#facc15", "#2563eb", "#94a3b8", "#22c55e", "#a855f7"];
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
