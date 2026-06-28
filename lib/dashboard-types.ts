import type { ExportDashboardView } from "@/lib/export-dashboard-types";
import type {
  DashboardSection,
  SectionMonthlyPoint,
  UploadedWorkbookSummary,
  WorkbookRole,
} from "@/lib/monitoring-dashboard-types";

export type DashboardView = "overview" | WorkbookRole | ExportDashboardView;
export type FilterKey = "customerType" | "customerName" | "year" | "month" | "invoiceType" | "status";
export type ReportFilters = Partial<Record<FilterKey, string[]>>;
export type OverviewFilters = {
  periodLabels: string[];
};
export type ThemeMode = "dark" | "light";
export type PeriodMode = "mom" | "yoy" | "ytd";
export type TrendPoint = SectionMonthlyPoint & {
  valueLabel: string;
};

export type LoadedReport = {
  id?: number;
  generatedAt: string;
  file: UploadedWorkbookSummary;
  section: DashboardSection;
};

export type StoredMonth = {
  periodKey: string;
  label: string;
  rowCount: number;
  totalAmount: number;
  uploadedAt: string;
};
