import "server-only";

import { Pool } from "pg";
import type { ComponentType } from "react";
import { AlertTriangle, CheckCircle2, Database, Table2 } from "lucide-react";

export type HistoryMetricTone = "emerald" | "blue" | "rose";
export type HistoryStatusTone = "success" | "error" | "processing";

export type HistoryDashboardMetric = {
  title: string;
  value: string;
  delta: string;
  tone: HistoryMetricTone;
  icon: ComponentType<{ className?: string }>;
};

export type HistoryUploadRow = {
  filename: string;
  type: string;
  date: string;
  time: string;
  status: string;
  statusTone: HistoryStatusTone;
  rows: string;
  icon: ComponentType<{ className?: string }>;
};

export type HistoryDashboardData = {
  metrics: HistoryDashboardMetric[];
  uploadRows: HistoryUploadRow[];
  activityBars: number[];
  queueDepth: number;
  validationCoverage: number;
  latestNotes: string;
  totalEntries: number;
};

type UploadHistoryRecord = {
  filename: string;
  file_type: string;
  uploaded_at: string;
  status: HistoryStatusTone;
  rows_processed: number | null;
  error_lines: number;
  notes: string | null;
};

const metricIcons = {
  database: Database,
  success: CheckCircle2,
  error: AlertTriangle,
} as const;

const rowIcon = Table2;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool =
  (globalThis as typeof globalThis & { __deptcontrolPool?: Pool }).__deptcontrolPool ??
  new Pool({
    connectionString,
    ssl: false,
  });

if (!(globalThis as typeof globalThis & { __deptcontrolPool?: Pool }).__deptcontrolPool) {
  (globalThis as typeof globalThis & { __deptcontrolPool?: Pool }).__deptcontrolPool = pool;
}

function formatDateParts(value: string) {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date),
  };
}

function toPercentSeries(values: number[]) {
  const max = Math.max(...values, 1);
  return values.map((value) => Math.max(8, Math.round((value / max) * 100)));
}

export async function getHistoryDashboardData(): Promise<HistoryDashboardData> {
  const [overviewResult, rowsResult, timelineResult] = await Promise.all([
    pool.query<{ total_rows: string; success_rows: string; error_rows: string; processing_rows: string; total_row_count: string }>(
      `select
        coalesce(sum(coalesce(rows_processed, 0)), 0)::text as total_rows,
        coalesce(sum(case when status = 'success' then 1 else 0 end), 0)::text as success_rows,
        coalesce(sum(case when status = 'error' then 1 else 0 end), 0)::text as error_rows,
        coalesce(sum(case when status = 'processing' then 1 else 0 end), 0)::text as processing_rows,
        coalesce(count(*), 0)::text as total_row_count
      from public.upload_history;`,
    ),
    pool.query<UploadHistoryRecord>(
      `select filename, file_type, uploaded_at, status, rows_processed, error_lines, notes
      from public.upload_history
      order by uploaded_at desc
      limit 4;`,
    ),
    pool.query<{ day_bucket: string; rows_processed: string }>(
      `select
        to_char(date_trunc('day', uploaded_at), 'YYYY-MM-DD') as day_bucket,
        coalesce(sum(coalesce(rows_processed, 0)), 0)::text as rows_processed
      from public.upload_history
      where uploaded_at >= now() - interval '7 days'
      group by 1
      order by 1;`,
    ),
  ]);

  const overview = overviewResult.rows[0] ?? {
    total_rows: "0",
    success_rows: "0",
    error_rows: "0",
    processing_rows: "0",
    total_row_count: "0",
  };

  const uploadRows = rowsResult.rows.map((row) => {
    const dateParts = formatDateParts(row.uploaded_at);

    return {
      filename: row.filename,
      type: row.file_type,
      date: row.status === "processing" ? "Just now" : dateParts.date,
      time: row.status === "processing" ? "" : dateParts.time,
      status: row.status === "processing" ? "Processing" : row.status === "success" ? "Success" : `Error (${row.error_lines} Lines)`,
      statusTone: row.status,
      rows: row.rows_processed === null ? "--" : row.rows_processed.toLocaleString("en-US"),
      icon: rowIcon,
    };
  });

  const activityBars = toPercentSeries(
    timelineResult.rows.map((row) => Number(row.rows_processed)),
  );

  const totalRows = Number(overview.total_rows);
  const totalCount = Number(overview.total_row_count);
  const successCount = Number(overview.success_rows);
  const errorCount = Number(overview.error_rows);
  const processingCount = Number(overview.processing_rows);
  const validationCoverage = totalCount === 0 ? 0 : Math.round((successCount / totalCount) * 100);
  const queueDepth = Math.max(processingCount, 1);

  return {
    metrics: [
      {
        title: "Total Rows Processed",
        value: totalRows.toLocaleString("en-US"),
        delta: "+12% this month",
        tone: "emerald",
        icon: metricIcons.database,
      },
      {
        title: "Success Rate",
        value: `${validationCoverage.toFixed(1)}%`,
        delta: `Last sync: ${totalCount > 0 ? "2h ago" : "No data yet"}`,
        tone: "blue",
        icon: metricIcons.success,
      },
      {
        title: "Critical Errors",
        value: String(errorCount),
        delta: "Requires attention",
        tone: "rose",
        icon: metricIcons.error,
      },
    ],
    uploadRows,
    activityBars: activityBars.length > 0 ? activityBars : [56, 72, 64, 80, 52, 90, 68],
    queueDepth,
    validationCoverage,
    latestNotes: rowsResult.rows[0]?.notes ?? "All records are exportable and versioned.",
    totalEntries: totalCount,
  };
}