import { getLatestDashboardReports, saveDashboardUpload } from "@/lib/dashboard-store";
import { buildMonitoringDashboardFromFiles } from "@/lib/monitoring-dashboard";
import type { WorkbookRole } from "@/lib/monitoring-dashboard-types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleValue = searchParams.get("role");
    const role = roleValue === "invoice" || roleValue === "payment" ? roleValue : undefined;

    return Response.json({ reports: await getLatestDashboardReports(role) });
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
    const roleValue = formData.get("role");
    const role = roleValue === "invoice" || roleValue === "payment" ? roleValue : undefined;

    if (files.length < 1) {
      return Response.json(
        { error: "Upload minimal satu workbook Excel." },
        { status: 400 },
      );
    }

    const workbooks = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        buffer: Buffer.from(await file.arrayBuffer()),
      })),
    );

    const dashboardData = buildMonitoringDashboardFromFiles(workbooks, role as WorkbookRole | undefined);
    const parsedRole = role ?? dashboardData.files[0]?.role;
    const fileSummary = parsedRole ? dashboardData.files.find((file) => file.role === parsedRole) : undefined;
    const section = parsedRole ? dashboardData[parsedRole] : undefined;
    const sourceFile = parsedRole ? workbooks.find((file) => file.name === fileSummary?.name) : undefined;

    if (!parsedRole || !fileSummary || !section || !sourceFile) {
      return Response.json(
        { error: "Workbook berhasil dibaca, tapi tipe report invoice/payment tidak bisa dipastikan." },
        { status: 400 },
      );
    }

    const persistedReport = await saveDashboardUpload({
      role: parsedRole,
      file: sourceFile,
      dashboardData,
      fileSummary,
      section,
    });

    return Response.json({ ...dashboardData, persistedReport });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workbook tidak bisa diproses.";

    return Response.json({ error: message }, { status: 400 });
  }
}
