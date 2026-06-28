import { generateNonExportPpt, generateExportPpt } from "@/lib/generate-ppt";
import { buildNonExportAggregates, getNarrative } from "@/lib/ai-narrative";
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

    // Filter section by customer type
    const filterLabel = customerType === "external" ? "Ekspor" : customerType === "group" ? "Non-Ekspor" : "All";
    const targetLabel = customerType === "external" ? "external" : customerType === "group" ? "group" : null;

    let section = report.section;
    if (targetLabel) {
      const filtered = (section.records ?? []).filter(
        (r) => r.customerType?.toLowerCase() === targetLabel,
      );
      if (filtered.length === 0) {
        return Response.json(
          { error: `Tidak ada data untuk customer type "${customerType}".` },
          { status: 404 },
        );
      }

      const total = filtered.reduce((s, r) => s + r.amount, 0);
      const rankBy = (keyFn: (r: typeof filtered[0]) => string) => {
        const map = new Map<string, { value: number; count: number }>();
        for (const r of filtered) {
          const k = keyFn(r) || "Unmapped";
          const e = map.get(k) ?? { value: 0, count: 0 };
          e.value += r.amount; e.count += 1;
          map.set(k, e);
        }
        return [...map.entries()]
          .map(([label, item]) => ({ label, value: item.value, count: item.count, share: total ? item.value / total : 0 }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);
      };

      const monthlyMap = new Map<string, { label: string; sort: number; value: number }>();
      for (const r of filtered) {
        if (!r.periodKey || !r.periodLabel || r.periodSort === null) continue;
        const e = monthlyMap.get(r.periodKey) ?? { label: r.periodLabel, sort: r.periodSort, value: 0 };
        e.value += r.amount;
        monthlyMap.set(r.periodKey, e);
      }
      const monthly = [...monthlyMap.entries()]
        .map(([key, item]) => ({ key, label: item.label, value: item.value, sort: item.sort }))
        .sort((a, b) => a.sort - b.sort)
        .map((item) => ({ key: item.key, label: item.label, value: item.value }))
        .slice(-12);

      const latest = filtered
        .filter((r) => r.periodLabel && r.periodSort !== null)
        .sort((a, b) => (b.periodSort ?? 0) - (a.periodSort ?? 0))[0];

      section = {
        rowCount: filtered.length,
        totalAmount: total,
        averageAmount: filtered.length > 0 ? total / filtered.length : 0,
        latestPeriod: latest?.periodLabel ?? "-",
        statusMix: rankBy((r) => r.status),
        customerTypes: rankBy((r) => r.customerType),
        invoiceTypes: rankBy((r) => r.invoiceType),
        topCustomers: rankBy((r) => r.customerName),
        monthly,
        records: filtered,
      };
    }

    const narrative = await getNarrative(
      `${roleValue}:${filterLabel}`,
      buildNonExportAggregates(roleValue as string, filterLabel, section as Record<string, unknown>),
    );

    const pptBuffer = await generateNonExportPpt({
      role: roleValue as string,
      filterLabel,
      section: section as Record<string, unknown>,
      narrative,
    });

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
