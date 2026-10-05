import "server-only";

import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import type { PptChart, PptKpi, PptSlide, PptSpec } from "@/lib/ppt-spec";

// ---------------------------------------------------------------------------
// Draws a slide spec (lib/ppt-spec.ts) as a .pptx, in pure JS so it also runs
// on Vercel's Node runtime (no Python there).
//
// pptxgenjs cannot open the SIG .pptx templates, so their layouts are baked
// into background images (lib/ppt-templates/bg, exported from
// lib/ppt-templates/sig-*.pptx) and used as slide masters.
// ---------------------------------------------------------------------------

type Theme = PptSpec["theme"];
type Slide = ReturnType<PptxGenJS["addSlide"]>;

const FONT = "SIG Text";
const BG_DIR = path.join(process.cwd(), "lib", "ppt-templates", "bg");

// Web palette (components/charts/colors.ts). Content slides are light in both
// templates, so body styling is shared; only the title slide text differs.
const TEAL = "174D55";
const TURQUOISE = "4ECDC4";
const MINT = "F7FFF7";
const WHITE = "FFFFFF";
const TEXT = "0F172A";
const MUTED = "4E8088";
const BORDER = "C9E4E1";
const GRID = "E3EEED";
const BANNER_FILL = "FFF8D6";
const BANNER_LINE = "FFE66D";

const TITLE_TEXT: Record<Theme, { title: string; subtitle: string }> = {
  black: { title: "F5F7FA", subtitle: "CBD5E1" },
  light: { title: "0F172A", subtitle: "475569" },
};

// Content area of the template's "Title Only" layout (inches): below the
// title, above the footer.
const LEFT = 0.5;
const RIGHT = 12.83;
const TOP = 1.45;
const BOTTOM = 6.85;
const GAP = 0.15;

const hex = (color: string) => color.replace("#", "").toUpperCase();

function backgroundData(theme: Theme, name: "title" | "content" | "end") {
  const file = fs.readdirSync(BG_DIR).find((entry) => entry.startsWith(`${theme}-${name}.`));
  if (!file) throw new Error(`Background PPT ${theme}-${name} tidak ditemukan.`);
  const mime = file.endsWith(".png") ? "image/png" : "image/jpeg";
  return `${mime};base64,${fs.readFileSync(path.join(BG_DIR, file)).toString("base64")}`;
}

// ── text / shape helpers ────────────────────────────────────────────────────

type TextOpts = {
  size?: number;
  bold?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
};

function textBox(slide: Slide, text: string, x: number, y: number, w: number, h: number, opts: TextOpts = {}) {
  slide.addText(text, {
    x,
    y,
    w,
    h,
    fontFace: FONT,
    fontSize: opts.size ?? 10,
    bold: opts.bold ?? false,
    color: opts.color ?? TEXT,
    align: opts.align ?? "left",
    valign: opts.valign ?? "top",
    margin: [1.5, 3.5, 1.5, 3.5],
  });
}

function rect(
  pptx: PptxGenJS,
  slide: Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  line?: string,
  rounded = false,
) {
  slide.addShape(rounded ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: fill },
    line: line ? { color: line, width: 0.75 } : { type: "none" },
    ...(rounded ? { rectRadius: 0.08 } : {}),
  });
}

function truncate(label: string, n = 30) {
  return label.length <= n ? label : `${label.slice(0, n - 1)}…`;
}

// ── building blocks ─────────────────────────────────────────────────────────

/** KPI cards like the web's ExportKpi/ReportKpi. Returns the y below them. */
function kpiStrip(pptx: PptxGenJS, slide: Slide, kpis: PptKpi[] | undefined, y: number) {
  if (!kpis?.length) return y;
  const perRow = kpis.length <= 5 ? kpis.length : 4;
  const cardH = kpis.length > 5 ? 0.82 : 0.92;
  const w = (RIGHT - LEFT - GAP * (perRow - 1)) / perRow;

  kpis.forEach((kpi, index) => {
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const x = LEFT + col * (w + GAP);
    const cy = y + row * (cardH + 0.1);
    rect(pptx, slide, x, cy, w, cardH, WHITE, BORDER, true);
    rect(pptx, slide, x + 0.06, cy + 0.14, 0.05, cardH - 0.28, TURQUOISE);
    textBox(slide, kpi.label.toUpperCase(), x + 0.18, cy + 0.06, w - 0.25, 0.25, { size: 8, bold: true, color: MUTED });
    const size = kpi.value.length <= 14 ? 16 : kpi.value.length <= 22 ? 13 : 11;
    textBox(slide, kpi.value, x + 0.18, cy + 0.28, w - 0.25, 0.36, { size, bold: true, color: TEAL });
    if (kpi.sub) textBox(slide, kpi.sub, x + 0.18, cy + cardH - 0.3, w - 0.25, 0.24, { size: 8, color: MUTED });
  });

  const rows = Math.ceil(kpis.length / perRow);
  return y + rows * cardH + (rows - 1) * 0.1 + GAP;
}

