"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChartHistogramIcon, Loading03Icon, Target02Icon, CloudUploadIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/icon";
import { ChartPanel } from "@/components/export/chart-panel";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Banner } from "@/components/ui/banner";
import { DropZone } from "@/components/ui/drop-zone";
import { Confetti } from "@/components/ui/confetti";
import { MagneticButton } from "@/components/ui/magnetic-button";
import { TopProgress } from "@/components/ui/page-loader";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartSkeleton, DashboardSkeleton } from "@/components/ui/skeleton";
import { notify } from "@/components/ui/notify";
import { animate, ease, prefersReducedMotion } from "@/lib/motion";
import { useIsomorphicLayoutEffect } from "@/lib/use-reveal-animation";

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

const RING_RADIUS = 58;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Achievement ring that draws itself to the percentage and celebrates at ≥100%. */
function AchievementRing({ percent }: { percent: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [celebrate, setCelebrate] = useState(false);

  const finalOffset = RING_LENGTH * (1 - Math.min(Math.max(percent, 0), 100) / 100);

  // The arc is server-rendered at its final length; on the client it draws
  // itself from empty, then celebrates at >= 100%.
  useIsomorphicLayoutEffect(() => {
    const arc = ref.current?.querySelector("[data-ring-arc]");
    if (!arc) return;
    setCelebrate(false);
    if (prefersReducedMotion()) {
      setCelebrate(percent >= 100);
      return;
    }
    const animations = [
      ...animate(arc, [{ strokeDashoffset: `${RING_LENGTH}` }, { strokeDashoffset: `${finalOffset}` }], { duration: 1.4, ease: ease.outStrong, onComplete: () => setCelebrate(percent >= 100) }),
      ...animate(ref.current, [{ scale: "0.85", rotate: "-8deg" }, { scale: "1", rotate: "0deg" }], { duration: 0.8, ease: ease.backStrong }),
    ];
    return () => animations.forEach((animation) => animation.cancel());
  }, [percent]);

  return (
    <div ref={ref} className="relative grid size-40 place-items-center">
      <svg viewBox="0 0 140 140" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="70" cy="70" r={RING_RADIUS} fill="none" stroke="var(--palette-yellow)" strokeOpacity="0.45" strokeWidth="12" />
        <circle
          data-ring-arc
          cx="70"
          cy="70"
          r={RING_RADIUS}
          fill="none"
          stroke={percent >= 100 ? "var(--palette-turquoise)" : "var(--palette-coral)"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={finalOffset}
        />
      </svg>
      <div className="grid size-[104px] place-items-center rounded-full bg-teal text-center text-mint shadow-[0_12px_30px_-12px_rgba(26,83,92,0.8)]">
        <div>
          <p className="whitespace-nowrap text-xl font-black leading-none tabular-nums">
            <AnimatedNumber value={percent} format={(value) => `${fmt(value)}%`} />
          </p>
          <p className="mt-1 px-2 text-[10px] font-bold leading-3">Pencapaian Terhadap Target</p>
        </div>
      </div>
      {celebrate ? <Confetti /> : null}
    </div>
  );
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
  const activeMetricName = metricIndex === 0 ? "Strategic Initiative Execution" : "Timely Task";
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
            <section data-animate-block className="grid items-stretch gap-3 xl:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.22fr)]">
              <article className="grid min-h-[260px] grid-rows-[auto_1fr_auto] sm:min-h-[340px] gap-4 rounded-lg border border-border bg-card p-4">
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
              <ChartPanel className="min-h-[260px] sm:min-h-[340px]" title={`Tren ${activeMetricName} - ${semesterProgressLabel}`}>
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
            </section>

            <section className="hidden">
              {[period.metrics[metricIndex]]
                .filter((m): m is Metric => Boolean(m))
                .map((m) => (
                  <article key={m.label} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-teal">
                      <Icon icon={metricIndex === 0 ? Target02Icon : ChartHistogramIcon} className="size-5" />
                      <h2 className="font-bold">{m.label}</h2>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Realisasi</p>
                        <p className="mt-1 text-xl font-black">{fmt(m.actual)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Target</p>
                        <p className="mt-1 text-xl font-black">{fmt(m.target)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Capaian</p>
                        <p className="mt-1 text-xl font-black">{m.target ? fmt((m.actual / m.target) * 100) : "0"}%</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded bg-teal/8">
                      <div className="h-full bg-sun" style={{ width: `${Math.min(100, m.target ? (m.actual / m.target) * 100 : 0)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Target akhir tahun: {fmt(m.yearTarget)} Rp miliar</p>
                  </article>
                ))}
            </section>

            <section data-animate-block className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
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
            </section>

            <section className="hidden rounded-lg border border-border bg-card p-4">
              <h2 className="font-bold">Perbandingan KPI per Periode</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-160 text-sm">
                  <thead className="border-b border-border text-left text-muted-foreground">
                    <tr>
                      <th className="pb-2">Periode</th>
                      <th className="pb-2">{activeMetricName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data!.periods].reverse().map((p) => (
                      <tr key={p.periodKey} className="border-b border-border">
                        <td className="py-3 font-semibold">{p.label}</td>
                        <td className="py-3">
                          {fmt(p.metrics[metricIndex]?.actual ?? 0)} / {fmt(p.metrics[metricIndex]?.target ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </Root>
  );
}
