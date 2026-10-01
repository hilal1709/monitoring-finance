import "server-only";

// ---------------------------------------------------------------------------
// PPT slide specs.
//
// Every number, chart and explanation in the decks is computed here with the
// SAME helpers the web dashboard uses (lib/export-dashboard-data.ts,
// lib/dashboard-data.ts and their formatters), so the PPT mirrors the web views
// one-to-one. lib/ppt_render.py only draws what this spec describes.
// ---------------------------------------------------------------------------

import { isPaid, monthlyPoints, rankRecords, total } from "@/lib/export-dashboard-data";
import { formatIdr, formatTonnage, formatUsd } from "@/lib/export-dashboard-format";
import type { ExportDashboardPayload, ExportViewRecord } from "@/lib/export-dashboard-types";
import {
  itemByLabel,
  monthlyAverage,
  paymentMovementSummary,
  paymentTargetPoints,
  periodTrendPoints,
} from "@/lib/dashboard-data";
import { formatCurrency, formatDeltaPercent, formatNumber, formatPercent } from "@/lib/dashboard-format";
import { palette } from "@/lib/dashboard-constants";
import type { DashboardSection, RankedItem, WorkbookRole } from "@/lib/monitoring-dashboard-types";
import type { Narrative } from "@/lib/ai-narrative";

// Web palette (components/charts/colors.ts).
const TEAL = "#174D55";
const TURQUOISE = "#4ECDC4";
const CORAL = "#FF6B6B";
const YELLOW = "#FFE66D";

// ── Spec types (mirrored by lib/ppt_render.py) ──────────────────────────────

export type PptKpi = { label: string; value: string; sub?: string };

export type PptSeries = {
  name: string;
  values: (number | null)[];
  color: string;
  dashed?: boolean;
  emphasis?: boolean;
};

export type PptChart =
  | {
      kind: "hbar";
      title: string;
      categories: string[];
      values: number[];
      labels: string[];
      color: string;
      negativeColor: string;
    }
  | { kind: "line"; title: string; categories: string[]; series: PptSeries[]; axisFormat: string; lastLabel?: string }
  | { kind: "groupedHbar"; title: string; categories: string[]; series: PptSeries[]; axisFormat: string }
  | { kind: "donut"; title: string; categories: string[]; values: number[]; colors: string[] };

export type PptSlide =
  | { type: "title"; title: string; subtitle: string }
  | { type: "content"; title: string; banner?: string; kpis?: PptKpi[]; charts: PptChart[]; bullets: string[] }
  | { type: "summary"; title: string; kpis?: PptKpi[]; paragraph?: string; bullets: string[]; bulletsTitle: string }
  | { type: "end" };

export type PptSpec = { theme: "black" | "light"; slides: PptSlide[] };

// ── Shared helpers ──────────────────────────────────────────────────────────

type Unit = "usd" | "idr" | "ton" | "pct";

/** Excel number format for a value axis, scaled like the web formatters. */
function axisFormat(unit: Unit, values: (number | null)[]) {
  if (unit === "pct") return "0%";
  const max = Math.max(0, ...values.map((value) => Math.abs(value ?? 0)));

  if (unit === "idr") {
    if (max >= 1e12) return '#,##0.0,,,,"T"';
    if (max >= 1e9) return '#,##0,,,"M"';
    if (max >= 1e6) return '#,##0,,"jt"';
    return "#,##0";
  }

  if (max >= 1e9) return '#,##0.0,,,"B"';
  if (max >= 1e6) return '#,##0,,"M"';
  if (max >= 1e3) return '#,##0,"K"';
  return "#,##0";
}

function hbar(
  title: string,
  items: { label: string; value: number }[],
  format: (value: number) => string,
  tone: "turquoise" | "coral" | "yellow" | "teal" = "turquoise",
): PptChart {
  const color = { turquoise: TURQUOISE, coral: CORAL, yellow: YELLOW, teal: TEAL }[tone];

  return {
    kind: "hbar",
    title,
    categories: items.map((item) => item.label),
    values: items.map((item) => item.value),
    labels: items.map((item) => format(item.value)),
    color,
    negativeColor: tone === "coral" ? TEAL : CORAL,
  };
}

function line(
  title: string,
  categories: string[],
  series: PptSeries[],
  unit: Unit,
  format?: (value: number) => string,
): PptChart {
  // TrendChart convention: the first series is the emphasised headline one.
  const styled = series.map((item, index) => ({ ...item, emphasis: item.emphasis ?? index === 0 }));
  const first = styled[0]?.values.at(-1);

  return {
    kind: "line",
    title,
    categories,
    series: styled,
    axisFormat: axisFormat(unit, styled.flatMap((item) => item.values)),
    lastLabel: format && first != null ? format(first) : undefined,
  };
}

function donut(title: string, items: RankedItem[]): PptChart {
  const visible = items.slice(0, 8);

  return {
    kind: "donut",
    title,
    categories: visible.map((item) => `${item.label} (${formatPercent(item.share)})`),
    values: visible.map((item) => item.value),
    colors: visible.map((_, index) => palette[index % palette.length]),
  };
}

function share(part: number, whole: number) {
  return whole ? part / whole : 0;
}

function changeText(current: number, previous: number) {
  if (!previous) return null;
  const change = (current - previous) / Math.abs(previous);
  // Very large jumps read better as a multiple than as "naik 4.739%".
  if (change >= 1 && previous > 0) return `naik ${(current / previous).toLocaleString("id-ID", { maximumFractionDigits: 1 })}x lipat`;
  const word = change > 0.0005 ? "naik" : change < -0.0005 ? "turun" : "stabil";
  return word === "stabil" ? "stabil" : `${word} ${formatPercent(Math.abs(change))}`;
}

