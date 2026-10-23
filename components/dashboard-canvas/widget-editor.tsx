"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Cancel01Icon, FileImportIcon, HelpCircleIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { ChartThumb } from "@/components/dashboard-canvas/chart-thumbs";
import { SpecWidget } from "@/components/dashboard-canvas/spec-widget";
import { fetchDatasetSource } from "@/components/dashboard-canvas/dataset-loader";
import type { CanvasSource, CanvasSources } from "@/components/dashboard-canvas/canvas-content";
import { ChartTypeIllustration, PickDataIllustration } from "@/components/illustrations";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { seriesColors } from "@/lib/chart-builder/aggregate";
import { chartKinds, describeWidget, recommendChart, timeModeOptions, validateWidget } from "@/lib/chart-builder/assist";
import { datasetSourceId, type DatasetMeta } from "@/lib/chart-builder/datasets";
import { distinctValues } from "@/lib/chart-builder/filters";
import { formatOptions } from "@/lib/chart-builder/format";
import { comparisonHelp } from "@/lib/chart-builder/time-intel";
import type { Aggregation, CardCompute, ChartKind, FieldDef, Measure, PaletteColor, Row, SourceId, WidgetSpec } from "@/lib/chart-builder/types";
import { cardIcons } from "@/components/dashboard-canvas/card-icons";
import type { PageContext } from "@/lib/chart-builder/aggregate";
import { cn } from "@/lib/utils";

const DatasetUpload = dynamic(() => import("@/components/dashboard-canvas/dataset-upload"), { ssr: false });

const swatches: Record<PaletteColor, string> = {
  turquoise: "bg-turquoise",
  coral: "bg-coral",
  sun: "bg-sun",
  teal: "bg-teal",
  mint: "bg-[#A6E6E1]",
  "turquoise-soft": "bg-[#7FDDD6]",
  "coral-soft": "bg-[#FF9C9C]",
  "sun-soft": "bg-[#FFF0A7]",
  slate: "bg-[#4E8088]",
};

const aggregations: { value: Aggregation; label: string }[] = [
  { value: "sum", label: "Total" },
  { value: "avg", label: "Rata-rata" },
  { value: "monthly-avg", label: "Rata-rata per bulan" },
  { value: "count", label: "Jumlah data" },
  { value: "distinct", label: "Jumlah unik" },
  { value: "max", label: "Tertinggi" },
  { value: "min", label: "Terendah" },
];

type Well = "dimension" | "measures" | "breakdown";

const computeOptions: { value: CardCompute; label: string }[] = [
  { value: "value", label: "Nilai (total / perbandingan)" },
  { value: "ratio", label: "Rasio terhadap target (%)" },
  { value: "difference", label: "Selisih: nilai − target" },
  { value: "remaining", label: "Sisa target: target − nilai" },
  { value: "share", label: "Porsi sebagian data (%)" },
  { value: "split", label: "Porsi per kelompok (mis. Group / External)" },
  { value: "top", label: "Kelompok terbesar (nama)" },
];

const specialViews: Record<string, string> = {
  "grouped-bars": "batang berpasangan",
  "variance-bars": "selisih terhadap target",
  movement: "MoM / YoY / YTD",
  "kpi-summary": "ringkasan KPI",
  "kpi-table": "tabel KPI per bulan",
  map: "peta",
};

