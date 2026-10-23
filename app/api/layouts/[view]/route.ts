import { cacheTags, getCachedLayout, invalidate } from "@/lib/data-cache";
import { listLayoutVersions, resetLayout, restoreLayoutVersion, saveLayout } from "@/lib/dashboard-layout-store";
import { navigationGroups } from "@/lib/dashboard-constants";

export const runtime = "nodejs";

const VIEWS = new Set<string>(navigationGroups.flatMap((group) => group.items.map((item) => item.view)));
const MAX_BODY_BYTES = 512 * 1024;

type Context = { params: Promise<{ view: string }> };

async function viewOf(context: Context) {
  const { view } = await context.params;
  if (!VIEWS.has(view)) throw new Response(JSON.stringify({ error: "Halaman tidak dikenal." }), { status: 404 });
  return view;
}

function failure(error: unknown, fallback: string) {
  if (error instanceof Response) return error;
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 400 });
}

export async function GET(request: Request, context: Context) {
  try {
    const view = await viewOf(context);
    if (new URL(request.url).searchParams.has("versions")) return Response.json({ versions: await listLayoutVersions(view) }, { headers: { "Cache-Control": "no-store" } });
    return Response.json({ layout: await getCachedLayout(view) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error, "Layout tidak dapat dimuat.");
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const view = await viewOf(context);
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) return Response.json({ error: "Layout terlalu besar." }, { status: 413 });
    const payload = JSON.parse(body) as { layout?: unknown; restore?: number };
    const layout = typeof payload.restore === "number" ? await restoreLayoutVersion(view, payload.restore) : await saveLayout(view, payload.layout);
    invalidate(cacheTags.layout(view));
    return Response.json({ layout }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error, "Layout tidak dapat disimpan.");
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const view = await viewOf(context);
    await resetLayout(view);
    invalidate(cacheTags.layout(view));
    return Response.json({ layout: null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error, "Layout tidak dapat dikembalikan.");
  }
}
