export type ExportDashboardView =
  | "export-overview"
  | "export-rkap"
  | "export-trend"
  | "export-destinations"
  | "export-forecast"
  | "export-demurrage";

export type ExportRecord = {
  periodKey: string;
  periodLabel: string;
  periodSort: number;
  companyCode: string;
  soldToName: string;
  buyer: string;
  vesselName: string;
  product: string;
  destination: string;
  tonnage: number;
  usdValue: number;
  pebNumber: string;
  documentDate: string | null;
  salesOrder: string;
  invoiceNumber: string;
  paymentDate: string | null;
  paymentStatus: string;
  plannedPaymentDate: string | null;
  transferDate: string | null;
  arrearDays: number;
  agingBucket: string;
  billingRate: number;
  paymentRate: number;
  exchangeDifference: number;
  exchangeImpact: number;
};

export type ExportStoredMonth = {
  periodKey: string;
  label: string;
  rowCount: number;
  totalUsd: number;
  totalTonnage: number;
  uploadedAt: string;
};

export type ExportKpiMonth = {
  periodKey: string;
  label: string;
  salesTargetUsd: number;
  salesActualUsd: number;
  paymentTargetUsd: number;
  paymentActualUsd: number;
};

export type ExportKpiSummary = {
  sheetName: string;
  months: ExportKpiMonth[];
};

export type ExportUpsertedMonth = {
  periodKey: string;
  rowCount: number;
};

export type ExportDashboardPayload = {
  generatedAt: string | null;
  filename: string | null;
  sheetName: string;
  records: ExportRecord[];
  months: ExportStoredMonth[];
  kpi: ExportKpiSummary | null;
  upsertedMonths?: ExportUpsertedMonth[];
};
