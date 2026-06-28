import {
  deleteMonthRecords,
  getAllDashboardReports,
  saveDashboardUploadByMonth,
} from "@/lib/dashboard-store";
import type { WorkbookRole } from "@/lib/monitoring-dashboard-types";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseRole(value: FormDataEntryValue | string | null): WorkbookRole | undefined {
  return value === "invoice" || value === "payment" ? value : undefined;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = parseRole(searchParams.get("role"));
    const dashboard = await getAllDashboardReports(role);

    return Response.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data upload tidak bisa diambil dari database.";

    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);
    const role = parseRole(formData.get("role"));

    if (!role) {
      return Response.json(
        { error: "Tipe upload harus invoice atau payment." },
        { status: 400 },
      );
    }

    if (files.length < 1) {
      return Response.json(
        { error: "Upload minimal satu workbook Excel." },
        { status: 400 },
      );
    }

    const workbooks = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );

    const upsertedMonths: { periodKey: string; rowCount: number }[] = [];

    for (const workbook of workbooks) {
      const result = await saveDashboardUploadByMonth(role, workbook);
      upsertedMonths.push(...result.upsertedMonths);
    }

    const dashboard = await getAllDashboardReports(role);
    const persistedReport = dashboard.reports[role];

    if (!persistedReport) {
      return Response.json(
        { error: "Workbook berhasil diproses, tapi dashboard bulanan belum bisa dibuat." },
        { status: 400 },
      );
    }

    return Response.json({
      generatedAt: persistedReport.generatedAt,
      files: [persistedReport.file],
      [role]: persistedReport.section,
      persistedReport,
      reports: dashboard.reports,
      months: dashboard.months,
      upsertedMonths,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workbook tidak bisa diproses.";

    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = parseRole(searchParams.get("role"));
    const periodKey = searchParams.get("periodKey");

    if (!role || !periodKey) {
      return Response.json(
        { error: "Role dan periode bulan wajib diisi." },
        { status: 400 },
      );
    }

    const result = await deleteMonthRecords(role, periodKey);
    const dashboard = await getAllDashboardReports(role);

    return Response.json({
      deleted: result.deleted,
      reports: dashboard.reports,
      months: dashboard.months,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data bulan tidak bisa dihapus.";

    return Response.json({ error: message }, { status: 400 });
  }
}
