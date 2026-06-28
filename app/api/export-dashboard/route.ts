import {
  deleteExportMonth,
  getExportDashboard,
  saveExportUploadByMonth,
} from "@/lib/export-dashboard-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    return Response.json(await getExportDashboard());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data Ekspor tidak bisa dimuat.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "Pilih satu workbook Excel Ekspor." }, { status: 400 });
    }

    const result = await saveExportUploadByMonth({
      name: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
    const dashboard = await getExportDashboard();

    return Response.json({ ...dashboard, upsertedMonths: result.upsertedMonths });
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
    return Response.json({ ...result, ...(await getExportDashboard()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data bulan Ekspor tidak bisa dihapus.";
    return Response.json({ error: message }, { status: 400 });
  }
}