function banner(pptx: PptxGenJS, slide: Slide, text: string, y: number) {
  rect(pptx, slide, LEFT, y, RIGHT - LEFT, 0.42, BANNER_FILL, BANNER_LINE);
  textBox(slide, text, LEFT + 0.12, y, RIGHT - LEFT - 0.24, 0.42, { size: 9, color: TEAL, valign: "middle" });
  return y + 0.42 + GAP;
}

/** "Penjelasan" panel: header + bullet list (and an optional paragraph). */
function explainBox(
  pptx: PptxGenJS,
  slide: Slide,
  title: string,
  bullets: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { paragraph?: string; size?: number; spacing?: number } = {},
) {
  rect(pptx, slide, x, y, w, h, MINT, BORDER, true);
  rect(pptx, slide, x, y, w, 0.34, TEAL);
  textBox(slide, title, x + 0.12, y, w - 0.24, 0.34, { size: 9, bold: true, color: WHITE, valign: "middle" });

  const length = (opts.paragraph?.length ?? 0) + bullets.reduce((sum, bullet) => sum + bullet.length, 0);
  const area = w * (h - 0.4);
  const size = opts.size ?? (length < area * 40 ? 11 : length < area * 55 ? 10 : 9);
  const spacing = opts.spacing ?? 6;

  const runs: PptxGenJS.TextProps[] = [];
  if (opts.paragraph) {
    runs.push({ text: opts.paragraph, options: { breakLine: true, paraSpaceAfter: 10 } });
  }
  for (const bullet of bullets) {
    runs.push({ text: bullet, options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: spacing } });
  }
  if (runs.length === 0) return;

  slide.addText(runs, {
    x: x + 0.1,
    y: y + 0.42,
    w: w - 0.2,
    h: h - 0.5,
    fontFace: FONT,
    fontSize: size,
    color: TEXT,
    valign: "top",
    margin: [1.5, 3.5, 1.5, 3.5],
  });
}

/** Chart panel like the web's ChartPanel: teal header bar + white body. */
function panel(pptx: PptxGenJS, slide: Slide, title: string, x: number, y: number, w: number, h: number) {
  rect(pptx, slide, x, y, w, h, WHITE, BORDER);
  rect(pptx, slide, x, y, w, 0.32, TEAL);
  textBox(slide, title.toUpperCase(), x + 0.1, y, w - 0.2, 0.32, { size: 8, bold: true, color: WHITE, valign: "middle" });
  return { x: x + 0.08, y: y + 0.38, w: w - 0.16, h: h - 0.44 };
}

// ── charts ──────────────────────────────────────────────────────────────────

type Box = { x: number; y: number; w: number; h: number };

function baseChartOptions(box: Box): PptxGenJS.IChartOpts {
  return {
    ...box,
    fontFace: FONT,
    showTitle: false,
    catAxisLabelFontFace: FONT,
    catAxisLabelFontSize: 8,
    catAxisLabelColor: TEXT,
    catAxisLineShow: true,
    catAxisLineColor: GRID,
    catGridLine: { style: "none" },
    valAxisLabelFontFace: FONT,
    valAxisLabelFontSize: 7,
    valAxisLabelColor: MUTED,
    valAxisLineShow: false,
    valGridLine: { color: GRID, size: 0.75 },
    legendFontFace: FONT,
    legendFontSize: 8,
    legendColor: TEAL,
  };
}

// The bar/line axis supports "maxMin" (first item on top, like the web) even
// though pptxgenjs only types "minMax".
const REVERSED = "maxMin" as "minMax";

