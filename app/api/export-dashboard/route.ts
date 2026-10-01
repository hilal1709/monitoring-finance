import { cacheTags, getCachedExportDashboard, invalidate } from "@/lib/data-cache";
import { deleteExportMonth, saveExportUploadByMonth } from "@/lib/export-dashboard-store";
import { readUploadedWorkbook } from "@/lib/workbook-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    return Response.json(await getCachedExportDashboard(), { headers: { "Cache-Control": "private, no-cache" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data Ekspor tidak bisa dimuat.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workbook = await readUploadedWorkbook(request, "file");

    if (!workbook) {
      return Response.json({ error: "Pilih satu workbook Excel Ekspor." }, { status: 400 });
    }

    try {
      const result = await saveExportUploadByMonth(workbook);
      invalidate(cacheTags.export);

      return Response.json({ ...(await getCachedExportDashboard()), upsertedMonths: result.upsertedMonths });
    } finally {
      await workbook.cleanup();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workbook Ekspor tidak bisa diproses.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const periodKey = new URL(request.url).searchParams.get("periodKey");

    if (!periodKey) {
      return Response.json({ error: "Periode bulan wajib dipilih." }, { status: 400 });
    }

    const result = await deleteExportMonth(periodKey);
    invalidate(cacheTags.export);

    return Response.json({ ...result, ...(await getCachedExportDashboard()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data bulan Ekspor tidak bisa dihapus.";
    return Response.json({ error: message }, { status: 400 });
  }
}
