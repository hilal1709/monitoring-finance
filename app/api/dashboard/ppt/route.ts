import { generateNonExportPpt, generateExportPpt } from "@/lib/generate-ppt";
import { sectionFromRecords, statusOrderForRole } from "@/lib/dashboard-data";
import type { WorkbookRole } from "@/lib/monitoring-dashboard-types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "non-export"; // "export" | "non-export"

    if (type === "export") {
      const theme = searchParams.get("theme") === "light" ? "light" : "black";
      const pptBuffer = await generateExportPpt(theme);
      const filename = `DeptControl_Ekspor_${theme === "light" ? "Light" : "Black"}.pptx`;

      return new Response(pptBuffer as any, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Non-export: invoice/payment report filtered by customer type
    const roleValue = searchParams.get("role");
    const customerType = (searchParams.get("customerType") || "all") as "external" | "group" | "all";

    if (roleValue !== "invoice" && roleValue !== "payment") {
      return Response.json(
        { error: 'Parameter "role" harus "invoice" atau "payment".' },
        { status: 400 },
      );
    }

    const { getLatestDashboardReports } = await import("@/lib/dashboard-store");

    const reports = await getLatestDashboardReports(roleValue as WorkbookRole);
    const report = reports[roleValue as WorkbookRole];

    if (!report) {
      return Response.json(
        { error: `Data ${roleValue} belum tersedia. Upload workbook terlebih dahulu.` },
        { status: 404 },
      );
    }

    // Filter by customer type, then rebuild the section with the same helper
    // the web dashboard uses so the PPT numbers match the web.
    const role = roleValue as WorkbookRole;
    const filterLabel = customerType === "external" ? "Ekspor" : customerType === "group" ? "Non-Ekspor" : "All";
    const targetLabel = customerType === "external" ? "external" : customerType === "group" ? "group" : null;

    let section = report.section;
    if (section.records?.length) {
      const filtered = targetLabel
        ? section.records.filter((r) => r.customerType?.toLowerCase() === targetLabel)
        : section.records;
      if (filtered.length === 0) {
        return Response.json(
          { error: `Tidak ada data untuk customer type "${customerType}".` },
          { status: 404 },
        );
      }
      section = sectionFromRecords(filtered, statusOrderForRole(role));
    }

    const pptBuffer = await generateNonExportPpt({ role, filterLabel, section });

    const roleLabel = roleValue === "invoice" ? "Invoice" : "Payment";
    const filename = `DeptControl_${roleLabel}_${filterLabel}.pptx`;

    return new Response(pptBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal generate PPT.";
    return Response.json({ error: message }, { status: 500 });
  }
}
