import { expect, test } from "@playwright/test";
import { buildCardData, buildChartData, periodTotals, type PageContext } from "../lib/chart-builder/aggregate";
import { compare } from "../lib/chart-builder/time-intel";
import { builtinSources, exportRows, exportTargetRows, kpiRows, monitoringRows, paymentTargetRows } from "../lib/chart-builder/sources";
import type { Row, SourceId, WidgetSpec } from "../lib/chart-builder/types";
import { itemByLabel, loadedReportsFromPacked, monthlyAverage, paymentMovementSummary, paymentTargetPoints, periodTrendPoints } from "../lib/dashboard-data";
import { isPaid, monthlyPoints, rankRecords as rankExport, total } from "../lib/export-dashboard-data";
import type { ExportDashboardWire, ExportViewRecord } from "../lib/export-dashboard-types";
import type { DashboardPayload } from "../lib/monitoring-dashboard-types";
import { unpackRows } from "../lib/packed-rows";

// The widget specs behind the built-ins must give the numbers the original
// components show. Real data comes from the running app's APIs
// (PARITY_BASE_URL, default the dev server on :3000).

const base = process.env.PARITY_BASE_URL ?? "http://localhost:3000";

type Sources = Partial<Record<SourceId, Row[]>>;

function contextFor(sources: Sources, periodMode: PageContext["periodMode"] = "mom"): PageContext {
  return {
    periodMode,
    resolve: (id) => (sources[id] && builtinSources[id as keyof typeof builtinSources] ? { def: builtinSources[id as keyof typeof builtinSources], rows: sources[id]! } : undefined),
  };
}

function spec(partial: Partial<WidgetSpec> & Pick<WidgetSpec, "source" | "chart" | "measures">): WidgetSpec {
  return { id: "t", title: "t", filters: [], ...partial };
}

const def = (id: SourceId) => builtinSources[id as keyof typeof builtinSources];
const close = (a: number | null | undefined, b: number) => expect(a ?? 0).toBeCloseTo(b, 4);

