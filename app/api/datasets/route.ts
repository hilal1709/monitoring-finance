import { DATASET_MAX_BYTES } from "@/lib/chart-builder/datasets";
import { createDataset, listDatasets } from "@/lib/dataset-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    return Response.json({ datasets: await listDatasets() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Daftar data tidak dapat dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > DATASET_MAX_BYTES * 1.1) return Response.json({ error: "File terlalu besar. Kurangi baris atau kolom lalu coba lagi." }, { status: 413 });
    return Response.json({ dataset: await createDataset(JSON.parse(body)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Data tidak dapat disimpan." }, { status: 400 });
  }
}