function sumShare(items: { value: number }[], count: number, whole: number) {
  return share(items.slice(0, count).reduce((sum, item) => sum + item.value, 0), whole);
}

function compact<T>(items: (T | null | undefined | false)[]): T[] {
  return items.filter((item): item is T => Boolean(item));
}

function aiParagraph(text: string | undefined) {
  const trimmed = text?.trim();
  return trimmed ? trimmed : undefined;
}

function aiOrRule(ai: string[] | undefined, rule: string[]) {
  const cleaned = (ai ?? []).map((item) => item.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.slice(0, 5) : rule.slice(0, 5);
}

// ── Export deck ─────────────────────────────────────────────────────────────

const AGING_OVER_90 = new Set(["91-120", "> 120", ">120"]);

export function buildExportPptSpec(
  dashboard: Pick<ExportDashboardPayload, "records" | "kpi">,
  narrative: Narrative | null,
  theme: "black" | "light",
): PptSpec {
  const records = dashboard.records as ExportViewRecord[];
  const kpi = dashboard.kpi;
  const usd = (record: ExportViewRecord) => record.usdValue;
  const ton = (record: ExportViewRecord) => record.tonnage;

  const monthly = monthlyPoints(records);
  const paid = records.filter(isPaid);
  const open = records.filter((record) => !isPaid(record));
  const totalSales = total(records, usd);
  const totalTon = total(records, ton);
  const totalPaid = total(paid, usd);
  const totalOpen = total(open, usd);

  const companies = rankRecords(records, (record) => record.companyCode, usd);
  const companiesAll = rankRecords(records, (record) => record.companyCode, usd, Infinity);
  const destinationsTop6 = rankRecords(records, (record) => record.destination, usd, 6);
  const destinationsAll = rankRecords(records, (record) => record.destination, usd, Infinity);
  const destinationsByTon = rankRecords(records, (record) => record.destination, ton, 10);
  const products = rankRecords(records, (record) => record.product, ton, 6);
  const productsAll = rankRecords(records, (record) => record.product, ton, Infinity);
  const buyers = rankRecords(records, (record) => record.buyer, usd, 7);
  const buyersAll = rankRecords(records, (record) => record.buyer, usd, Infinity);
  const openByCompany = rankRecords(open, (record) => record.companyCode, usd);
  const aging = rankRecords(open, (record) => record.agingBucket, usd, 8);
  const agingOver90 = aging.filter((item) => AGING_OVER_90.has(item.label.replace(/\s+/g, " ").trim())).reduce((sum, item) => sum + item.value, 0);
  const byYear = rankRecords(records, (record) => record.periodKey.slice(0, 4), usd, 10).sort((left, right) => left.label.localeCompare(right.label));

  const first = monthly[0]?.label;
  const last = monthly.at(-1)?.label;
  const periodText = first && last ? (first === last ? first : `${first} – ${last}`) : "-";
  const monthLabels = monthly.map((point) => point.label);

  const latest = monthly.at(-1);
  const previous = monthly.at(-2);
  const peak = monthly.reduce<(typeof monthly)[number] | undefined>((best, point) => (!best || point.sales > best.sales ? point : best), undefined);

  const topCompanyBullet = companies[0]
    ? `${companies[0].label} kontributor terbesar dengan ${formatUsd(companies[0].value)} (${formatPercent(share(companies[0].value, totalSales))} dari total penjualan)${companiesAll.length > 1 ? `; ${companiesAll.length} entitas tercatat mengekspor` : ""}.`
    : null;

  // ── Overview
  const overviewKpis: PptKpi[] = [
    { label: "Total Penjualan", value: formatUsd(totalSales), sub: `${formatNumber(records.length)} transaksi` },
    { label: "Total Tonase", value: formatTonnage(totalTon) },
    { label: "Penerimaan", value: formatUsd(totalPaid), sub: `${formatPercent(share(totalPaid, totalSales))} dari penjualan` },
    { label: "Piutang Terbuka", value: formatUsd(totalOpen), sub: `${formatNumber(open.length)} transaksi belum lunas` },
  ];

  const overviewBulletsA = compact<string>([
    `Total penjualan ekspor ${periodText} sebesar ${formatUsd(totalSales)} dari ${formatNumber(records.length)} transaksi dengan volume ${formatTonnage(totalTon)}.`,
    `Penerimaan ${formatUsd(totalPaid)} (${formatPercent(share(totalPaid, totalSales))}); piutang terbuka ${formatUsd(totalOpen)} (${formatPercent(share(totalOpen, totalSales))}) pada ${formatNumber(open.length)} transaksi.`,
    latest && previous && changeText(latest.sales, previous.sales)
      ? `Penjualan ${latest.label} ${formatUsd(latest.sales)}, ${changeText(latest.sales, previous.sales)} dibanding ${previous.label}.`
      : null,
    topCompanyBullet,
  ]);

  const overviewBulletsB = compact<string>([
    destinationsAll[0]
      ? `Tujuan terbesar: ${destinationsAll[0].label} dengan ${formatUsd(destinationsAll[0].value)} (${formatPercent(share(destinationsAll[0].value, totalSales))}).`
      : null,
    destinationsAll.length > 3
      ? `3 tujuan teratas menyerap ${formatPercent(sumShare(destinationsAll, 3, totalSales))} nilai ekspor dari ${destinationsAll.length} negara tujuan.`
      : null,
    productsAll[0]
      ? `Produk dengan volume terbesar: ${productsAll[0].label} sebanyak ${formatTonnage(productsAll[0].value)} (${formatPercent(share(productsAll[0].value, totalTon))} dari total tonase).`
      : null,
  ]);

  const slides: PptSlide[] = [];

  // ── RKAP
  const rkapSlides: PptSlide[] = [];
  let rkapSummaryBullet: string | null = null;
  let paymentGapBullet: string | null = null;

  if (kpi) {
    const salesTarget = kpi.months.reduce((sum, month) => sum + month.salesTargetUsd, 0);
    const salesActual = kpi.months.reduce((sum, month) => sum + month.salesActualUsd, 0);
    const paymentTarget = kpi.months.reduce((sum, month) => sum + month.paymentTargetUsd, 0);
    const paymentActual = kpi.months.reduce((sum, month) => sum + month.paymentActualUsd, 0);
    const pctText = (actual: number, target: number) => (target ? `${Math.round((actual / target) * 100)}%` : "-");
    const kpiMonthly = monthly.map((point) => {
      const month = kpi.months.find((item) => item.periodKey === point.key);
      return { ...point, salesTarget: month?.salesTargetUsd ?? 0, paymentTarget: month?.paymentTargetUsd ?? 0 };
    });
    const monthsWithTarget = kpi.months.filter((month) => month.salesTargetUsd > 0 && month.salesActualUsd > 0);
    const salesHit = monthsWithTarget.filter((month) => month.salesActualUsd >= month.salesTargetUsd);
    const weakest = [...monthsWithTarget].sort((left, right) => left.salesActualUsd / left.salesTargetUsd - right.salesActualUsd / right.salesTargetUsd)[0];
    const gap = (actual: number, target: number) =>
      actual >= target ? `melampaui target ${formatUsd(actual - target)}` : `kurang ${formatUsd(target - actual)} dari target`;

    rkapSummaryBullet = salesTarget
      ? `Realisasi penjualan ${formatUsd(salesActual)} = ${pctText(salesActual, salesTarget)} dari target RKAP ${formatUsd(salesTarget)}.`
      : null;
    paymentGapBullet = paymentTarget && paymentActual < paymentTarget
      ? `Kejar sisa target penerimaan KPI 2026 sebesar ${formatUsd(paymentTarget - paymentActual)} (realisasi baru ${pctText(paymentActual, paymentTarget)}).`
      : null;

    rkapSlides.push({
      type: "content",
      title: "RKAP — Target vs Realisasi",
      kpis: [
        { label: "Target Penjualan", value: formatUsd(salesTarget) },
        { label: "Realisasi Penjualan", value: formatUsd(salesActual) },
        { label: "Target Penerimaan", value: formatUsd(paymentTarget) },
        { label: "Realisasi Penerimaan", value: formatUsd(paymentActual) },
        { label: "% Realisasi Penjualan", value: pctText(salesActual, salesTarget) },
        { label: "% Realisasi Penerimaan", value: pctText(paymentActual, paymentTarget) },
        { label: "Actual Tonase", value: formatTonnage(totalTon) },
        { label: "Jumlah Transaksi", value: formatNumber(records.length) },
      ],
      charts: [
        line("Penjualan: Target vs Realisasi Bulanan (USD)", kpiMonthly.map((point) => point.label), [
          { name: "Target", values: kpiMonthly.map((point) => point.salesTarget), color: TURQUOISE },
          { name: "Realisasi", values: kpiMonthly.map((point) => point.sales), color: YELLOW },
        ], "usd"),
        line("Penerimaan: Target vs Realisasi Bulanan (USD)", kpiMonthly.map((point) => point.label), [
          { name: "Target", values: kpiMonthly.map((point) => point.paymentTarget), color: TURQUOISE },
          { name: "Realisasi", values: kpiMonthly.map((point) => point.payment), color: TEAL },
        ], "usd"),
      ],
      bullets: compact<string>([
        salesTarget ? `Penjualan: realisasi ${formatUsd(salesActual)} (${pctText(salesActual, salesTarget)}), ${gap(salesActual, salesTarget)} RKAP.` : null,
        paymentTarget ? `Penerimaan: realisasi ${formatUsd(paymentActual)} (${pctText(paymentActual, paymentTarget)}), ${gap(paymentActual, paymentTarget)}.` : null,
        monthsWithTarget.length > 0
          ? `Target penjualan bulanan tercapai di ${salesHit.length} dari ${monthsWithTarget.length} bulan berjalan${weakest ? `; capaian terendah ${weakest.label} (${pctText(weakest.salesActualUsd, weakest.salesTargetUsd)})` : ""}.`
          : null,
      ]),
    });
  } else {
    rkapSlides.push({
      type: "content",
      title: "RKAP — Actual Penjualan",
      banner: "Workbook tidak memiliki sheet KPI 2026. Grafik di bawah menampilkan actual ekspor dari sheet Data Gab/Data Ekspor; target tidak tersedia.",
      kpis: [
        { label: "Actual Penjualan", value: formatUsd(totalSales) },
        { label: "Actual Tonase", value: formatTonnage(totalTon) },
        { label: "Jumlah Transaksi", value: formatNumber(records.length) },
      ],
      charts: [line("Actual Ekspor Bulanan (USD)", monthLabels, [{ name: "Actual", values: monthly.map((point) => point.sales), color: YELLOW }], "usd", formatUsd)],
      bullets: compact<string>([
        `Actual penjualan ${periodText}: ${formatUsd(totalSales)} (${formatTonnage(totalTon)}).`,
        peak ? `Penjualan bulanan tertinggi pada ${peak.label}: ${formatUsd(peak.sales)}.` : null,
        "Target RKAP belum dapat dibandingkan karena sheet KPI 2026 tidak tersedia.",
      ]),
    });
  }

  const yearLast = byYear.at(-1);
  const yearPrev = byYear.at(-2);
  rkapSlides.push({
    type: "content",
    title: "RKAP — Actual per Tahun & Company",
    charts: [
      hbar("Actual Penjualan per Tahun (USD)", byYear, formatUsd, kpi ? "yellow" : "turquoise"),
      hbar("Actual Penjualan per Company (USD)", companies, formatUsd),
    ],
    bullets: compact<string>([
      yearLast && yearPrev && changeText(yearLast.value, yearPrev.value)
        ? `Penjualan ${yearLast.label} ${formatUsd(yearLast.value)}, ${changeText(yearLast.value, yearPrev.value)} dibanding ${yearPrev.label}${last && !last.startsWith("Des") && last.endsWith(yearLast.label) ? ` (data ${yearLast.label} baru s.d. ${last})` : ""}.`
        : yearLast
          ? `Penjualan ${yearLast.label}: ${formatUsd(yearLast.value)}.`
          : null,
      topCompanyBullet,
      companiesAll.length > 3 ? `3 company teratas menyumbang ${formatPercent(sumShare(companiesAll, 3, totalSales))} penjualan.` : null,
    ]),
  });

  // ── Tren Ekspor
  const tonPeak = monthly.reduce<(typeof monthly)[number] | undefined>((best, point) => (!best || point.tonnage > best.tonnage ? point : best), undefined);
  const trendSlides: PptSlide[] = [
    {
      type: "content",
      title: "TREN EKSPOR — Nilai & Volume Bulanan",
      kpis: [
        { label: "Penjualan", value: formatUsd(totalSales) },
        { label: "Volume Ekspor", value: formatTonnage(totalTon) },
        { label: "Jumlah Buyer", value: formatNumber(new Set(records.map((record) => record.buyer)).size) },
        { label: "Jumlah Kapal", value: formatNumber(new Set(records.map((record) => record.vesselName)).size) },
      ],
      charts: [
        line("Tren Nilai Ekspor Bulanan (USD)", monthLabels, [{ name: "Nilai Ekspor", values: monthly.map((point) => point.sales), color: YELLOW }], "usd", formatUsd),
        line("Tren Volume Ekspor Bulanan (MT)", monthLabels, [{ name: "Tonase", values: monthly.map((point) => point.tonnage), color: TEAL }], "ton", formatTonnage),
      ],
      bullets: compact<string>([
        latest && previous && changeText(latest.sales, previous.sales)
          ? `Nilai ekspor ${latest.label} ${formatUsd(latest.sales)}, ${changeText(latest.sales, previous.sales)} vs ${previous.label}; volume ${changeText(latest.tonnage, previous.tonnage) ?? "-"} (${formatTonnage(latest.tonnage)}).`
          : null,
        peak ? `Nilai bulanan tertinggi pada ${peak.label} (${formatUsd(peak.sales)})${tonPeak ? `, volume tertinggi pada ${tonPeak.label} (${formatTonnage(tonPeak.tonnage)})` : ""}.` : null,
        totalTon ? `Rata-rata nilai ekspor USD ${(totalSales / totalTon).toLocaleString("id-ID", { maximumFractionDigits: 1 })} per MT.` : null,
      ]),
    },
    {
      type: "content",
      title: "TREN EKSPOR — Produk & Kontribusi Company",
      charts: [
        hbar("Tren Produk berdasarkan Volume (MT)", products, formatTonnage, "yellow"),
        hbar("Kontribusi Company (USD)", companies, formatUsd),
      ],
      bullets: compact<string>([
        productsAll[0] ? `${productsAll[0].label} mendominasi volume: ${formatTonnage(productsAll[0].value)} (${formatPercent(share(productsAll[0].value, totalTon))}).` : null,
        productsAll[1] ? `Disusul ${productsAll[1].label} (${formatTonnage(productsAll[1].value)}, ${formatPercent(share(productsAll[1].value, totalTon))}).` : null,
        topCompanyBullet,
      ]),
    },
  ];

  // ── Tujuan Ekspor
  const destinationSlides: PptSlide[] = [
    {
      type: "content",
      title: "TUJUAN EKSPOR — Nilai & Volume",
      kpis: [
        { label: "Jumlah Tujuan", value: formatNumber(new Set(records.map((record) => record.destination)).size) },
        { label: "Nilai Ekspor", value: formatUsd(totalSales) },
        { label: "Volume Ekspor", value: formatTonnage(totalTon) },
        { label: "Top Tujuan", value: destinationsAll[0]?.label ?? "-" },
      ],
      charts: [
        hbar("Tujuan Ekspor berdasarkan Nilai (USD)", rankRecords(records, (record) => record.destination, usd, 10), formatUsd, "coral"),
        hbar("Tujuan Ekspor berdasarkan Volume (MT)", destinationsByTon, formatTonnage, "teal"),
      ],
      bullets: compact<string>([
        destinationsAll[0] ? `${destinationsAll[0].label} tujuan utama: ${formatUsd(destinationsAll[0].value)} (${formatPercent(share(destinationsAll[0].value, totalSales))} nilai ekspor).` : null,
        destinationsAll.length > 3 ? `Konsentrasi pasar: 3 negara teratas = ${formatPercent(sumShare(destinationsAll, 3, totalSales))} dari ${destinationsAll.length} tujuan.` : null,
        destinationsByTon[0] && destinationsByTon[0].label !== destinationsAll[0]?.label
          ? `Berdasarkan volume, ${destinationsByTon[0].label} terbesar (${formatTonnage(destinationsByTon[0].value)}).`
          : null,
      ]),
    },
    {
      type: "content",
      title: "TUJUAN EKSPOR — Buyer & Produk",
      charts: [
        hbar("Buyer Ekspor Terbesar (USD)", buyers, formatUsd),
        hbar("Produk per Tujuan (MT)", rankRecords(records, (record) => record.product, ton, 7), formatTonnage, "yellow"),
      ],
      bullets: compact<string>([
        buyersAll[0] ? `Buyer terbesar: ${buyersAll[0].label} (${formatUsd(buyersAll[0].value)}, ${formatPercent(share(buyersAll[0].value, totalSales))}).` : null,
        buyersAll.length > 5 ? `5 buyer teratas menyumbang ${formatPercent(sumShare(buyersAll, 5, totalSales))} dari ${buyersAll.length} buyer.` : null,
        productsAll[0] ? `Produk utama yang dikirim: ${productsAll[0].label} (${formatTonnage(productsAll[0].value)}).` : null,
      ]),
    },
  ];

  // ── Prognosa
  const planned = open.filter((record) => record.plannedPaymentDate);
  const unplanned = open.filter((record) => !record.plannedPaymentDate);
  const plannedTotal = total(planned, usd);
  const unplannedTotal = total(unplanned, usd);
  const agingBullet = totalOpen
    ? `Piutang umur >90 hari ${formatUsd(agingOver90)} (${formatPercent(share(agingOver90, totalOpen))} dari piutang terbuka)${aging[0] ? `; bucket terbesar ${aging[0].label} (${formatUsd(aging[0].value)})` : ""}.`
    : "Tidak ada piutang terbuka.";
  const openCompanyBullet = openByCompany[0]
    ? `Piutang terbuka terbesar di ${openByCompany[0].label}: ${formatUsd(openByCompany[0].value)} (${formatPercent(share(openByCompany[0].value, totalOpen))}).`
    : null;

  const forecastSlides: PptSlide[] = [];
  if (kpi) {
    const paymentTarget = kpi.months.reduce((sum, month) => sum + month.paymentTargetUsd, 0);
    const paymentActual = kpi.months.reduce((sum, month) => sum + month.paymentActualUsd, 0);
    const remaining = Math.max(0, paymentTarget - paymentActual);
    forecastSlides.push(
      {
        type: "content",
        title: "PROGNOSA — Target vs Realisasi Penerimaan",
        kpis: [
          { label: "Target Penerimaan (KPI 2026)", value: formatUsd(paymentTarget) },
          { label: "Realisasi Penerimaan", value: formatUsd(paymentActual) },
          { label: "Sisa Target Penerimaan", value: formatUsd(remaining) },
          { label: "Piutang Terbuka", value: formatUsd(totalOpen) },
        ],
        charts: [
          line("Prognosa Penerimaan: Target vs Realisasi Bulanan (USD)", kpi.months.map((month) => month.label), [
            { name: "Target", values: kpi.months.map((month) => month.paymentTargetUsd), color: TURQUOISE },
            { name: "Realisasi", values: kpi.months.map((month) => month.paymentActualUsd), color: TEAL },
          ], "usd"),
        ],
        bullets: compact<string>([
          paymentTarget ? `Realisasi penerimaan ${formatUsd(paymentActual)} = ${formatPercent(share(paymentActual, paymentTarget))} dari target ${formatUsd(paymentTarget)}.` : null,
          remaining > 0 ? `Sisa target ${formatUsd(remaining)}; piutang terbuka ${formatUsd(totalOpen)} ${totalOpen >= remaining ? "cukup untuk menutup" : "belum cukup menutup"} sisa target bila tertagih.` : "Target penerimaan sudah tercapai.",
        ]),
      },
      {
        type: "content",
        title: "PROGNOSA — Piutang Terbuka",
        charts: [
          hbar("Piutang Terbuka per Company (USD)", openByCompany, formatUsd),
          hbar("Aging Piutang Terbuka (USD)", aging, formatUsd, "coral"),
        ],
        bullets: compact<string>([openCompanyBullet, agingBullet]),
      },
    );
  } else {
    const plannedByMonth = rankRecords(planned, (record) => record.plannedPaymentDate?.slice(0, 7) ?? "Tanpa Rencana", usd, 12)
      .sort((left, right) => left.label.localeCompare(right.label));
    forecastSlides.push(
      {
        type: "content",
        title: "PROGNOSA — Rencana Penerimaan",
        banner: "Workbook tidak memiliki sheet KPI 2026. Prognosa di bawah dihitung dari kolom Rencana Bayar pada sheet detail; target penerimaan tidak tersedia.",
        kpis: [
          { label: "Piutang Terbuka", value: formatUsd(totalOpen) },
          { label: "Sudah Ada Rencana Bayar", value: formatUsd(plannedTotal) },
          { label: "Belum Ada Rencana Bayar", value: formatUsd(unplannedTotal) },
          { label: "Invoice Terbuka", value: formatNumber(open.length) },
        ],
        charts: [
          hbar("Prognosa Penerimaan berdasarkan Rencana Bayar (USD)", plannedByMonth, formatUsd),
          hbar("Aging Piutang Terbuka (USD)", aging, formatUsd),
        ],
        bullets: compact<string>([
          totalOpen ? `${formatPercent(share(plannedTotal, totalOpen))} piutang terbuka (${formatUsd(plannedTotal)}) sudah memiliki rencana bayar.` : null,
          plannedByMonth[0] ? `Penerimaan terjadwal paling awal: ${plannedByMonth[0].label} sebesar ${formatUsd(plannedByMonth[0].value)}.` : null,
          agingBullet,
        ]),
      },
      {
        type: "content",
        title: "PROGNOSA — Piutang Terbuka per Company",
        charts: [hbar("Piutang Terbuka per Company (USD)", openByCompany, formatUsd)],
        bullets: compact<string>([openCompanyBullet, `Total ${formatNumber(open.length)} invoice terbuka senilai ${formatUsd(totalOpen)}.`]),
      },
    );
  }

  // ── Demurrage (exchange-rate impact only; the workbook has no demurrage columns)
  const withImpact = records.filter((record) => record.exchangeImpact !== 0);
  const impact = (record: ExportViewRecord) => record.exchangeImpact;
  const impactTotal = total(withImpact, impact);
  const impactCompany = rankRecords(withImpact, (record) => record.companyCode, impact);
  const impactBuyer = rankRecords(withImpact, (record) => record.buyer, impact, 8);
  const demurrageSlide: PptSlide = {
    type: "content",
    title: "DEMURRAGE - DESPATCH SIG GROUP",
    banner: "Workbook tidak memiliki kolom demurrage/despatch. Agar tetap berguna tanpa membuat angka palsu, visual di bawah hanya menampilkan data selisih kurs yang memang tersedia.",
    kpis: [
      { label: "Dampak Selisih Kurs", value: formatIdr(impactTotal) },
      { label: "Transaksi dengan Selisih", value: formatNumber(withImpact.length) },
      { label: "Company Terdampak", value: formatNumber(new Set(withImpact.map((record) => record.companyCode)).size) },
    ],
    charts: [
      hbar("Dampak Selisih Kurs per Company (IDR)", impactCompany, formatIdr),
      hbar("Dampak Selisih Kurs per Buyer (IDR)", impactBuyer, formatIdr, "coral"),
    ],
    bullets: compact<string>([
      withImpact.length
        ? `Net dampak selisih kurs ${formatIdr(impactTotal)} dari ${formatNumber(withImpact.length)} transaksi (${formatPercent(share(withImpact.length, records.length))} dari seluruh transaksi).`
        : "Tidak ada transaksi dengan selisih kurs.",
      impactCompany[0] ? `Dampak terbesar di ${impactCompany[0].label}: ${formatIdr(impactCompany[0].value)}.` : null,
      impactBuyer[0] ? `Buyer dengan dampak terbesar: ${impactBuyer[0].label} (${formatIdr(impactBuyer[0].value)}).` : null,
    ]),
  };

  // ── Summary & conclusion
  const ruleSummary = compact<string>([overviewBulletsA[0], overviewBulletsA[1], rkapSummaryBullet, overviewBulletsB[0], agingBullet]);
  const followUps = compact<string>([
    totalOpen && openByCompany[0]
      ? `Prioritaskan penagihan piutang terbuka ${formatUsd(totalOpen)}, terutama ${openByCompany[0].label} (${formatUsd(openByCompany[0].value)}).`
      : null,
    agingOver90 > 0 ? `Eskalasi piutang umur >90 hari senilai ${formatUsd(agingOver90)}.` : null,
    paymentGapBullet,
    unplannedTotal > 0 ? `Lengkapi Rencana Bayar untuk ${formatUsd(unplannedTotal)} piutang yang belum terjadwal.` : null,
    destinationsAll.length > 3 && sumShare(destinationsAll, 3, totalSales) > 0.6
      ? `Pertimbangkan diversifikasi pasar: ${formatPercent(sumShare(destinationsAll, 3, totalSales))} nilai ekspor terkonsentrasi di 3 negara.`
      : null,
  ]);

  slides.push(
    {
      type: "title",
      title: `LAPORAN KINERJA EKSPOR\n${last ?? ""}`.trim(),
      subtitle: `UNIT of COMMERCIAL FINANCE 2  |  Periode ${periodText}  |  ${formatNumber(records.length)} transaksi`,
    },
    {
      type: "summary",
      title: "RINGKASAN EKSEKUTIF",
      kpis: overviewKpis,
      paragraph: aiParagraph(narrative?.executiveSummary),
      bulletsTitle: "POIN UTAMA",
      bullets: aiOrRule(narrative?.insights, ruleSummary),
    },
    {
      type: "content",
      title: "OVERVIEW — Ringkasan Kinerja Ekspor",
      kpis: overviewKpis,
      charts: [
        line("Tren Penjualan, Penerimaan, dan Piutang (USD)", monthLabels, [
          { name: "Penjualan", values: monthly.map((point) => point.sales), color: YELLOW },
          { name: "Penerimaan", values: monthly.map((point) => point.payment), color: TEAL },
          { name: "Piutang", values: monthly.map((point) => point.outstanding), color: CORAL },
        ], "usd"),
        hbar("Penjualan per Operating Company (USD)", companies, formatUsd),
      ],
      bullets: overviewBulletsA,
    },
    {
      type: "content",
      title: "OVERVIEW — Tujuan & Produk Ekspor",
      charts: [
        hbar("Tujuan Ekspor Terbesar (USD)", destinationsTop6, formatUsd, "coral"),
        hbar("Produk Ekspor (MT)", products, formatTonnage, "yellow"),
      ],
      bullets: overviewBulletsB,
    },
    ...rkapSlides,
    ...trendSlides,
    ...destinationSlides,
    ...forecastSlides,
    demurrageSlide,
    {
      type: "summary",
      title: "KESIMPULAN & TINDAK LANJUT",
      paragraph: aiParagraph(narrative?.conclusion),
      bulletsTitle: "REKOMENDASI TINDAK LANJUT",
      bullets: followUps.length > 0 ? followUps : ["Kinerja ekspor sesuai rencana; lanjutkan pemantauan bulanan."],
    },
    { type: "end" },
  );

  return { theme, slides };
}

// ── Invoice / Payment deck ──────────────────────────────────────────────────

export function buildReportPptSpec(
  role: WorkbookRole,
  filterLabel: string,
  section: DashboardSection,
  narrative: Narrative | null,
): PptSpec {
  const isInvoice = role === "invoice";
  const roleLabel = isInvoice ? "Invoice" : "Payment";
  const fc = (value: number) => formatCurrency(value, true);
  const totalAmount = section.totalAmount;
  const primaryShare = isInvoice ? itemByLabel(section.statusMix, "Bucket 4")?.share ?? 0 : itemByLabel(section.statusMix, "No Risk")?.share ?? 0;
  const groupShare = itemByLabel(section.customerTypes, "Group")?.share ?? 0;
  const externalShare = itemByLabel(section.customerTypes, "External")?.share ?? 0;

  // Same KPI cards as components/dashboard/report-frame.tsx.
  const kpis: PptKpi[] = isInvoice
    ? [
        { label: "Total Outstanding", value: fc(totalAmount) },
        { label: "Total Invoice", value: formatNumber(section.rowCount) },
        { label: "Average Piutang / Bulan", value: fc(monthlyAverage(section)) },
        { label: "% Bucket 4 (>365)", value: formatPercent(primaryShare) },
        { label: "Piutang by Customer Type", value: `Group ${formatPercent(groupShare)}`, sub: `External ${formatPercent(externalShare)}` },
      ]
    : [
        { label: "Total Payment", value: fc(totalAmount) },
        { label: "Total Invoice", value: formatNumber(section.rowCount) },
        { label: "Average Payment", value: fc(section.averageAmount) },
        { label: "% Current (<30 Day)", value: formatPercent(primaryShare) },
      ];

  const topCustomer = section.topCustomers[0];
  const topCustomerBullet = topCustomer
    ? `${topCustomer.label} ${isInvoice ? "memiliki piutang" : "membayar"} terbesar: ${fc(topCustomer.value)} (${formatPercent(topCustomer.share)}); 3 customer teratas = ${formatPercent(sumShare(section.topCustomers, 3, totalAmount))}.`
    : null;
  const topInvoiceType = section.invoiceTypes[0];
  const bucket4 = itemByLabel(section.statusMix, "Bucket 4");
  const current = itemByLabel(section.statusMix, "Current");
  const highRisk = section.statusMix.filter((item) => item.label.toLowerCase().startsWith("high risk"));
  const highRiskValue = highRisk.reduce((sum, item) => sum + item.value, 0);

  const overviewBullets = compact<string>(
    isInvoice
      ? [
          `Total outstanding ${fc(totalAmount)} dari ${formatNumber(section.rowCount)} invoice; rata-rata ${fc(monthlyAverage(section))} per bulan (periode terakhir ${section.latestPeriod}).`,
          current || bucket4
            ? `Aging: Current ${formatPercent(current?.share ?? 0)} (${fc(current?.value ?? 0)}), Bucket 4 (>365 hari) ${formatPercent(bucket4?.share ?? 0)} (${fc(bucket4?.value ?? 0)}).`
            : null,
          topCustomerBullet,
          topInvoiceType ? `Tipe invoice dominan: ${topInvoiceType.label} (${formatPercent(topInvoiceType.share)}).` : null,
        ]
      : [
          `Total pembayaran ${fc(totalAmount)} dari ${formatNumber(section.rowCount)} invoice; rata-rata ${fc(section.averageAmount)} per invoice.`,
          `${formatPercent(primaryShare)} pembayaran berstatus No Risk (<30 hari)${highRiskValue ? `; High Risk ${formatPercent(share(highRiskValue, totalAmount))} (${fc(highRiskValue)})` : ""}.`,
          topCustomerBullet,
        ],
  );

  // Row 1 charts, as on the web.
  const row1Charts: PptChart[] = isInvoice
    ? [
        donut("Outstanding Aging by Bucket", section.statusMix),
        hbar("Top Customers by Outstanding", section.topCustomers.slice(0, 6), fc, "coral"),
        donut("Outstanding by Invoice Type", section.invoiceTypes),
      ]
    : [
        hbar("Payment Aging by Risk", section.statusMix.slice(0, 7), fc),
        hbar("Top Customers by Payment", section.topCustomers.slice(0, 5), fc),
        donut("Payment Risk Composition", section.statusMix),
      ];

  // Trend (web default MoM mode: current vs same month last year).
  const trend = periodTrendPoints(section, "mom");
  const hasCompare = trend.some((point) => point.compareValue != null);
  const trendSeries: PptSeries[] = [
    { name: "Saat ini", values: trend.map((point) => point.value), color: TURQUOISE },
    ...(hasCompare ? [{ name: "Tahun lalu", values: trend.map((point) => point.compareValue ?? null), color: CORAL, dashed: true }] : []),
  ];
  const trendLatest = trend.at(-1);
  const trendPrev = trend.at(-2);
  const trendPeak = trend.reduce<(typeof trend)[number] | undefined>((best, point) => (!best || point.value > best.value ? point : best), undefined);
  const noun = isInvoice ? "Outstanding" : "Pembayaran";
  const trendBullets = compact<string>([
    trendLatest && trendLatest.compareValue
      ? `${noun} ${trendLatest.label} ${fc(trendLatest.value)}, ${changeText(trendLatest.value, trendLatest.compareValue)} dibanding bulan yang sama tahun lalu (${fc(trendLatest.compareValue)}).`
      : null,
    trendLatest && trendPrev && changeText(trendLatest.value, trendPrev.value)
      ? `Dibanding ${trendPrev.label}, ${noun.toLowerCase()} ${trendLatest.label} ${changeText(trendLatest.value, trendPrev.value)}.`
      : null,
    trendPeak ? `Nilai tertinggi dalam 12 bulan terakhir pada ${trendPeak.label} (${fc(trendPeak.value)}).` : null,
  ]);

  const slides: PptSlide[] = [
    {
      type: "title",
      title: `LAPORAN MONITORING ${roleLabel.toUpperCase()}\n${filterLabel}`,
      subtitle: `UNIT of COMMERCIAL FINANCE 2  |  Periode terakhir ${section.latestPeriod}  |  ${formatNumber(section.rowCount)} invoice`,
    },
    {
      type: "summary",
      title: "RINGKASAN EKSEKUTIF",
      kpis,
      paragraph: aiParagraph(narrative?.executiveSummary),
      bulletsTitle: "POIN UTAMA",
      bullets: aiOrRule(narrative?.insights, [...overviewBullets, ...trendBullets.slice(0, 1)]),
    },
    {
      type: "content",
      title: `${roleLabel} ${filterLabel} — Ringkasan`,
      kpis,
      charts: row1Charts,
      bullets: overviewBullets,
    },
  ];

  const followUps: string[] = [];

  if (isInvoice) {
    slides.push({
      type: "content",
      title: `${roleLabel} ${filterLabel} — Outstanding Trend`,
      charts: [line("Outstanding Trend", trend.map((point) => point.label), trendSeries, "idr", fc)],
      bullets: trendBullets,
    });
    if (bucket4?.value) followUps.push(`Prioritaskan penagihan piutang Bucket 4 (>365 hari) senilai ${fc(bucket4.value)} (${formatPercent(bucket4.share)}).`);
    if (topCustomer) followUps.push(`Fokuskan penagihan pada ${topCustomer.label} dengan outstanding ${fc(topCustomer.value)}.`);
    if (trendLatest?.compareValue && trendLatest.value > trendLatest.compareValue) {
      followUps.push(`Outstanding ${trendLatest.label} lebih tinggi dari tahun lalu (${changeText(trendLatest.value, trendLatest.compareValue)}); perketat monitoring penagihan.`);
    }
  } else {
    const movement = paymentMovementSummary(section);
    const targets = paymentTargetPoints(section);
    const latestKey = (section.records ?? []).map((record) => record.periodKey ?? "").filter(Boolean).sort().at(-1);
    const latestMonth = latestKey ? Number(latestKey.slice(5, 7)) : 0;
    const ytdTargets = targets.slice(0, latestMonth);
    const ytdTarget = ytdTargets.reduce((sum, point) => sum + point.target, 0);
    const ytdReal = ytdTargets.reduce((sum, point) => sum + point.realization, 0);
    const monthsHit = ytdTargets.filter((point) => point.realization >= point.target).length;
    const worst = [...ytdTargets].sort((left, right) => left.variance - right.variance)[0];
    const yearTarget = targets.reduce((sum, point) => sum + point.target, 0);
    const yearReal = targets.reduce((sum, point) => sum + point.realization, 0);

    slides.push(
      {
        type: "content",
        title: `${roleLabel} ${filterLabel} — Payment Trend`,
        kpis: [
          { label: "MoM", value: formatDeltaPercent(movement.mom), sub: movement.label },
          { label: "YoY", value: formatDeltaPercent(movement.yoy), sub: movement.label },
          { label: "YTD", value: formatDeltaPercent(movement.ytd), sub: `s.d. ${movement.label}` },
        ],
        charts: [line("Payment Trend", trend.map((point) => point.label), trendSeries, "idr", fc)],
        bullets: compact<string>([
          movement.label !== "-"
            ? `Pergerakan ${movement.label}: MoM ${formatDeltaPercent(movement.mom)}, YoY ${formatDeltaPercent(movement.yoy)}, YTD ${formatDeltaPercent(movement.ytd)}.`
            : null,
          ...trendBullets,
        ]).slice(0, 4),
      },
      {
        type: "content",
        title: `${roleLabel} ${filterLabel} — Target vs Realisasi`,
        charts: [
          hbar("AR Persentase From Target", targets.map((point) => ({ label: point.month, value: point.variance })), formatDeltaPercent, "teal"),
          {
            kind: "groupedHbar",
            title: "Target VS Realisasi",
            categories: targets.map((point) => point.month),
            series: [
              { name: "Target", values: targets.map((point) => point.target), color: YELLOW },
              { name: "Realisasi", values: targets.map((point) => point.realization), color: TURQUOISE },
            ],
            axisFormat: axisFormat("idr", targets.flatMap((point) => [point.target, point.realization])),
          },
        ],
        bullets: compact<string>([
          ytdTarget ? `Realisasi s.d. ${movement.label} ${fc(ytdReal)} = ${formatPercent(share(ytdReal, ytdTarget))} dari target periode yang sama (${fc(ytdTarget)}).` : null,
          ytdTargets.length ? `Target bulanan tercapai di ${monthsHit} dari ${ytdTargets.length} bulan${worst ? `; deviasi terbesar ${worst.month} (${formatDeltaPercent(worst.variance)})` : ""}.` : null,
          yearTarget ? `Sisa target setahun: ${fc(Math.max(0, yearTarget - yearReal))} dari total target ${fc(yearTarget)}.` : null,
        ]),
      },
    );
    if (highRiskValue) followUps.push(`Tindak lanjuti pembayaran berstatus High Risk senilai ${fc(highRiskValue)} (${formatPercent(share(highRiskValue, totalAmount))}).`);
    if (ytdTarget && ytdReal < ytdTarget) followUps.push(`Kejar selisih target penerimaan s.d. ${movement.label} sebesar ${fc(ytdTarget - ytdReal)}.`);
    if (yearTarget && yearReal < yearTarget) followUps.push(`Sisa target penerimaan setahun ${fc(yearTarget - yearReal)} perlu dijadwalkan per customer.`);
  }

  slides.push(
    {
      type: "summary",
      title: "KESIMPULAN & TINDAK LANJUT",
      paragraph: aiParagraph(narrative?.conclusion),
      bulletsTitle: "REKOMENDASI TINDAK LANJUT",
      bullets: followUps.length > 0 ? followUps : ["Tidak ada isu menonjol; lanjutkan pemantauan bulanan."],
    },
    { type: "end" },
  );

  return { theme: "black", slides };
}

