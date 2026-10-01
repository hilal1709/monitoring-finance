import type { PackedRows } from "@/lib/packed-rows";

export type WorkbookRole = "invoice" | "payment";

export type RankedItem = {
  label: string;
  value: number;
  count: number;
  share: number;
};

export type MonthlyPoint = {
  key: string;
  label: string;
  invoice: number;
  payment: number;
};

export type SectionMonthlyPoint = {
  key: string;
  label: string;
  value: number;
};

export type DashboardRecord = {
  amount: number;
  customerName: string;
  customerType: string;
  invoiceType: string;
  status: string;
  periodKey: string | null;
  periodLabel: string | null;
  periodSort: number | null;
  /** Number of source rows merged into this record (rows are aggregated server-side). Defaults to 1. */
  count?: number;
};

export type DashboardSection = {
  rowCount: number;
  totalAmount: number;
  averageAmount: number;
  latestPeriod: string;
  statusMix: RankedItem[];
  customerTypes: RankedItem[];
  invoiceTypes: RankedItem[];
  topCustomers: RankedItem[];
  monthly: SectionMonthlyPoint[];
  records: DashboardRecord[];
};

export type UploadedWorkbookSummary = {
  role: WorkbookRole;
  name: string;
  sheetName: string;
  rowCount: number;
  totalAmount: number;
};

export type MonitoringDashboardData = {
  generatedAt: string;
  files: UploadedWorkbookSummary[];
  overview: {
    totalOutstanding: number;
    totalPaid: number;
    cashCoverage: number;
    netExposure: number;
    invoiceCount: number;
    paymentCount: number;
    overdueOutstanding: number;
    highRiskPayment: number;
    highRiskPaymentCount: number;
    externalOutstandingShare: number;
  };
  invoice?: DashboardSection;
  payment?: DashboardSection;
  combinedMonthly: MonthlyPoint[];
};

export type PersistedDashboardReport = {
  id: number;
  role: WorkbookRole;
  generatedAt: string;
  file: UploadedWorkbookSummary;
  section: DashboardSection;
};

export type PersistedDashboardReports = Partial<Record<WorkbookRole, PersistedDashboardReport>>;

/** Wire format: only the (aggregated, column-packed) records travel; sections are rebuilt on the client. */
export type PackedDashboardReport = {
  role: WorkbookRole;
  generatedAt: string;
  file: UploadedWorkbookSummary;
  /** `periodLabel`/`periodSort` are derived from `periodKey` on the client. */
  records: PackedRows<DashboardWireRecord>;
};

export type DashboardWireRecord = Omit<DashboardRecord, "periodLabel" | "periodSort">;

export type PackedDashboardReports = Partial<Record<WorkbookRole, PackedDashboardReport>>;

export type DashboardMonthMeta = {
  periodKey: string;
  label: string;
  rowCount: number;
  totalAmount: number;
  uploadedAt: string;
};

export type DashboardPayload = {
  reports: PackedDashboardReports;
  months: Partial<Record<WorkbookRole, DashboardMonthMeta[]>>;
};
