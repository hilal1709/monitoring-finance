"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loading03Icon, CloudUploadIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { ChartPanel } from "@/components/export/chart-panel";
import { Banner } from "@/components/ui/banner";
import { DropZone } from "@/components/ui/drop-zone";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { TopProgress } from "@/components/ui/page-loader";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartSkeleton, DashboardSkeleton } from "@/components/ui/skeleton";
import { notify } from "@/components/ui/notify";
import { AchievementRing } from "@/components/dashboard/achievement-ring";
import { DashboardCanvas, type CanvasSources } from "@/components/dashboard-canvas/canvas";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { builtinSources, kpiRows } from "@/lib/chart-builder/sources";

type Metric = { label: string; target: number; actual: number; yearTarget: number };
type Period = { periodKey: string; label: string; metrics: Metric[]; sourceFilename: string; uploadedAt: string; rawSheetCount: number };
export type KpiPayload = { periods: Period[] };
type Payload = KpiPayload;

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const fmt = (n: number) => numberFormatter.format(n);
const TrendChart = dynamic(() => import("@/components/export/trend-chart").then((module) => module.TrendChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

type TrendPoint = { key: string; label: string; target: number; actual: number; actualTrend: number };

/** The KPI summary, trend and table as canvas built-ins (custom widgets read the KPI rows). */
function KpiCanvas({
  data,
  metricIndex,
  selected,
  semester,
  semesterTrend,
  semesterProgressLabel,
  semesterActual,
  semesterTarget,
  semesterAchievement,
}: {
  data: Payload;
  metricIndex: number;
  selected: string;
  semester: 1 | 2;
  semesterTrend: TrendPoint[];
  semesterProgressLabel: string;
  semesterActual: number;
  semesterTarget: number;
  semesterAchievement: number;
}) {
  const activeMetricName = metricIndex === 0 ? "Strategic Initiative Execution" : "Timely Task";
  const sources = useMemo<CanvasSources>(() => {
    const rows = kpiRows(data.periods);
    return { kpi: { def: builtinSources.kpi, rows, records: rows } };
  }, [data]);
  // The semester months up to the picked period: what the built-ins always showed,
  // and the reference month (the last of them) for MoM/YoY/YTD widgets.
  const periodScope = useMemo(() => (semesterTrend.length ? semesterTrend.map((point) => point.key) : selected ? [selected] : null), [semesterTrend, selected]);
  const metricRule = useMemo(() => [{ field: "metric", op: "in" as const, values: [data.periods[0]?.metrics[metricIndex]?.label ?? activeMetricName] }], [data, metricIndex, activeMetricName]);

  const builtins = useMemo<BuiltinWidget[]>(
    () => [
      {
        id: "summary",
        title: "Ringkasan pencapaian semester",
        kind: "card",
        w: 5,
        h: 8,
        spec: {
          title: `Pencapaian ${activeMetricName}`,
          subtitle: activeMetricName,
          source: "kpi",
          chart: "card",
          view: "kpi-summary",
          measures: [{ field: "actual", agg: "sum" }],
          filters: metricRule,
          card: { display: "progress", target: { field: "target" } },
          options: { followPeriodFilter: true },
        },
        render: () => (
          <article className="grid h-full min-h-[260px] grid-rows-[auto_1fr_auto] gap-4 rounded-lg border border-border bg-card p-4 sm:min-h-[340px]">
            <div className="overflow-hidden rounded-md border border-[var(--kpi-table-border)]">
              <div className="grid grid-cols-[1.55fr_repeat(3,0.85fr)] bg-[var(--kpi-table-header)] text-center text-xs font-bold text-[var(--kpi-table-text)]">
                <span className="px-2 py-3">Indikator KPI {semester === 1 ? "S1" : "S2"}</span>
                <span className="border-l border-[var(--kpi-table-border)] px-2 py-3">Realisasi</span>
                <span className="border-l border-[var(--kpi-table-border)] px-2 py-3">Target</span>
                <span className="border-l border-[var(--kpi-table-border)] px-2 py-3">Prosentase</span>
              </div>
              <div className="grid grid-cols-[1.55fr_repeat(3,0.85fr)] border-t border-[var(--kpi-table-border)] text-center text-xs font-bold text-[var(--kpi-table-text)]">
                <span className="flex items-center justify-center bg-[var(--kpi-table-body)] px-2 py-4 sm:px-3">{activeMetricName}</span>
                <span className="flex items-center justify-center border-l border-[var(--kpi-table-border)] bg-[var(--kpi-table-alt)] px-2 py-4">{fmt(semesterActual)}</span>
                <span className="flex items-center justify-center border-l border-[var(--kpi-table-border)] bg-[var(--kpi-table-body)] px-2 py-4">{fmt(semesterTarget)}</span>
                <span className="flex items-center justify-center border-l border-[var(--kpi-table-border)] bg-[var(--kpi-table-alt)] px-2 py-4">{fmt(semesterAchievement)}%</span>
              </div>
            </div>
            <div className="grid place-items-center py-1 text-center">
              <AchievementRing key={`${semester}-${selected}`} percent={semesterAchievement} />
            </div>
            <p className="text-center text-sm font-bold leading-6">
              Realisasi {semesterProgressLabel} mencapai Rp {fmt(semesterActual)} Miliar dari target sebesar Rp {fmt(semesterTarget)} Miliar
            </p>
          </article>
        ),
      },
      {
        id: "trend",
        title: `Tren ${activeMetricName}`,
        kind: "chart",
        w: 7,
        h: 8,
        spec: {
          title: `Tren ${activeMetricName}`,
          source: "kpi",
          chart: "line",
          dimension: "periodKey",
          measures: [
            { field: "actual", agg: "sum", color: "coral", label: "Realisasi" },
            { field: "target", agg: "sum", color: "turquoise", label: "Target Bulanan" },
          ],
          filters: metricRule,
          timeMode: "monthly",
          limit: 12,
          format: "miliar",
          options: { trendline: true, followPeriodFilter: true, appendPeriodLabel: true },
        },
        render: () => (
          <ChartPanel className="h-full min-h-[260px] sm:min-h-[340px]" title={`Tren ${activeMetricName} - ${semesterProgressLabel}`}>
            <TrendChart
              points={semesterTrend}
              series={[
                { key: "actual", label: "Realisasi", color: "#FF6B6B" },
                { key: "target", label: "Target Bulanan", color: "#4ECDC4" },
                { key: "actualTrend", label: "Tren Aktual", color: "#174D55" },
              ]}
              valueFormatter={(value) => `${fmt(value)} M`}
            />
          </ChartPanel>
        ),
      },
      {
        id: "monthly-table",
        title: "Tabel target & realisasi per bulan",
        kind: "panel",
        w: 12,
        h: 3,
        spec: {
          title: "Tabel target & realisasi per bulan",
          subtitle: activeMetricName,
          source: "kpi",
          chart: "table",
          view: "kpi-table",
          dimension: "periodKey",
          measures: [
            { field: "target", agg: "sum", label: "Target" },
            { field: "actual", agg: "sum", label: "Realisasi" },
          ],
          filters: metricRule,
          timeMode: "monthly",
          limit: 12,
          options: { followPeriodFilter: true },
        },
        render: () => (
          <div className="h-full overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full min-w-180 text-center text-xs">
              <thead className="bg-[var(--kpi-table-header)] text-[var(--kpi-table-text)]">
                <tr>
                  <th colSpan={2} className="min-w-56 px-3 py-2 text-left">
                    KETERANGAN
                  </th>
                  <th className="min-w-22 px-2 py-2">
                    Total
                    <br />
                    End year
                  </th>
                  {semesterTrend.map((item) => (
                    <th key={item.key} className="min-w-16 px-2 py-2">
                      {item.label.split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[var(--kpi-table-text)]">
                <tr className="border-t border-[var(--kpi-table-border)] transition-colors hover:bg-turquoise/5">
                  <th rowSpan={2} className="bg-[var(--kpi-table-header)] px-3 py-3 text-left">
                    {activeMetricName}
                  </th>
                  <th className="bg-[var(--kpi-table-body)] px-2 py-2">Target</th>
                  <td className="bg-[var(--kpi-table-body)] px-2 py-2 font-bold">{fmt(semesterTarget)}</td>
                  {semesterTrend.map((item) => (
                    <td key={item.key} className="bg-[var(--kpi-table-body)] px-2 py-2">
                      {fmt(item.target)}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[var(--kpi-table-border)]">
                  <th className="bg-[var(--kpi-table-body)] px-2 py-2">Realisasi</th>
                  <td className="bg-[var(--kpi-table-alt)] px-2 py-2 font-bold">{fmt(semesterActual)}</td>
                  {semesterTrend.map((item) => (
                    <td key={item.key} className="bg-[var(--kpi-table-alt)] px-2 py-2">
                      {fmt(item.actual)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
    ],
    [activeMetricName, metricRule, semester, selected, semesterTrend, semesterProgressLabel, semesterActual, semesterTarget, semesterAchievement],
  );

  return <DashboardCanvas builtins={builtins} sources={sources} primarySource="kpi" periodScope={periodScope} periodLabel={semesterProgressLabel} periodTag={semester === 1 ? "S1" : "S2"} />;
}

function latestPeriodKey(payload?: Payload | null) {
  return payload?.periods[0]?.periodKey ?? "";
}

function semesterOf(periodKey: string): 1 | 2 {
  return periodKey && Number(periodKey.slice(5, 7)) > 6 ? 2 : 1;
}

export default function KpiDashboard({ embedded = false, metricIndex = 0, initialData }: { embedded?: boolean; metricIndex?: 0 | 1; initialData?: Payload }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  // Embedded in the dashboard shell, which already owns <main> and the <h1>.
  const Root = embedded ? "div" : "main";
  const Heading = embedded ? "h2" : "h1";
  const [semester, setSemester] = useState<1 | 2>(() => semesterOf(latestPeriodKey(initialData)));
  const [data, setData] = useState<Payload | null>(initialData ?? null);
  const [selected, setSelected] = useState(() => latestPeriodKey(initialData));
  const [loading, setLoading] = useState(!initialData);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fallback when the server render couldn't load the data.
  useEffect(() => {
    if (initialData) return;
    fetch("/api/kpi-dashboard", { cache: "no-store" })
      .then(async (r) => {
        const p = await r.json();
        if (!r.ok) throw new Error(p.error);
        setData(p);
        const latestKey = p.periods[0]?.periodKey ?? "";
        setSelected(latestKey);
        if (latestKey) setSemester(Number(latestKey.slice(5, 7)) <= 6 ? 1 : 2);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Data KPI tidak dapat dimuat."))
      .finally(() => setLoading(false));
  }, [initialData]);

  const period = useMemo(() => data?.periods.find((p) => p.periodKey === selected) ?? data?.periods[0], [data, selected]);

  const makeTrend = (metricIndex: number) => {
    const points = [...(data?.periods ?? [])]
      .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
      .map((p) => ({ key: p.periodKey, label: p.label, target: p.metrics[metricIndex]?.target ?? 0, actual: p.metrics[metricIndex]?.actual ?? 0 }));
    const count = points.length;
    const meanX = (count - 1) / 2;
    const meanY = count ? points.reduce((sum, p) => sum + p.actual, 0) / count : 0;
    const denominator = points.reduce((sum, _, index) => sum + (index - meanX) ** 2, 0);
    const slope = denominator ? points.reduce((sum, p, index) => sum + (index - meanX) * (p.actual - meanY), 0) / denominator : 0;
    return points.map((p, index) => ({ ...p, actualTrend: meanY + slope * (index - meanX) }));
  };

  const activeTrend = makeTrend(metricIndex);
  const selectedMonth = Number(period?.periodKey.slice(5, 7)) || 12;
  const semesterTrend = activeTrend.filter((item) => {
    const month = Number(item.key.slice(5, 7));
    return (semester === 1 ? month <= 6 : month >= 7) && month <= selectedMonth;
  });
  const semesterLabel = semester === 1 ? "Semester 1" : "Semester 2";
  const semesterEnd = semester === 1 ? "Jun" : "Des";
  const semesterFirst = semesterTrend[0];
  const semesterLast = semesterTrend.at(-1);
  const semesterProgressLabel = semesterFirst && semesterLast ? `${semesterLabel} berjalan (${semesterFirst.label.split(" ")[0]}–${semesterLast.label})` : semesterLabel;
  const semesterComplete = Number(semesterLast?.key.slice(5, 7)) === (semester === 1 ? 6 : 12);
  const semesterActual = semesterTrend.reduce((sum, item) => sum + item.actual, 0);
  const semesterTarget = semesterTrend.reduce((sum, item) => sum + item.target, 0);
  const semesterAchievement = semesterTarget ? (semesterActual / semesterTarget) * 100 : 0;

  async function upload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      let r: Response;
      if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        const f = new FormData();
        f.append("file", file);
        r = await fetch("/api/kpi-dashboard", { method: "POST", body: f });
      } else {
        const extension = file.name.toLowerCase().endsWith(".xlsx") ? ".xlsx" : ".xls";
        // Loaded on demand so the Blob client never weighs on page load.
        const { uploadPresigned } = await import("@vercel/blob/client");
        const blob = await uploadPresigned(`kpi/${crypto.randomUUID()}${extension}`, file, {
          access: "private",
          handleUploadUrl: "/api/kpi-dashboard/blob",
          contentType: file.type || "application/vnd.ms-excel",
          multipart: file.size > 4 * 1024 * 1024,
        });
        r = await fetch("/api/kpi-dashboard/blob/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pathname: blob.pathname }),
        });
      }
      const contentType = r.headers.get("content-type") ?? "";
      const p = contentType.includes("application/json") ? await r.json() : { error: await r.text() };
      if (!r.ok) throw new Error(r.status === 413 ? "Ukuran file melebihi batas server." : p.error || "Upload KPI gagal.");
      setData(p);
      const latestKey = p.upsertedPeriods?.at(-1)?.periodKey ?? p.periods[0]?.periodKey ?? "";
      setSelected(latestKey);
      if (latestKey) setSemester(Number(latestKey.slice(5, 7)) <= 6 ? 1 : 2);
      notify.success("Workbook KPI tersimpan", file.name);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Workbook KPI tidak bisa diproses.";
      setError(message);
      notify.error("Upload KPI gagal", message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <Root className={embedded ? "text-teal" : "min-h-screen bg-background px-4 py-6 text-teal md:px-8"}>
      <TopProgress active={uploading} />
      <input
        ref={input}
        className="hidden"
        type="file"
        aria-label="Pilih workbook KPI"
        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => void upload(e.target.files)}
      />
      <div className="mx-auto max-w-[1500px] space-y-3">
        <header data-animate-block className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-turquoise-ink">KPI</p>
            <Heading className="text-2xl font-bold tracking-tight">
              {metricIndex === 0 ? "KPI Strategic Initiative Execution DS 2026" : "KPI Timely Task DS 2026"}
            </Heading>
          </div>
          <div className="flex flex-wrap gap-2">
            {data && data.periods.length > 0 ? (
              <Select value={selected} onValueChange={(value) => { setSelected(value); setSemester(Number(value.slice(5, 7)) <= 6 ? 1 : 2); }}>
                <SelectTrigger aria-label="Pilih periode KPI" className="h-10 min-w-32 bg-card">
                  <SelectValue>{period?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {data.periods.map((p) => (
                    <SelectItem key={p.periodKey} value={p.periodKey}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <MagneticButton onClick={() => input.current?.click()} disabled={uploading}>
              <Icon icon={uploading ? Loading03Icon : CloudUploadIcon} className={uploading ? "animate-spin" : undefined} />
              {uploading ? "Mengunggah…" : "Upload KPI"}
            </MagneticButton>
          </div>
        </header>

        {period ? (
          <div data-animate-block>
            <SegmentedControl
              ariaLabel="Pilih semester"
              value={semester}
              onChange={setSemester}
              options={[
                { value: 1, label: "Semester 1" },
                { value: 2, label: "Semester 2" },
              ]}
            />
          </div>
        ) : null}

        {error ? (
          <Banner tone="danger" title="Terjadi kendala" dismissible>
            {error}
          </Banner>
        ) : null}

        {loading ? (
          <DashboardSkeleton kpis={2} panels={2} />
        ) : !period ? (
          <DropZone
            title="Upload workbook KPI"
            description="Gunakan file .xls/.xlsx yang berisi sheet KPI Otobos dan data sumber."
            buttonLabel="Pilih workbook KPI"
            busy={uploading}
            onPick={() => input.current?.click()}
            onDrop={(files) => void upload(files)}
            className="min-h-80"
          />
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {period.sourceFilename} | {period.rawSheetCount} sheet data tervalidasi
            </p>
            <Banner tone={semesterComplete ? "success" : "info"} title={`${semesterProgressLabel}.`}>
              {semesterComplete ? "Data semester sudah lengkap." : `Data semester lengkap setelah ${semesterEnd} di-upload.`}
            </Banner>
            <KpiCanvas
              data={data!}
              metricIndex={metricIndex}
              selected={period.periodKey}
              semester={semester}
              semesterTrend={semesterTrend}
              semesterProgressLabel={semesterProgressLabel}
              semesterActual={semesterActual}
              semesterTarget={semesterTarget}
              semesterAchievement={semesterAchievement}
            />
          </>
        )}
      </div>
    </Root>
  );
}
