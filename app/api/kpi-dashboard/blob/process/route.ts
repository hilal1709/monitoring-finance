import { get } from "@vercel/blob";
import { cacheTags, invalidate } from "@/lib/data-cache";
import { getKpiDashboard, saveKpiWorkbook } from "@/lib/kpi-dashboard-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { pathname } = await request.json() as { pathname?: string };
    if (!pathname || !/^kpi\/[0-9a-f-]+\.(xls|xlsx)$/i.test(pathname)) return Response.json({ error: "File KPI tidak valid." }, { status: 400 });
    const blob = await get(pathname, { access: "private", useCache: false });
    if (!blob) return Response.json({ error: "File KPI di Blob tidak ditemukan." }, { status: 404 });
    const buffer = Buffer.from(await new Response(blob.stream).arrayBuffer());
    const upsertedPeriods = await saveKpiWorkbook({ name: pathname.split("/").at(-1) ?? "kpi.xls", buffer });
    invalidate(cacheTags.kpi);
    return Response.json({ ...(await getKpiDashboard()), upsertedPeriods }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Workbook KPI tidak bisa diproses." }, { status: 400 });
  }
}