import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { BLOB_UPLOAD_PATTERN } from "@/lib/workbook-upload";

export const runtime = "nodejs";

// Issues short-lived, path-scoped tokens so the browser can upload large
// invoice/payment/export workbooks straight to Vercel Blob.
const maximumSizeInBytes = 50 * 1024 * 1024;
const excelTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadPresignedBody;
    const response = await handleUploadPresigned({
      body,
      request,
      webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname) => {
        if (!BLOB_UPLOAD_PATTERN.test(pathname)) throw new Error("Path upload tidak valid.");
        return {
          token: await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: excelTypes,
            maximumSizeInBytes,
            validUntil: Date.now() + 10 * 60 * 1000,
          }),
        };
      },
    });
    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Token upload tidak dapat dibuat." }, { status: 400 });
  }
}