function addHbar(pptx: PptxGenJS, slide: Slide, chart: Extract<PptChart, { kind: "hbar" }>, box: Box) {
  slide.addChart(
    pptx.ChartType.bar,
    [{ name: "Nilai", labels: chart.categories.map((label) => truncate(label)), values: chart.values }],
    {
      ...baseChartOptions(box),
      barDir: "bar",
      barGapWidthPct: 55,
      chartColors: [hex(chart.color)],
      invertedColors: [hex(chart.negativeColor)], // solid negative bars, never hollow
      catAxisOrientation: REVERSED,
      catAxisLabelPos: "low", // keep labels left of negative bars
      valAxisHidden: true,
      valGridLine: { style: "none" },
      showLegend: false,
      showValue: true,
      dataLabelFormatCode: chart.labelFormat,
      dataLabelPosition: "outEnd",
      dataLabelFontFace: FONT,
      dataLabelFontSize: 8,
      dataLabelFontBold: true,
      dataLabelColor: TEAL,
    },
  );
}

function addLine(pptx: PptxGenJS, slide: Slide, chart: Extract<PptChart, { kind: "line" }>, box: Box) {
  const many = chart.categories.length > 18;
  const values = chart.series.flatMap((series) => series.values).filter((value): value is number => value != null);
  const options: PptxGenJS.IChartOpts = {
    ...baseChartOptions(box),
    showLegend: chart.series.length > 1,
    legendPos: "t",
    valAxisLabelFormatCode: chart.axisFormat,
    // Smoothed lines overshoot below zero; pin the axis when nothing is negative.
    ...(values.length > 0 && Math.min(...values) >= 0 ? { valAxisMinVal: 0 } : {}),
  };
  const seriesOptions = (series: (typeof chart.series)[number]): PptxGenJS.IChartOpts => ({
    chartColors: [hex(series.color)],
    lineSize: series.emphasis ? 3 : 2.25,
    lineDash: series.dashed ? "dash" : "solid",
    lineSmooth: true,
    lineDataSymbol: many ? "none" : "circle",
    lineDataSymbolSize: 5,
  });
  const data = (series: (typeof chart.series)[number]) => ({
    name: series.name,
    labels: chart.categories,
    values: series.values as number[],
  });

  if (chart.series.length === 1) {
    slide.addChart(pptx.ChartType.line, [data(chart.series[0])], { ...options, ...seriesOptions(chart.series[0]) });
    return;
  }

  // One line chart per series (sharing axes) so each can have its own width/dash.
  // For multi-type charts pptxgenjs takes the options as the 2nd argument
  // (`data || opt`), which its typings don't model.
  slide.addChart(
    chart.series.map((series) => ({ type: pptx.ChartType.line, data: [data(series)], options: seriesOptions(series) })),
    options as unknown as never[],
  );
}

function addGroupedHbar(pptx: PptxGenJS, slide: Slide, chart: Extract<PptChart, { kind: "groupedHbar" }>, box: Box) {
  slide.addChart(
    pptx.ChartType.bar,
    chart.series.map((series) => ({ name: series.name, labels: chart.categories, values: series.values as number[] })),
    {
      ...baseChartOptions(box),
      barDir: "bar",
      barGrouping: "clustered",
      barGapWidthPct: 45,
      chartColors: chart.series.map((series) => hex(series.color)),
      catAxisOrientation: REVERSED,
      valAxisLabelFormatCode: chart.axisFormat,
      showLegend: true,
      legendPos: "t",
    },
  );
}

function addDonut(pptx: PptxGenJS, slide: Slide, chart: Extract<PptChart, { kind: "donut" }>, box: Box) {
  slide.addChart(
    pptx.ChartType.doughnut,
    [{ name: "Nilai", labels: chart.categories.map((label) => truncate(label, 34)), values: chart.values }],
    {
      ...baseChartOptions(box),
      holeSize: 58,
      chartColors: chart.colors.map(hex),
      dataBorder: { pt: 1, color: WHITE },
      showLegend: true,
      legendPos: "b",
      showValue: false,
      showPercent: false,
      showLabel: false,
    },
  );
}

function chartPanel(pptx: PptxGenJS, slide: Slide, chart: PptChart, x: number, y: number, w: number, h: number) {
  const box = panel(pptx, slide, chart.title, x, y, w, h);
  if (chart.categories.length === 0) {
    textBox(slide, "Tidak ada data", box.x, box.y, box.w, box.h, { color: MUTED, align: "center", valign: "middle" });
    return;
  }
  if (chart.kind === "hbar") addHbar(pptx, slide, chart, box);
  else if (chart.kind === "line") addLine(pptx, slide, chart, box);
  else if (chart.kind === "groupedHbar") addGroupedHbar(pptx, slide, chart, box);
  else addDonut(pptx, slide, chart, box);
}

// ── slides ──────────────────────────────────────────────────────────────────