/** Pick a column and some of its values (for card shares and splits). */
function DimensionValuePicker({
  fields,
  rows,
  field,
  values,
  onChange,
  hint,
}: {
  fields: FieldDef[];
  rows: Row[];
  field?: string;
  values: string[];
  onChange: (field: string, values: string[]) => void;
  hint: string;
}) {
  const options = useMemo(() => (field ? distinctValues(rows, field, 60) : []), [rows, field]);
  return (
    <div className="grid gap-1.5 rounded-lg bg-muted/40 p-2">
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      <Select value={field ?? "__none__"} onValueChange={(value) => value !== "__none__" && onChange(value, [])}>
        <SelectTrigger className="bg-white text-xs font-semibold">
          <SelectValue placeholder="Kolom" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Pilih kolom…</SelectItem>
          {fields
            .filter((item) => item.kind !== "measure")
            .map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {field ? (
        <div className="flex flex-wrap gap-1">
          {options.map((option) => {
            const active = values.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(field, active ? values.filter((value) => value !== option) : [...values, option])}
                className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold ring-1", active ? "bg-teal text-mint ring-teal" : "bg-white text-teal ring-teal/20")}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Help({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-grid size-4 place-items-center rounded-full text-teal/60 hover:text-teal" aria-label={text}>
          <Icon icon={HelpCircleIcon} className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{text}</TooltipContent>
    </Tooltip>
  );
}

function StepTitle({ number, title, hint }: { number: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal text-xs font-black text-mint">{number}</span>
      <div>
        <h3 className="text-sm font-bold text-teal">{title}</h3>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (value: boolean) => void; label: string; help?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-teal">
      <span className="flex items-center gap-1">
        {label}
        {help ? <Help text={help} /> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-turquoise" : "bg-teal/20")}
      >
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left]", checked ? "left-[18px]" : "left-0.5")} />
      </button>
    </label>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-teal/80">
        {label}
        {help ? <Help text={help} /> : null}
      </span>
      {children}
    </div>
  );
}

const chipTone: Record<FieldDef["kind"], string> = {
  dimension: "bg-turquoise/20 text-teal ring-turquoise/50",
  measure: "bg-sun/50 text-teal ring-sun",
  period: "bg-mint text-teal ring-teal/25",
};

function FieldChip({ field, onClick, onRemove, draggable = true, dragId }: { field: FieldDef; onClick?: () => void; onRemove?: () => void; draggable?: boolean; dragId?: string }) {
  return (
    <span
      draggable={draggable}
      onDragStart={(event) => event.dataTransfer.setData("text/field", dragId ?? field.id)}
      className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", chipTone[field.kind], draggable && "cursor-grab active:cursor-grabbing")}
    >
      <button type="button" onClick={onClick} className="truncate" title={field.help ?? field.label}>
        {field.label}
      </button>
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label={`Lepas ${field.label}`} className="rounded-full hover:bg-teal/10">
          <Icon icon={Cancel01Icon} className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

function DropWell({ title, help, empty, onDropField, children }: { title: string; help: string; empty: string; onDropField: (id: string) => void; children?: React.ReactNode }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const id = event.dataTransfer.getData("text/field");
        if (id) onDropField(id);
      }}
      className={cn("grid gap-1.5 rounded-lg border-2 border-dashed p-2 transition-colors", over ? "border-turquoise bg-turquoise/10" : "border-teal/15 bg-muted/40")}
    >
      <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-teal/80">
        {title}
        <Help text={help} />
      </span>
      <div className="flex min-h-7 flex-wrap items-center gap-1.5">{children ?? <span className="text-[11px] text-muted-foreground">{empty}</span>}</div>
    </div>
  );
}

/**
 * Three-step editor for one widget: pick data, pick a chart, adjust the look.
 * The preview on the right renders the real widget as you go.
 */
export default function WidgetEditor({
  spec: initial,
  isNew,
  sources,
  onDatasetAdded,
  context,
  contextFor,
  onApply,
  onClose,
}: {
  spec: WidgetSpec;
  isNew: boolean;
  sources: CanvasSources;
  onDatasetAdded: (id: string, source: CanvasSource) => void;
  /** The page context (selector, other sources) the preview computes with. */
  context: PageContext;
  /** The context the widget gets on the page (page filters, semester scope), so the preview matches it. */
  contextFor?: (spec: WidgetSpec) => PageContext;
  onApply: (spec: WidgetSpec) => void;
  onClose: () => void;
}) {
  const [spec, setSpec] = useState<WidgetSpec>(initial);
  const [titleTouched, setTitleTouched] = useState(!isNew);
  const [datasets, setDatasets] = useState<DatasetMeta[] | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loadingDataset, setLoadingDataset] = useState<string | null>(null);
  const [filterField, setFilterField] = useState<string>("");

  const source = sources[spec.source];
  const def = source?.def;
  const fields = def?.fields ?? [];
  const fieldById = (id?: string) => fields.find((field) => field.id === id);
  /** The column behind a measure, also when it reads another page source. */
  const measureField = (measure: Measure) => (measure.source ? sources[measure.source]?.def.fields : fields)?.find((item) => item.id === measure.field);
  const isCard = spec.chart === "card" || spec.chart === "gauge";

  useEffect(() => {
    fetch("/api/datasets")
      .then((response) => response.json() as Promise<{ datasets?: DatasetMeta[] }>)
      .then((payload) => setDatasets(payload.datasets ?? []))
      .catch(() => setDatasets([]));
  }, []);

  const updateCard = (patch: Partial<NonNullable<WidgetSpec["card"]>>) => setSpec((current) => ({ ...current, card: { display: current.card?.display ?? "value", ...current.card, ...patch } }));

  const update = (patch: Partial<WidgetSpec>) =>
    setSpec((current) => {
      const next = { ...current, ...patch };
      if (!titleTouched && (patch.dimension !== undefined || patch.measures || patch.source)) next.title = autoTitle(next);
      return next;
    });

  function autoTitle(next: WidgetSpec) {
    const nextDef = sources[next.source]?.def;
    const nextFields = nextDef?.fields ?? [];
    const measure = next.measures[0];
    const measureFields = measure?.source ? (sources[measure.source]?.def.fields ?? []) : nextFields;
    const measureName = measure ? (measure.agg === "count" ? "Jumlah data" : (measureFields.find((field) => field.id === measure.field)?.label ?? "")) : "";
    const dimensionName = nextFields.find((field) => field.id === next.dimension)?.label;
    if (!measureName) return next.chart === "card" ? "Kartu baru" : "Grafik baru";
    return dimensionName ? `${measureName} per ${dimensionName.toLowerCase()}` : measureName;
  }

  // ---- step 1: wells -------------------------------------------------------------
  function placeField(id: string, well?: Well) {
    if (id.includes("::")) {
      const [otherSource, otherField] = id.split("::") as [SourceId, string];
      return addOtherMeasure(otherSource, otherField);
    }
    const field = fieldById(id);
    if (!field) return;
    const target: Well = well ?? (field.kind === "measure" ? "measures" : isCard ? "measures" : !spec.dimension ? "dimension" : "breakdown");
    if (target === "measures") {
      const measure: Measure = field.kind === "measure" ? { field: id, agg: "sum" } : { field: id, agg: field.kind === "period" ? "count" : "distinct" };
      const measures = isCard || spec.chart === "pie" || spec.chart === "doughnut" ? [measure] : [...spec.measures.filter((item) => item.field !== id), measure].slice(0, 4);
      update({ measures });
    } else if (target === "dimension") {
      // Rankings keep "top N"; a time axis shows the last 12 months instead.
      const limit = id === "periodKey" ? 12 : spec.dimension === "periodKey" ? undefined : spec.limit;
      update({ dimension: id, breakdown: spec.breakdown === id ? undefined : spec.breakdown, limit, sort: id === "periodKey" ? undefined : spec.sort });
    } else {
      update({ breakdown: id === spec.dimension ? undefined : id });
    }
  }

  function setMeasure(index: number, patch: Partial<Measure>) {
    // A "Selisih thd target" view is kept while the ratio is off, so it comes back with it.
    update({ measures: spec.measures.map((measure, current) => (current === index ? { ...measure, ...patch } : measure)) });
  }

  /** A number column of another page source (e.g. Payment on a Target widget), joined per period/group. */
  function addOtherMeasure(otherSource: SourceId, field: string) {
    const measure: Measure = { field, agg: "sum", source: otherSource };
    const measures = isCard || spec.chart === "pie" || spec.chart === "doughnut" ? [measure] : [...spec.measures.filter((item) => !(item.field === field && item.source === otherSource)), measure].slice(0, 4);
    update({ measures });
  }

  function chooseSource(id: SourceId) {
    if (id === spec.source) return;
    setSpec((current) => ({ ...current, source: id, dimension: undefined, breakdown: undefined, measures: [], filters: [], title: titleTouched ? current.title : current.chart === "card" ? "Kartu baru" : "Grafik baru" }));
  }

  async function pickDataset(meta: DatasetMeta) {
    setLoadingDataset(meta.id);
    try {
      const loaded = await fetchDatasetSource(meta.id);
      onDatasetAdded(meta.id, loaded);
      chooseSource(datasetSourceId(meta.id));
    } finally {
      setLoadingDataset(null);
    }
  }

  // ---- derived -------------------------------------------------------------------
  const distinctCount = useMemo(() => (source && spec.dimension ? distinctValues(source.rows, spec.dimension, 1000).length : 0), [source, spec.dimension]);
  const recommended = recommendChart(spec, distinctCount);
  const problem = validateWidget(spec);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- contextFor is rebuilt every render; the spec is what matters.
  const previewContext = useMemo(() => (contextFor ? contextFor(spec) : context), [spec, context]);
  /** Panels that replace the whole card: most card settings don't apply to them. */
  const panelCard = spec.view === "movement" || spec.view === "kpi-summary";
  const filterOptions = useMemo(() => (source && filterField ? distinctValues(source.rows, filterField, 80) : []), [source, filterField]);
  const pageSourceIds = (Object.keys(sources) as SourceId[]).filter((id) => !id.startsWith("dataset:"));
  // Other page sources can be joined when they share the grouping column (period, year, month, …).
  const otherSources = pageSourceIds
    .filter((id) => id !== spec.source && !spec.source.startsWith("dataset:"))
    .map((id) => ({ id, def: sources[id]!.def }))
    .filter(({ def: other }) => isCard || !spec.dimension || other.fields.some((field) => field.id === spec.dimension))
    .map(({ id, def: other }) => ({ id, label: other.label, fields: other.fields.filter((field) => field.kind === "measure" && field.id !== "count") }))
    .filter((other) => other.fields.length > 0);
  const divideOptions = (Object.keys(sources) as SourceId[])
    .filter((id) => id === spec.source || otherSources.some((other) => other.id === id))
    .flatMap((id) => (sources[id]?.def.fields ?? []).filter((field) => field.kind === "measure" && field.id !== "count").map((field) => ({ value: `${id}::${field.id}`, label: id === spec.source ? field.label : `${field.label} — ${sources[id]?.def.label}` })));
  const kpiTable = spec.chart === "table" && spec.dimension === "periodKey" && !spec.breakdown && spec.measures.length > 0;
  const ratioBars = spec.chart === "bar-h" && Boolean(spec.dimension) && !spec.breakdown && spec.measures.length === 1 && Boolean(spec.measures[0]?.divideBy);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-5xl" aria-describedby={undefined}>
        <TooltipProvider delayDuration={150}>
          <SheetHeader>
            <SheetTitle>{isNew ? (isCard ? "Tambah card" : "Tambah grafik") : "Ubah widget"}</SheetTitle>
            <SheetDescription>Ikuti 3 langkah di bawah. Pratinjau di kanan langsung berubah.</SheetDescription>
          </SheetHeader>

          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:overflow-hidden">
            {/* ---------- steps ---------- */}
            <div className="grid content-start gap-5 p-4 lg:overflow-y-auto">
              <section className="grid gap-3" data-tour="editor-data">
                <StepTitle number={1} title="Pilih data" hint="Pilih sumber data, lalu klik atau seret kolom ke kotak di bawahnya." />
                <div className="grid gap-2 sm:grid-cols-2">
                  {pageSourceIds.map((id) => {
                    const item = sources[id]!.def;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => chooseSource(id)}
                        className={cn("rounded-lg border p-2.5 text-left transition-colors", spec.source === id ? "border-turquoise bg-turquoise/10 ring-1 ring-turquoise" : "border-border hover:border-turquoise/60")}
                      >
                        <span className="block text-xs font-bold text-teal">{item.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{item.description}</span>
                      </button>
                    );
                  })}
                  {(datasets ?? []).map((meta) => (
                    <button
                      key={meta.id}
                      type="button"
                      disabled={loadingDataset === meta.id}
                      onClick={() => void pickDataset(meta)}
                      className={cn("rounded-lg border p-2.5 text-left transition-colors", spec.source === datasetSourceId(meta.id) ? "border-turquoise bg-turquoise/10 ring-1 ring-turquoise" : "border-border hover:border-turquoise/60")}
                    >
                      <span className="block truncate text-xs font-bold text-teal">{meta.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{loadingDataset === meta.id ? "Memuat…" : `${meta.rowCount.toLocaleString("id-ID")} baris · upload`}</span>
                    </button>
                  ))}
                  <button type="button" onClick={() => setUploadOpen(true)} className="flex items-center gap-2 rounded-lg border-2 border-dashed border-teal/20 p-2.5 text-left hover:border-turquoise hover:bg-turquoise/5">
                    <Icon icon={FileImportIcon} className="size-5 text-turquoise-ink" />
                    <span>
                      <span className="block text-xs font-bold text-teal">Upload Excel / CSV</span>
                      <span className="block text-[11px] text-muted-foreground">Pakai data sendiri</span>
                    </span>
                  </button>
                </div>

                {fields.length ? (
                  <>
                    <div className="flex flex-wrap gap-1.5 rounded-lg bg-muted/40 p-2">
                      {fields.map((field) => (
                        <FieldChip key={field.id} field={field} onClick={() => placeField(field.id)} />
                      ))}
                    </div>
                    {otherSources.map((other) => (
                      <div key={other.id} className="grid gap-1 rounded-lg border border-dashed border-teal/20 p-2">
                        <span className="text-[11px] font-bold text-teal/80">Angka dari sumber lain: {other.label}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {other.fields.map((field) => (
                            <FieldChip key={field.id} field={field} dragId={`${other.id}::${field.id}`} onClick={() => addOtherMeasure(other.id, field.id)} />
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-bold text-turquoise-ink">Hijau</span> = kelompok, <span className="font-bold text-teal">kuning</span> = angka, <span className="font-bold text-teal">putih</span> = periode/bulan.
                    </p>
                    <div className="grid gap-2">
                      {!isCard ? (
                        <DropWell title="Kelompokkan berdasarkan" help="Kolom yang jadi sumbu/kategori grafik, mis. Periode untuk tren atau Customer untuk peringkat." empty="Seret satu kolom ke sini" onDropField={(id) => placeField(id, "dimension")}>
                          {fieldById(spec.dimension) ? <FieldChip field={fieldById(spec.dimension)!} draggable={false} onRemove={() => update({ dimension: undefined })} /> : null}
                        </DropWell>
                      ) : null}
                      <DropWell title={isCard ? "Angka yang ditampilkan" : "Nilai"} help="Angka yang dihitung. Pilih cara hitungnya: total, rata-rata, jumlah data, dll." empty="Seret kolom angka ke sini" onDropField={(id) => placeField(id, "measures")}>
                        {spec.measures.length
                          ? spec.measures.map((measure, index) => {
                              const field = measureField(measure);
                              const fromOther = measure.source && measure.source !== spec.source ? sources[measure.source]?.def.label : undefined;
                              return (
                                <div key={`${measure.field}-${measure.source ?? ""}-${index}`} className="flex w-full flex-wrap items-center gap-1.5">
                                  {field ? <FieldChip field={field} draggable={false} onRemove={() => update({ measures: spec.measures.filter((_, current) => current !== index) })} /> : null}
                                  {fromOther ? <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold text-teal">dari {fromOther}</span> : null}
                                  <Select value={measure.agg} onValueChange={(value) => setMeasure(index, { agg: value as Aggregation })}>
                                    <SelectTrigger aria-label="Cara hitung" className="h-7 w-32 bg-white text-[11px] font-semibold">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {aggregations.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {!isCard ? (
                                    <Select
                                      value={measure.divideBy ? `${measure.divideBy.source ?? measure.source ?? spec.source}::${measure.divideBy.field}` : "__none__"}
                                      onValueChange={(value) => {
                                        if (value === "__none__") return setMeasure(index, { divideBy: undefined });
                                        const [divideSource, divideField] = value.split("::") as [SourceId, string];
                                        // Always explicit: without a source the divisor reads the measure's own source.
                                        setMeasure(index, { divideBy: { field: divideField, agg: "sum", source: divideSource } });
                                      }}
                                    >
                                      <SelectTrigger aria-label="Bagi dengan" className="h-7 w-40 bg-white text-[11px] font-semibold">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__none__">Tanpa pembagi</SelectItem>
                                        {divideOptions
                                          .filter((option) => option.value !== `${measure.source ?? spec.source}::${measure.field}`)
                                          .map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              ÷ {option.label}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  ) : null}
                                  {spec.chart === "combo" && index > 0 ? (
                                    <SegmentedControl size="xs" ariaLabel="Sumbu" value={measure.axis ?? "left"} options={[{ value: "left", label: "Sumbu kiri" }, { value: "right", label: "Sumbu kanan" }]} onChange={(axis) => setMeasure(index, { axis })} />
                                  ) : null}
                                </div>
                              );
                            })
                          : null}
                      </DropWell>
                      {!isCard && spec.chart !== "pie" && spec.chart !== "doughnut" && spec.measures.length <= 1 ? (
                        <DropWell title="Pecah warna (opsional)" help="Membagi tiap batang/garis menurut kolom kedua, mis. Tipe customer. Hanya untuk 1 nilai." empty="Seret kolom kelompok kedua ke sini" onDropField={(id) => placeField(id, "breakdown")}>
                          {fieldById(spec.breakdown) ? <FieldChip field={fieldById(spec.breakdown)!} draggable={false} onRemove={() => update({ breakdown: undefined })} /> : null}
                        </DropWell>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="grid place-items-center gap-2 rounded-lg bg-muted/40 p-4 text-center">
                    <PickDataIllustration className="h-20" />
                    <p className="text-xs text-muted-foreground">Pilih sumber data dulu.</p>
                  </div>
                )}
              </section>

              <section className="grid gap-3" data-tour="editor-type">
                <StepTitle number={2} title="Pilih jenis tampilan" hint="Tidak yakin? Pilih yang bertanda Disarankan." />
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {chartKinds.map((item) => (
                    <Tooltip key={item.kind}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() =>
                            update({
                              chart: item.kind as ChartKind,
                              ...(item.kind === "card" && !spec.comparison ? { comparison: "page" as const } : {}),
                              // Special panels (map, KPI table, …) only fit their own chart type.
                              ...(spec.view && !["auto", "standard", "report", "export"].includes(spec.view) && item.kind !== spec.chart ? { view: "auto" as const } : {}),
                            })
                          }
                          className={cn(
                            "relative grid justify-items-center gap-1 rounded-lg border p-2 text-[11px] font-bold text-teal transition-colors",
                            spec.chart === item.kind ? "border-turquoise bg-turquoise/10 ring-1 ring-turquoise" : "border-border hover:border-turquoise/60",
                          )}
                        >
                          {recommended === item.kind ? (
                            <span className="absolute -top-2 right-1 inline-flex items-center gap-0.5 rounded-full bg-sun px-1.5 text-[9px] font-black">
                              <Icon icon={SparklesIcon} className="size-2.5" />
                              Disarankan
                            </span>
                          ) : null}
                          <ChartThumb kind={item.kind} className="h-9 w-14" />
                          {item.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56">{item.hint}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </section>

              <section className="grid gap-3" data-tour="editor-style">
                <StepTitle number={3} title="Atur tampilan" hint="Judul, warna, urutan, dan perbandingan periode." />
                <Field label="Judul">
                  <Input
                    value={spec.title}
                    onChange={(event) => {
                      setTitleTouched(true);
                      update({ title: event.target.value });
                    }}
                  />
                </Field>
                <Field label="Keterangan kecil (opsional)">
                  <Input value={spec.subtitle ?? ""} placeholder="mis. Sumber: SAP, dalam Rupiah" onChange={(event) => update({ subtitle: event.target.value || undefined })} />
                </Field>

                {spec.dimension === "periodKey" && !isCard ? (
                  <Field label="Tampilan periode" help="Cara menampilkan sumbu bulan: nilai bulanan, kumulatif YTD, atau pertumbuhan.">
                    <Select value={spec.timeMode ?? "page"} onValueChange={(value) => update({ timeMode: value as WidgetSpec["timeMode"] })}>
                      <SelectTrigger className="bg-white text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeModeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">{timeModeOptions.find((option) => option.value === (spec.timeMode ?? "page"))?.help}</p>
                  </Field>
                ) : null}

                {isCard ? (
                  <>
                    {spec.view !== "kpi-summary" ? (
                    <Field label="Bandingkan dengan" help="MoM, YoY, dan YTD dihitung dari bulan acuan (bulan terakhir yang ada datanya, atau pilihan filter Periode acuan).">
                      <Select
                        value={spec.view === "movement" ? "movement" : (spec.comparison ?? "none")}
                        onValueChange={(value) =>
                          value === "movement"
                            ? update({ view: "movement", comparison: "none" })
                            : update({ comparison: value as WidgetSpec["comparison"], ...(spec.view === "movement" ? { view: "auto" as const } : {}) })
                        }
                      >
                        <SelectTrigger className="bg-white text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="page">Ikuti tombol MoM/YoY/YTD halaman</SelectItem>
                          <SelectItem value="none">Tanpa perbandingan (total)</SelectItem>
                          <SelectItem value="mom">MoM — bulan lalu</SelectItem>
                          <SelectItem value="yoy">YoY — bulan sama tahun lalu</SelectItem>
                          <SelectItem value="ytd">YTD — Jan s.d. bulan acuan vs tahun lalu</SelectItem>
                          <SelectItem value="target">Target</SelectItem>
                          {spec.chart === "card" ? <SelectItem value="movement">MoM, YoY & YTD sekaligus (3 kotak)</SelectItem> : null}
                        </SelectContent>
                      </Select>
                      {spec.view === "movement" ? <p className="text-[11px] text-muted-foreground">Tiga kotak persen berdampingan: MoM, YoY, dan YTD dari angka yang dipilih.</p> : null}
                      {spec.view !== "movement" && spec.comparison && spec.comparison !== "none" && spec.comparison !== "page" ? <p className="text-[11px] text-muted-foreground">{comparisonHelp[spec.comparison]}</p> : null}
                    </Field>
                    ) : null}
                    {spec.chart === "card" && spec.view !== "movement" ? (
                      <Field label="Isi kartu">
                        <SegmentedControl
                          size="xs"
                          ariaLabel="Isi kartu"
                          value={spec.view === "kpi-summary" ? "kpi-summary" : (spec.card?.display ?? "value-change")}
                          options={[
                            { value: "value", label: "Angka" },
                            { value: "value-change", label: "Angka + perubahan" },
                            { value: "progress", label: "Progress target" },
                            { value: "kpi-summary", label: "Ringkasan KPI" },
                          ]}
                          onChange={(display) =>
                            display === "kpi-summary"
                              ? update({ view: "kpi-summary", comparison: "none", card: { ...spec.card, display: "progress", compute: "value" } })
                              : update({ card: { ...spec.card, display }, ...(spec.view === "kpi-summary" ? { view: "auto" as const } : {}) })
                          }
                        />
                        {spec.view === "kpi-summary" ? <p className="text-[11px] text-muted-foreground">Tabel Realisasi / Target / Prosentase + cincin pencapaian. Isi Target di bawah; nama indikator diambil dari Keterangan kecil (atau Judul).</p> : null}
                      </Field>
                    ) : null}
                    {spec.chart === "card" && !panelCard ? (
                      <Field label="Hitung sebagai" help="Nilai biasa, atau gabungkan dengan target: rasio (%), selisih, sisa target; atau porsi sebagian data, pecahan per kelompok, kelompok terbesar.">
                        <Select value={spec.card?.compute ?? "value"} onValueChange={(value) => updateCard({ compute: value as CardCompute })}>
                          <SelectTrigger className="bg-white text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {computeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {spec.card?.compute === "share" ? (
                          <DimensionValuePicker
                            fields={fields}
                            rows={source?.rows ?? []}
                            field={spec.card.share?.field}
                            values={spec.card.share?.values.map(String) ?? []}
                            onChange={(field, values) => updateCard({ share: { field, op: "in", values } })}
                            hint="Bagian yang dihitung, mis. Status = Bucket 4."
                          />
                        ) : null}
                        {spec.card?.compute === "split" ? (
                          <DimensionValuePicker
                            fields={fields}
                            rows={source?.rows ?? []}
                            field={spec.card.split?.field}
                            values={spec.card.split?.values ?? []}
                            onChange={(field, values) => updateCard({ split: { field, values } })}
                            hint="Nilai pertama jadi angka utama, sisanya di baris kedua."
                          />
                        ) : null}
                        {spec.card?.compute === "top" ? (
                          <Select value={spec.card.topField ?? "__none__"} onValueChange={(value) => updateCard({ topField: value === "__none__" ? undefined : value })}>
                            <SelectTrigger className="bg-white text-xs font-semibold">
                              <SelectValue placeholder="Kelompok" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Pilih kelompok…</SelectItem>
                              {fields
                                .filter((field) => field.kind === "dimension")
                                .map((field) => (
                                  <SelectItem key={field.id} value={field.id}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : null}
                      </Field>
                    ) : null}
                    {spec.comparison === "target" || spec.card?.display === "progress" || spec.chart === "gauge" || ["ratio", "difference", "remaining"].includes(spec.card?.compute ?? "") ? (
                      <Field label="Target" help="Angka target tetap, atau kolom target dari data (mis. Target bulanan KPI).">
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder="Angka target"
                            value={typeof spec.card?.target === "number" ? spec.card.target : ""}
                            onChange={(event) => update({ card: { display: spec.card?.display ?? "value-change", ...spec.card, target: event.target.value === "" ? undefined : Number(event.target.value) } })}
                          />
                          <Select
                            value={typeof spec.card?.target === "object" ? `${spec.card.target.source ?? spec.source}::${spec.card.target.field}` : "__none__"}
                            onValueChange={(value) => {
                              if (value === "__none__") return updateCard({ target: undefined });
                              const [targetSource, field] = value.split("::") as [SourceId, string];
                              updateCard({ target: { field, ...(targetSource !== spec.source ? { source: targetSource } : {}) } });
                            }}
                          >
                            <SelectTrigger className="bg-white text-xs font-semibold">
                              <SelectValue placeholder="atau kolom target" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Tanpa kolom</SelectItem>
                              {/* Any number column of the page, also from another source (e.g. Payment ÷ Invoice). */}
                              {(Object.keys(sources) as SourceId[]).flatMap((id) =>
                                (sources[id]?.def.fields ?? [])
                                  .filter((field) => field.kind === "measure" && field.id !== "count")
                                  .map((field) => (
                                    <SelectItem key={`${id}::${field.id}`} value={`${id}::${field.id}`}>
                                      {id === spec.source ? field.label : `${field.label} — ${sources[id]?.def.label}`}
                                    </SelectItem>
                                  )),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </Field>
                    ) : null}
                    {spec.chart === "card" && !panelCard ? (
                      <>
                        <Field label="Warna kartu">
                          <div className="flex gap-2">
                            {(["turquoise", "mint", "coral", "sun"] as const).map((tone) => (
                              <button
                                key={tone}
                                type="button"
                                aria-label={tone}
                                aria-pressed={(spec.card?.tone ?? "turquoise") === tone}
                                onClick={() => update({ card: { display: spec.card?.display ?? "value-change", ...spec.card, tone } })}
                                className={cn("size-8 rounded-lg ring-1 ring-teal/15", { turquoise: "bg-turquoise", mint: "bg-mint", coral: "bg-[#cc3f3f]", sun: "bg-sun" }[tone], (spec.card?.tone ?? "turquoise") === tone && "ring-2 ring-teal ring-offset-2")}
                              />
                            ))}
                          </div>
                        </Field>
                        <Field label="Ikon" help="Ikon kecil di kartu bergaya dashboard.">
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(cardIcons).map(([key, item]) => (
                              <button
                                key={key}
                                type="button"
                                aria-label={item.label}
                                aria-pressed={spec.card?.icon === key}
                                onClick={() => updateCard({ icon: key })}
                                className={cn("grid size-8 place-items-center rounded-lg text-teal ring-1 ring-teal/15 hover:bg-turquoise/10", spec.card?.icon === key && "bg-turquoise/20 ring-2 ring-teal")}
                              >
                                <Icon icon={item.icon} className="size-4" />
                              </button>
                            ))}
                          </div>
                        </Field>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          <Toggle label="Garis tren kecil" checked={Boolean(spec.card?.sparkline)} onChange={(sparkline) => update({ card: { display: spec.card?.display ?? "value-change", ...spec.card, sparkline } })} help="Garis mini 12 bulan terakhir di dalam kartu." />
                          <Toggle label="Sorot (garis berkilau)" checked={Boolean(spec.card?.highlight)} onChange={(highlight) => update({ card: { display: spec.card?.display ?? "value-change", ...spec.card, highlight } })} help="Pakai untuk 1 kartu terpenting di halaman." />
                        </div>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    {spec.measures.length > 0 && spec.chart !== "pie" && spec.chart !== "doughnut" && !spec.breakdown ? (
                      <Field label="Warna">
                        <div className="grid gap-1.5">
                          {spec.measures.map((measure, index) => (
                            <div key={`${measure.field}-${index}`} className="flex items-center gap-2">
                              <span className="w-28 truncate text-[11px] font-semibold text-teal">{measureField(measure)?.label ?? measure.field}</span>
                              <div className="flex flex-wrap gap-1">
                                {(Object.keys(swatches) as PaletteColor[]).map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    aria-label={color}
                                    onClick={() => setMeasure(index, { color })}
                                    className={cn("size-6 rounded-md ring-1 ring-teal/10", swatches[color], (measure.color ?? seriesColors[index]) === color && "ring-2 ring-teal ring-offset-1")}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Field>
                    ) : null}
                    {spec.dimension && spec.dimension !== "periodKey" ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Urutkan">
                          <Select value={spec.sort ?? "abs-desc"} onValueChange={(value) => update({ sort: value as WidgetSpec["sort"] })}>
                            <SelectTrigger className="bg-white text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="abs-desc">Terbesar dulu (abaikan tanda −)</SelectItem>
                              <SelectItem value="value-desc">Terbesar dulu</SelectItem>
                              <SelectItem value="value-asc">Terkecil dulu</SelectItem>
                              <SelectItem value="label">Abjad / urutan bulan</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label="Tampilkan" help="Batasi jumlah kelompok, mis. 10 customer teratas.">
                          <Select value={String(spec.limit ?? 0)} onValueChange={(value) => update({ limit: Number(value) || undefined })}>
                            <SelectTrigger className="bg-white text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Semua</SelectItem>
                              {[5, 6, 8, 10, 15, 20].map((value) => (
                                <SelectItem key={value} value={String(value)}>
                                  {value} teratas
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    ) : spec.dimension === "periodKey" ? (
                      <Field label="Jumlah bulan">
                        <Select value={String(spec.limit ?? 12)} onValueChange={(value) => update({ limit: Number(value) })}>
                          <SelectTrigger className="bg-white text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[6, 12, 18, 24, 36].map((value) => (
                              <SelectItem key={value} value={String(value)}>
                                {value} bulan terakhir
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    ) : null}
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <Toggle label="Tampilkan angka" checked={Boolean(spec.options?.dataLabels)} onChange={(dataLabels) => update({ options: { ...spec.options, dataLabels } })} help="Menulis nilai di ujung tiap batang." />
                      <Toggle label="Tampilkan legenda" checked={spec.options?.legend ?? spec.measures.length > 1} onChange={(legend) => update({ options: { ...spec.options, legend } })} />
                      {spec.chart === "line" || spec.chart === "area" ? <Toggle label="Garis melengkung" checked={spec.options?.smooth ?? true} onChange={(smooth) => update({ options: { ...spec.options, smooth } })} /> : null}
                    </div>
                    {spec.chart === "bar" || spec.chart === "line" || spec.chart === "area" || spec.chart === "combo" ? (
                      <Field label="Garis target (opsional)" help="Garis putus-putus merah di angka ini.">
                        <Input type="number" inputMode="decimal" value={spec.options?.targetLine ?? ""} placeholder="mis. 1000000000" onChange={(event) => update({ options: { ...spec.options, targetLine: event.target.value === "" ? undefined : Number(event.target.value) } })} />
                      </Field>
                    ) : null}
                  </>
                )}

                <Field label="Gaya tampilan" help="Gaya dashboard memakai komponen asli halaman ini (bar ranking, donut berlegenda, kartu KPI, tren). Grafik standar memakai grafik umum dengan opsi lebih banyak.">
                  {spec.view === "movement" ? (
                    <p className="rounded-lg bg-muted/60 px-2.5 py-2 text-[11px] font-semibold text-teal">Panel khusus (MoM / YoY / YTD). Ubah lewat &quot;Bandingkan dengan&quot; untuk kembali ke kartu biasa.</p>
                  ) : spec.view === "kpi-summary" ? (
                    <p className="rounded-lg bg-muted/60 px-2.5 py-2 text-[11px] font-semibold text-teal">Panel khusus (ringkasan KPI). Ubah lewat &quot;Isi kartu&quot; untuk kembali ke kartu biasa.</p>
                  ) : spec.view && !["auto", "standard", "report", "export", "variance-bars", "kpi-table"].includes(spec.view) ? (
                    <p className="rounded-lg bg-muted/60 px-2.5 py-2 text-[11px] font-semibold text-teal">Panel khusus ({specialViews[spec.view] ?? spec.view}). Ganti jenis tampilan di langkah 2 untuk memakai grafik lain.</p>
                  ) : (
                    <>
                      <SegmentedControl
                        size="xs"
                        ariaLabel="Gaya tampilan"
                        value={spec.view === "standard" || (spec.view === "variance-bars" && ratioBars) || (spec.view === "kpi-table" && kpiTable) ? spec.view : "auto"}
                        options={[
                          { value: "auto", label: "Gaya dashboard" },
                          { value: "standard", label: "Grafik standar" },
                          ...(ratioBars ? [{ value: "variance-bars" as const, label: "Selisih thd target" }] : []),
                          ...(kpiTable ? [{ value: "kpi-table" as const, label: "Tabel KPI" }] : []),
                        ]}
                        onChange={(value) => update({ view: value })}
                      />
                      {kpiTable ? <p className="text-[11px] text-muted-foreground">Tabel KPI: baris per nilai (mis. Target, Realisasi), kolom Total lalu tiap bulan. Nama indikator diambil dari Keterangan kecil (atau Judul).</p> : null}
                      {ratioBars ? <p className="text-[11px] text-muted-foreground">Selisih thd target: batang = rasio − 100%, hijau di atas target, merah di bawah.</p> : null}
                    </>
                  )}
                </Field>

                <Field label="Format angka">
                  <Select value={spec.format ?? "auto"} onValueChange={(value) => update({ format: value === "auto" ? undefined : (value as WidgetSpec["format"]) })}>
                    <SelectTrigger className="bg-white text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Otomatis dari kolom</SelectItem>
                      {formatOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Filter khusus widget ini" help="Selalu berlaku untuk widget ini saja, mis. hanya customer External.">
                  <div className="grid gap-1.5">
                    {spec.filters.map((rule, index) => (
                      <div key={`${rule.field}-${index}`} className="flex flex-wrap items-center gap-1 rounded-lg bg-muted/50 px-2 py-1 text-[11px] font-semibold text-teal">
                        <span>{fieldById(rule.field)?.label ?? rule.field}:</span>
                        <span className="min-w-0 flex-1 truncate">{rule.values.join(", ")}</span>
                        <button type="button" aria-label="Hapus filter" onClick={() => update({ filters: spec.filters.filter((_, current) => current !== index) })}>
                          <Icon icon={Cancel01Icon} className="size-3" />
                        </button>
                      </div>
                    ))}
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      <Select value={filterField || "__none__"} onValueChange={(value) => setFilterField(value === "__none__" ? "" : value)}>
                        <SelectTrigger className="bg-white text-xs font-semibold">
                          <SelectValue placeholder="Pilih kolom" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Pilih kolom…</SelectItem>
                          {fields
                            .filter((field) => field.kind !== "measure")
                            .map((field) => (
                              <SelectItem key={field.id} value={field.id}>
                                {field.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value="__none__"
                        disabled={!filterField}
                        onValueChange={(value) => {
                          if (value === "__none__") return;
                          const existing = spec.filters.find((rule) => rule.field === filterField && rule.op === "in");
                          update({
                            filters: existing
                              ? spec.filters.map((rule) => (rule === existing ? { ...rule, values: [...new Set([...rule.values, value])] } : rule))
                              : [...spec.filters, { field: filterField, op: "in", values: [value] }],
                          });
                        }}
                      >
                        <SelectTrigger className="bg-white text-xs font-semibold">
                          <SelectValue placeholder="Tambah nilai" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Tambah nilai…</SelectItem>
                          {filterOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Field>
                <Toggle
                  label="Abaikan filter halaman"
                  checked={spec.ignoreFilters?.includes("*") ?? false}
                  onChange={(ignore) => update({ ignoreFilters: ignore ? ["*"] : undefined })}
                  help="Widget tetap menghitung semua data walau filter di halaman diubah."
                />
              </section>
            </div>

            {/* ---------- preview ---------- */}
            <aside className="order-first grid content-start gap-3 border-b border-border bg-[linear-gradient(180deg,rgba(78,205,196,0.12),transparent)] p-4 lg:order-none lg:border-b-0 lg:border-l">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-teal/80">Pratinjau</span>
                <ChartTypeIllustration className="h-8" />
              </div>
              <p className="rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold text-teal ring-1 ring-teal/10">{describeWidget(spec, def)}</p>
              <div className={cn("overflow-hidden", isCard && spec.chart === "card" ? "h-40" : "h-72")}>
                <SpecWidget spec={spec} def={def} rows={source?.rows} context={previewContext} />
              </div>
              {problem ? (
                <Banner tone="warning" title="Hampir selesai">
                  {problem}
                </Banner>
              ) : null}
            </aside>
          </div>

          <SheetFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button type="button" variant="accent" disabled={Boolean(problem)} onClick={() => onApply(spec)}>
              {isNew ? "Tambahkan ke dashboard" : "Terapkan"}
            </Button>
          </SheetFooter>
        </TooltipProvider>
      </SheetContent>

      {uploadOpen ? (
        <DatasetUpload
          onClose={() => setUploadOpen(false)}
          onCreated={(meta, loaded) => {
            setUploadOpen(false);
            setDatasets((current) => [meta, ...(current ?? [])]);
            onDatasetAdded(meta.id, loaded);
            chooseSource(datasetSourceId(meta.id));
          }}
        />
      ) : null}
    </Sheet>
  );
}
