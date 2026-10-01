import { cacheTags, getCachedDashboard, invalidate } from "@/lib/data-cache";
import { deleteMonthRecords, saveDashboardUploadByMonth } from "@/lib/dashboard-store";
import type { WorkbookRole } from "@/lib/monitoring-dashboard-types";
import { readUploadedWorkbook } from "@/lib/workbook-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseRole(value: FormDataEntryValue | string | null | undefined): WorkbookRole | undefined {
  return value === "invoice" || value === "payment" ? value : undefined;
}

function rolesFor(role?: WorkbookRole): WorkbookRole[] {
  return role ? [role] : ["invoice", "payment"];
}

export async function GET(request: Request) {
  try {
    const role = parseRole(new URL(request.url).searchParams.get("role"));

    return Response.json(await getCachedDashboard(rolesFor(role)), {
      headers: { "Cache-Control": "private, no-cache" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data upload tidak bisa diambil dari database.";

    return Response.json({ error: message }, { status: 500 });
  }
}

// Accepts the workbook as multipart form data or as a Vercel Blob pathname
// (large files), stores it, and answers with the refreshed dashboard so the
// client doesn't need a second round trip.
export async function POST(request: Request) {
  try {
    const workbook = await readUploadedWorkbook(request, "files");

    if (!workbook) {
      return Response.json({ error: "Upload minimal satu workbook Excel." }, { status: 400 });
    }

    const role = parseRole(workbook.fields.role);

    if (!role) {
      await workbook.cleanup();
      return Response.json({ error: "Tipe upload harus invoice atau payment." }, { status: 400 });
    }

    try {
      const { upsertedMonths } = await saveDashboardUploadByMonth(role, workbook);
      invalidate(cacheTags.dashboard(role));

      return Response.json({ upsertedMonths, ...(await getCachedDashboard([role])) });
    } finally {
      await workbook.cleanup();
    }
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
      return Response.json({ error: "Role dan periode bulan wajib diisi." }, { status: 400 });
    }

    const result = await deleteMonthRecords(role, periodKey);
    invalidate(cacheTags.dashboard(role));

    return Response.json({ deleted: result.deleted, ...(await getCachedDashboard([role])) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data bulan tidak bisa dihapus.";

    return Response.json({ error: message }, { status: 400 });
  }
}
