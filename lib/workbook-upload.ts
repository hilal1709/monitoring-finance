import "server-only";

import { del, get } from "@vercel/blob";

// Uploads arrive one of two ways (see lib/upload-workbook.ts on the client):
//  - multipart form data with the file itself (small files, local dev), or
//  - JSON `{ pathname, fields }` pointing at a private Vercel Blob the browser
//    uploaded directly, which sidesteps the ~4.5 MB serverless body limit.

export const BLOB_UPLOAD_PATTERN = /^(dashboard\/(invoice|payment)|export)\/[0-9a-f-]+\.xlsx$/i;

export type UploadedWorkbook = {
  name: string;
  buffer: Buffer;
  fields: Record<string, string>;
  /** Removes the temporary blob once the workbook has been stored. */
  cleanup: () => Promise<void>;
};

export async function readUploadedWorkbook(request: Request, fileField: string): Promise<UploadedWorkbook | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { pathname?: string; name?: string; fields?: Record<string, string> };
    const pathname = body.pathname ?? "";

    if (!BLOB_UPLOAD_PATTERN.test(pathname)) {
      throw new Error("Lokasi file upload tidak valid.");
    }

    const blob = await get(pathname, { access: "private", useCache: false });

    if (!blob) {
      throw new Error("File upload tidak ditemukan di storage.");
    }

    return {
      name: body.name || pathname.split("/").at(-1) || "workbook.xlsx",
      buffer: Buffer.from(await new Response(blob.stream).arrayBuffer()),
      fields: body.fields ?? {},
      cleanup: () => del(pathname).catch(() => undefined),
    };
  }

  const formData = await request.formData();
  const file = formData.getAll(fileField).find((item): item is File => item instanceof File && item.size > 0);

  if (!file) {
    return null;
  }

  const fields: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") fields[key] = value;
  }

  return {
    name: file.name,
    buffer: Buffer.from(await file.arrayBuffer()),
    fields,
    cleanup: async () => undefined,
  };
}