test.describe("built-in specs reproduce the original numbers", () => {
  test("invoice & payment report", async ({ request }) => {
    const payload = (await (await request.get(`${base}/api/dashboard`)).json()) as DashboardPayload;
    const reports = loadedReportsFromPacked(payload.reports);
    test.skip(!reports.invoice || !reports.payment, "no invoice/payment data uploaded");
    const invoice = reports.invoice!.section;
    const payment = reports.payment!.section;
    const sources: Sources = {
      invoice: monitoringRows(invoice.records),
      payment: monitoringRows(payment.records),
      "payment-target": paymentTargetRows(payment.records),
    };

    for (const [role, section] of [["invoice", invoice], ["payment", payment]] as const) {
      const rows = sources[role]!;
      const card = (partial: Partial<WidgetSpec>) => buildCardData(spec({ source: role, chart: "card", measures: [{ field: "amount", agg: "sum" }], ...partial }), def(role), rows, contextFor(sources));
      close(card({}).value, section.totalAmount);
      close(card({ measures: [{ field: "count", agg: "count" }] }).value, section.rowCount);
      close(card({ measures: [{ field: "amount", agg: "avg" }] }).value, section.averageAmount);
      close(card({ measures: [{ field: "amount", agg: "monthly-avg" }] }).value, monthlyAverage(section));
      const status = role === "invoice" ? "Bucket 4" : "No Risk";
      close(card({ card: { display: "value", compute: "share", share: { field: "status", op: "in", values: [status] } } }).value, itemByLabel(section.statusMix, status)?.share ?? 0);
      const group = Math.round((itemByLabel(section.customerTypes, "Group")?.share ?? 0) * 100);
      expect(card({ card: { display: "value", compute: "split", split: { field: "customerType", values: ["Group", "External"] } } }).text).toBe(`Group ${group}%`);

      // Ranked lists: status mix (fixed order), top customers, invoice types.
      const ranked = (partial: Partial<WidgetSpec>) => buildChartData(spec({ source: role, chart: "bar-h", measures: [{ field: "amount", agg: "sum" }], ...partial }), def(role), rows, contextFor(sources));
      const statusChart = ranked({ dimension: "status", sort: "label", limit: 8 });
      expect(statusChart.labels).toEqual(section.statusMix.map((item) => item.label));
      section.statusMix.forEach((item, index) => close(statusChart.series[0].values[index], item.value));
      const customers = ranked({ dimension: "customerName", sort: "value-desc", limit: 6 });
      expect(customers.labels).toEqual(section.topCustomers.slice(0, 6).map((item) => item.label));
      const types = ranked({ dimension: "invoiceType", sort: "value-desc", limit: 8 });
      expect(types.labels).toEqual(section.invoiceTypes.map((item) => item.label));
      section.invoiceTypes.forEach((item, index) => close(types.series[0].total ? (types.series[0].values[index] ?? 0) / types.series[0].total : 0, item.share));

      // Trend in all three page modes.
      for (const mode of ["mom", "yoy", "ytd"] as const) {
        const old = periodTrendPoints(section, mode);
        const data = buildChartData(spec({ source: role, chart: "line", dimension: "periodKey", measures: [{ field: "amount", agg: "sum" }], timeMode: "page", limit: 12 }), def(role), rows, contextFor(sources, mode));
        expect(data.keys, `${role} ${mode} months`).toEqual(old.map((point) => point.key.replace(/^(ytd|yoy)-/, "")));
        old.forEach((point, index) => close(data.series[0].values[index], point.value));
        if (mode !== "yoy") old.forEach((point, index) => expect(data.series[1]?.values[index] ?? null, `${role} ${mode} compare ${point.key}`).toBe(point.compareValue ?? null));
      }
    }

    // Payment target charts.
    const points = paymentTargetPoints(payment);
    const targets = buildChartData(
      spec({
        source: "payment-target",
        chart: "bar-h",
        dimension: "periodKey",
        measures: [
          { field: "target", agg: "sum" },
          { field: "amount", agg: "sum", source: "payment" },
        ],
        timeMode: "monthly",
        limit: 12,
      }),
      def("payment-target"),
      sources["payment-target"]!,
      contextFor(sources),
    );
    points.forEach((point, index) => {
      close(targets.series[0].values[index], point.target);
      close(targets.series[1].values[index], point.realization);
    });
    const variance = buildChartData(
      spec({ source: "payment-target", chart: "bar-h", dimension: "periodKey", measures: [{ field: "amount", agg: "sum", source: "payment", divideBy: { field: "target", agg: "sum", source: "payment-target" } }], timeMode: "monthly", limit: 12 }),
      def("payment-target"),
      sources["payment-target"]!,
      contextFor(sources),
    );
    points.forEach((point, index) => close((variance.series[0].values[index] ?? 0) - 1, point.variance));

    // Payment MoM / YoY / YTD tiles. The original MoM skipped January (it only looked within the
    // same year); the shared engine compares January with December, so MoM is checked from February on.
    const movement = paymentMovementSummary(payment);
    const totals = periodTotals(sources.payment!, { field: "amount", agg: "sum" });
    const latestMonth = [...totals.keys()].sort().at(-1)!;
    close(compare(totals, "yoy")?.percent ?? 0, movement.yoy ?? 0);
    close(compare(totals, "ytd")?.percent ?? 0, movement.ytd ?? 0);
    if (!latestMonth.endsWith("-01")) close(compare(totals, "mom")?.percent ?? 0, movement.mom ?? 0);

    // Overview: cash coverage and net exposure across both sources.
    const coverage = buildCardData(spec({ source: "payment", chart: "card", measures: [{ field: "amount", agg: "sum" }], card: { display: "value", compute: "ratio", target: { field: "amount", source: "invoice" } } }), def("payment"), sources.payment!, contextFor(sources));
    close(coverage.value, invoice.totalAmount ? payment.totalAmount / invoice.totalAmount : 0);
    const exposure = buildCardData(spec({ source: "invoice", chart: "card", measures: [{ field: "amount", agg: "sum" }], card: { display: "value", compute: "difference", target: { field: "amount", source: "payment" } } }), def("invoice"), sources.invoice!, contextFor(sources));
    close(exposure.value, invoice.totalAmount - payment.totalAmount);
  });

  test("export views", async ({ request }) => {
    const wire = (await (await request.get(`${base}/api/export-dashboard`)).json()) as ExportDashboardWire;
    const records = unpackRows(wire.records) as ExportViewRecord[];
    test.skip(records.length === 0, "no export data uploaded");
    const sources: Sources = { export: exportRows(records), "export-target": exportTargetRows(wire.kpi ?? null) };
    const rows = sources.export!;
    const card = (partial: Partial<WidgetSpec>) => buildCardData(spec({ source: "export", chart: "card", measures: [{ field: "usdValue", agg: "sum" }], ...partial }), def("export"), rows, contextFor(sources));

    close(card({}).value, total(records, (record) => record.usdValue));
    close(card({ measures: [{ field: "paidUsd", agg: "sum" }] }).value, total(records.filter(isPaid), (record) => record.usdValue));
    close(card({ measures: [{ field: "outstandingUsd", agg: "sum" }] }).value, total(records.filter((record) => !isPaid(record)), (record) => record.usdValue));
    close(card({ measures: [{ field: "buyer", agg: "distinct" }] }).value, new Set(records.map((record) => record.buyer)).size);
    expect(card({ card: { display: "value", compute: "top", topField: "destination" } }).text).toBe(rankExport(records, (record) => record.destination, (record) => record.usdValue, 1)[0]?.label);

    for (const [dimension, field, limit] of [["companyCode", "usdValue", 8], ["destination", "usdValue", 6], ["product", "tonnage", 6], ["buyer", "usdValue", 7]] as const) {
      const old = rankExport(records, (record) => String(record[dimension]), (record) => Number(record[field]), limit);
      const data = buildChartData(spec({ source: "export", chart: "bar-h", dimension, measures: [{ field, agg: "sum" }], sort: "abs-desc", limit }), def("export"), rows, contextFor(sources));
      expect(data.labels, `${dimension}`).toEqual(old.map((item) => item.label));
      old.forEach((item, index) => close(data.series[0].values[index], item.value));
    }

    const monthly = monthlyPoints(records);
    const trend = buildChartData(
      spec({ source: "export", chart: "line", dimension: "periodKey", measures: [{ field: "usdValue", agg: "sum" }, { field: "paidUsd", agg: "sum" }, { field: "outstandingUsd", agg: "sum" }], timeMode: "monthly", limit: 240 }),
      def("export"),
      rows,
      contextFor(sources),
    );
    expect(trend.keys).toEqual(monthly.map((point) => point.key));
    monthly.forEach((point, index) => {
      close(trend.series[0].values[index], point.sales);
      close(trend.series[1].values[index], point.payment);
      close(trend.series[2].values[index], point.outstanding);
    });

    if (wire.kpi) {
      const kpi = wire.kpi;
      const sum = (pick: (month: (typeof kpi.months)[number]) => number) => kpi.months.reduce((all, month) => all + pick(month), 0);
      const target = (partial: Partial<WidgetSpec>) => buildCardData(spec({ source: "export-target", chart: "card", measures: [{ field: "salesTargetUsd", agg: "sum" }], ignoreFilters: ["*"], ...partial }), def("export-target"), sources["export-target"]!, contextFor(sources));
      close(target({}).value, sum((month) => month.salesTargetUsd));
      close(target({ measures: [{ field: "salesActualUsd", agg: "sum" }], card: { display: "value", compute: "ratio", target: { field: "salesTargetUsd" } } }).value, sum((month) => month.salesTargetUsd) ? sum((month) => month.salesActualUsd) / sum((month) => month.salesTargetUsd) : 0);
      close(target({ measures: [{ field: "paymentActualUsd", agg: "sum" }], card: { display: "value", compute: "remaining", target: { field: "paymentTargetUsd" } } }).value, Math.max(0, sum((month) => month.paymentTargetUsd) - sum((month) => month.paymentActualUsd)));
      const versus = buildChartData(
        spec({ source: "export", chart: "line", dimension: "periodKey", measures: [{ field: "salesTargetUsd", agg: "sum", source: "export-target" }, { field: "usdValue", agg: "sum" }], timeMode: "monthly", limit: 240 }),
        def("export"),
        rows,
        contextFor(sources),
      );
      expect(versus.keys).toEqual(monthly.map((point) => point.key));
      monthly.forEach((point, index) => close(versus.series[0].values[index], kpi.months.find((month) => month.periodKey === point.key)?.salesTargetUsd ?? 0));
    }
  });

  test("KPI semester", async ({ request }) => {
    const payload = (await (await request.get(`${base}/api/kpi-dashboard`)).json()) as { periods: Parameters<typeof kpiRows>[0] };
    test.skip(!payload.periods?.length, "no KPI data uploaded");
    const rows = kpiRows(payload.periods);
    const latest = payload.periods[0];
    const metric = latest.metrics[0]?.label;
    const month = Number(latest.periodKey.slice(5, 7));
    const semesterKeys = payload.periods.map((period) => period.periodKey).filter((key) => key.slice(0, 4) === latest.periodKey.slice(0, 4) && (month <= 6 ? Number(key.slice(5, 7)) <= 6 : Number(key.slice(5, 7)) >= 7) && key <= latest.periodKey);
    const scope = { field: "periodKey", op: "in" as const, values: semesterKeys };
    const context = { ...contextFor({ kpi: rows }), rules: [scope] };
    const filters = [{ field: "metric", op: "in" as const, values: [metric] }];
    const actual = payload.periods.filter((period) => semesterKeys.includes(period.periodKey)).reduce((sum, period) => sum + (period.metrics[0]?.actual ?? 0), 0);
    const card = buildCardData(spec({ source: "kpi", chart: "card", measures: [{ field: "actual", agg: "sum" }], filters, card: { display: "progress", target: { field: "target" } } }), def("kpi"), rows, context);
    close(card.value, actual);
  });
});
