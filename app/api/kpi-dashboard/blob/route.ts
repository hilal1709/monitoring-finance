import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";

export const runtime = "nodejs";

const maximumSizeInBytes = 50 * 1024 * 1024;
const excelTypes = ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"];

export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadPresignedBody;
    const response = await handleUploadPresigned({
      body,
      request,
      webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname) => {
        if (!/^kpi\/[0-9a-f-]+\.(xls|xlsx)$/i.test(pathname)) throw new Error("Path upload KPI tidak valid.");
        return { token: await issueSignedToken({ pathname, operations: ["put"], allowedContentTypes: excelTypes, maximumSizeInBytes, validUntil: Date.now() + 10 * 60 * 1000 }) };
      },
    });
    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Token upload KPI tidak dapat dibuat." }, { status: 400 });
  }
}