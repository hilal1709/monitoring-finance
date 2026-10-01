// Client-side workbook upload. Small files (and everything in local dev) are
// posted directly as multipart form data. Larger files go straight from the
// browser to a private Vercel Blob first — Vercel rejects serverless request
// bodies above ~4.5 MB — and the API then processes the blob by pathname.
// The Blob client is imported lazily so it never weighs on page load.

const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024;

type UploadWorkbookOptions = {
  endpoint: string;
  file: File;
  /** Form field name the API reads the file from. */
  fileField: string;
  /** Blob path prefix accepted by /api/upload/blob, e.g. "dashboard/invoice". */
  blobPrefix: string;
  fields?: Record<string, string>;
};

function isLocalHost() {
  return ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

export async function uploadWorkbook({ endpoint, file, fileField, blobPrefix, fields = {} }: UploadWorkbookOptions): Promise<Response> {
  if (isLocalHost() || file.size <= DIRECT_UPLOAD_LIMIT) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.append(key, value);
    formData.append(fileField, file);
    return fetch(endpoint, { method: "POST", body: formData });
  }

  const { uploadPresigned } = await import("@vercel/blob/client");
  const blob = await uploadPresigned(`${blobPrefix}/${crypto.randomUUID()}.xlsx`, file, {
    access: "private",
    handleUploadUrl: "/api/upload/blob",
    contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    multipart: true,
  });

  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pathname: blob.pathname, name: file.name, fields }),
  });
}

/** Parses a JSON API response, surfacing non-JSON error bodies (e.g. 413 pages) as `raw`. */
export async function readResponsePayload(response: Response): Promise<Record<string, unknown> | null> {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { raw: raw.slice(0, 500) };
  }
}

export function responseError(response: Response, payload: Record<string, unknown> | null, fallback: string) {
  if (response.status === 413) return "Ukuran file melebihi batas server.";
  return (payload?.error as string | undefined) ?? (payload?.raw as string | undefined) ?? fallback;
}
