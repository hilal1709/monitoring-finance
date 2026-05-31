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
