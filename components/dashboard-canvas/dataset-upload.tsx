"use client";

import { useRef, useState } from "react";
import { UploadDatasetIllustration } from "@/components/illustrations";
import { primeDatasetSource } from "@/components/dashboard-canvas/dataset-loader";
import type { CanvasSource } from "@/components/dashboard-canvas/canvas-content";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { MultiStepLoader } from "@/components/ui/chart-loader";
import { DropZone } from "@/components/ui/drop-zone";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DATASET_MAX_BYTES, DATASET_MAX_ROWS, detectColumns, toRows, type DatasetColumn, type DatasetMeta } from "@/lib/chart-builder/datasets";
import type { FieldKind } from "@/lib/chart-builder/types";
import { packRows } from "@/lib/packed-rows";

const STEPS = ["Membaca file", "Mendeteksi kolom", "Menyimpan data", "Selesai"];

type Parsed = { fileName: string; sheets: string[]; sheet: string; headers: string[]; rows: unknown[][]; workbook: import("xlsx").WorkBook };

const kindLabels: Record<FieldKind, string> = { dimension: "Kelompok (teks)", measure: "Angka", period: "Tanggal / periode" };

/** Upload an Excel/CSV file as a new data source for the chart editor. */
export default function DatasetUpload({ onClose, onCreated }: { onClose: () => void; onCreated: (meta: DatasetMeta, source: CanvasSource) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [columns, setColumns] = useState<DatasetColumn[]>([]);
  const [name, setName] = useState("");
  const [step, setStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function readSheet(workbook: import("xlsx").WorkBook, sheet: string, fileName: string) {
    const XLSX = await import("xlsx");
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheet], { header: 1, defval: null, raw: true });
    // The header row is the first row with at least two filled cells.
    const headerIndex = Math.max(0, matrix.findIndex((row) => row.filter((cell) => cell !== null && cell !== "").length >= 2));
    const headers = (matrix[headerIndex] ?? []).map((cell, index) => (cell === null || cell === "" ? `Kolom ${index + 1}` : String(cell)));
    const rows = matrix.slice(headerIndex + 1);
    setParsed({ fileName, sheets: workbook.SheetNames, sheet, headers, rows, workbook });
    setColumns(detectColumns(headers, rows));
  }

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setStep(0);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      setStep(1);
      await readSheet(workbook, workbook.SheetNames[0], file.name);
      setName(file.name.replace(/\.(xlsx|xls|csv)$/i, ""));
      setStep(null);
    } catch {
      setStep(null);
      setError("File tidak bisa dibaca. Pastikan formatnya .xlsx, .xls, atau .csv.");
    }
  }

  async function save() {
    if (!parsed) return;
    setError(null);
    const rows = toRows(parsed.headers, parsed.rows, columns);
    if (rows.length === 0) return setError("Tidak ada baris data di sheet ini.");
    if (rows.length > DATASET_MAX_ROWS) return setError(`File berisi ${rows.length.toLocaleString("id-ID")} baris; maksimal ${DATASET_MAX_ROWS.toLocaleString("id-ID")}. Pisahkan file atau ringkas datanya.`);
    const body = JSON.stringify({ name, columns, rows: packRows(rows) });
    if (body.length > DATASET_MAX_BYTES) return setError("Data terlalu besar untuk diunggah sekaligus. Hapus kolom yang tidak dipakai lalu coba lagi.");
    setStep(2);
    try {
      const response = await fetch("/api/datasets", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      const payload = (await response.json()) as { dataset?: DatasetMeta; error?: string };
      if (!response.ok || !payload.dataset) throw new Error(payload.error ?? "Data tidak dapat disimpan.");
      setStep(3);
      const source = primeDatasetSource(payload.dataset, rows);
      window.setTimeout(() => onCreated(payload.dataset!, source), 500);
    } catch (caught) {
      setStep(null);
      setError(caught instanceof Error ? caught.message : "Data tidak dapat disimpan.");
    }
  }

  const setColumn = (index: number, patch: Partial<DatasetColumn>) =>
    setColumns((current) =>
      current.map((column, position) => {
        if (position !== index) return patch.kind === "period" && column.kind === "period" ? { ...column, kind: "dimension", id: `${column.id}_teks` } : column;
        const next = { ...column, ...patch };
        if (patch.kind === "period") next.id = "periodKey";
        else if (patch.kind && column.kind === "period") next.id = `kolom_${index + 1}`;
        if (patch.kind === "measure") next.format = "number";
        return next;
      }),
    );

  return (
    <Modal
      open
      onOpenChange={(open) => !open && step === null && onClose()}
      art={<UploadDatasetIllustration className="h-24" />}
      title="Upload data sendiri"
      description="Baris pertama berisi judul kolom. Kolom tanggal dipakai untuk tren dan MoM/YoY/YTD."
      align="start"
      className="sm:max-w-2xl"
      footer={
        parsed && step === null ? (
          <>
            <Button type="button" variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button type="button" variant="accent" onClick={() => void save()} disabled={!name.trim()}>
              Simpan & pakai
            </Button>
          </>
        ) : undefined
      }
    >
      <input ref={inputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" aria-label="Pilih file data" onChange={(event) => void pick(event.target.files)} />
      {error ? (
        <Banner tone="danger" title="Belum berhasil">
          {error}
        </Banner>
      ) : null}
      {step !== null ? (
        <MultiStepLoader steps={STEPS} current={step} />
      ) : !parsed ? (
        <DropZone title="Tarik file ke sini" description=".xlsx, .xls, atau .csv — maks. 50.000 baris" buttonLabel="Pilih file" busy={false} onPick={() => inputRef.current?.click()} onDrop={(files) => void pick(files)} />
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-teal/80">
              Nama data
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            {parsed.sheets.length > 1 ? (
              <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-teal/80">
                Sheet
                <Select value={parsed.sheet} onValueChange={(sheet) => void readSheet(parsed.workbook, sheet, parsed.fileName)}>
                  <SelectTrigger className="bg-white text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {parsed.sheets.map((sheet) => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ) : null}
          </div>
          <p className="text-xs font-semibold text-teal">
            {parsed.rows.length.toLocaleString("id-ID")} baris terbaca. Periksa jenis tiap kolom — ubah bila tebakan kami salah:
          </p>
          <div className="max-h-72 overflow-auto rounded-lg ring-1 ring-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--kpi-table-header)] text-left">
                <tr>
                  <th className="px-2 py-1.5">Kolom</th>
                  <th className="px-2 py-1.5">Jenis</th>
                  <th className="px-2 py-1.5">Contoh isi</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((column, index) => (
                  <tr key={column.source} className="odd:bg-white even:bg-[var(--kpi-table-alt)]">
                    <td className="px-2 py-1">
                      <Input value={column.label} className="h-7 text-xs" onChange={(event) => setColumn(index, { label: event.target.value })} aria-label={`Nama kolom ${column.source}`} />
                    </td>
                    <td className="px-2 py-1">
                      <Select value={column.kind} onValueChange={(kind) => setColumn(index, { kind: kind as FieldKind })}>
                        <SelectTrigger className="h-7 w-40 bg-white text-[11px] font-semibold" aria-label={`Jenis kolom ${column.label}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(kindLabels) as FieldKind[]).map((kind) => (
                            <SelectItem key={kind} value={kind}>
                              {kindLabels[kind]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="max-w-40 truncate px-2 py-1 text-muted-foreground">
                      {parsed.rows
                        .slice(0, 3)
                        .map((row) => {
                          const value = row[parsed.headers.indexOf(column.source)];
                          return value instanceof Date ? value.toLocaleDateString("id-ID") : String(value ?? "—");
                        })
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
