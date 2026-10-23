import { deleteDataset, getDataset } from "@/lib/dataset-store";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const dataset = await getDataset((await context.params).id);
    if (!dataset) return Response.json({ error: "Data tidak ditemukan." }, { status: 404 });
    return Response.json({ dataset }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Data tidak dapat dimuat." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    await deleteDataset((await context.params).id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Data tidak dapat dihapus." }, { status: 400 });
  }
}