function contentSlide(pptx: PptxGenJS, title: string) {
  const slide = pptx.addSlide({ masterName: "CONTENT" });
  // Same box as the template's "Title Only" title placeholder.
  textBox(slide, title, 2.81, 0.86, 7.72, 0.46, { size: 18, bold: true, color: TEAL, align: "center", valign: "middle" });
  return slide;
}

function renderTitle(pptx: PptxGenJS, spec: Extract<PptSlide, { type: "title" }>, theme: Theme) {
  const slide = pptx.addSlide({ masterName: "TITLE" });
  textBox(slide, spec.title, 0.73, 2.3, 6.22, 1.65, { size: 30, bold: true, color: TITLE_TEXT[theme].title });
  // Stays left of the template graphic.
  textBox(slide, spec.subtitle, 0.73, 4.05, 5.3, 0.8, { size: 13, color: TITLE_TEXT[theme].subtitle });
}

function renderContent(pptx: PptxGenJS, spec: Extract<PptSlide, { type: "content" }>) {
  const slide = contentSlide(pptx, spec.title);
  let y = TOP;
  if (spec.banner) y = banner(pptx, slide, spec.banner, y);
  y = kpiStrip(pptx, slide, spec.kpis, y);

  const { charts, bullets } = spec;
  const height = BOTTOM - y;

  if (charts.length >= 3) {
    // Three charts side by side, explanation as a strip underneath.
    const explainH = bullets.length ? 0.5 + 0.21 * bullets.length : 0;
    const chartH = height - (bullets.length ? explainH + GAP : 0);
    const w = (RIGHT - LEFT - GAP * (charts.length - 1)) / charts.length;
    charts.forEach((chart, index) => chartPanel(pptx, slide, chart, LEFT + index * (w + GAP), y, w, chartH));
    if (bullets.length) {
      explainBox(pptx, slide, "PENJELASAN", bullets, LEFT, y + chartH + GAP, RIGHT - LEFT, explainH, { size: 9, spacing: 2 });
    }
    return;
  }

  const explainW = bullets.length ? 3.45 : 0;
  const areaW = RIGHT - LEFT - (bullets.length ? explainW + GAP : 0);
  if (charts.length) {
    const w = (areaW - GAP * (charts.length - 1)) / charts.length;
    charts.forEach((chart, index) => chartPanel(pptx, slide, chart, LEFT + index * (w + GAP), y, w, height));
  }
  if (bullets.length) explainBox(pptx, slide, "PENJELASAN", bullets, RIGHT - explainW, y, explainW, height);
}

function renderSummary(pptx: PptxGenJS, spec: Extract<PptSlide, { type: "summary" }>) {
  const slide = contentSlide(pptx, spec.title);
  const y = kpiStrip(pptx, slide, spec.kpis, TOP);
  const height = BOTTOM - y;

  if (spec.paragraph) {
    const w = (RIGHT - LEFT - GAP) / 2;
    explainBox(pptx, slide, "ANALISIS", [], LEFT, y, w, height, { paragraph: spec.paragraph });
    explainBox(pptx, slide, spec.bulletsTitle, spec.bullets, LEFT + w + GAP, y, w, height);
    return;
  }

  // Size the panel to its content instead of leaving a mostly empty box.
  const fit = Math.min(height, 0.75 + 0.5 * Math.max(1, spec.bullets.length));
  explainBox(pptx, slide, spec.bulletsTitle, spec.bullets, LEFT, y, RIGHT - LEFT, fit, {
    size: spec.bullets.length <= 5 ? 13 : 11,
  });
}

export async function renderPpt(spec: PptSpec): Promise<Buffer> {
  const theme: Theme = spec.theme === "light" ? "light" : "black";
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in, same as the SIG templates
  pptx.company = "SIG — Unit of Commercial Finance 2";

  pptx.defineSlideMaster({ title: "TITLE", background: { data: backgroundData(theme, "title") } });
  pptx.defineSlideMaster({ title: "CONTENT", background: { data: backgroundData(theme, "content") } });
  pptx.defineSlideMaster({ title: "END", background: { data: backgroundData(theme, "end") } });

  for (const slide of spec.slides) {
    if (slide.type === "title") renderTitle(pptx, slide, theme);
    else if (slide.type === "content") renderContent(pptx, slide);
    else if (slide.type === "summary") renderSummary(pptx, slide);
    else pptx.addSlide({ masterName: "END" }); // background carries "Terima Kasih"
  }

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
