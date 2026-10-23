"use client";

import { useMemo, useState } from "react";
import { PickDataIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { newId } from "@/components/dashboard-canvas/layout-utils";
import type { FilterConfig, FilterControl, SourceDef, SourceId } from "@/lib/chart-builder/types";
import { cn } from "@/lib/utils";

const controls: { value: FilterControl; label: string; hint: string; periodOnly?: boolean; noField?: boolean }[] = [
  { value: "multi", label: "Daftar pilihan", hint: "Centang satu atau beberapa nilai." },
  { value: "segmented", label: "Tombol", hint: "Tombol berjajar untuk 2–5 pilihan, mis. External / Group." },
  { value: "search", label: "Kotak cari", hint: "Ketik sebagian nama untuk menyaring." },
  { value: "period-range", label: "Rentang periode", hint: "Dari bulan … sampai bulan …", periodOnly: true },
  { value: "reference-period", label: "Periode acuan", hint: "Bulan yang dipakai MoM / YoY / YTD. Default: bulan terakhir yang ada datanya.", periodOnly: true },
  { value: "period-mode", label: "Tombol MoM / YoY / YTD", hint: "Mengubah perbandingan semua widget yang memilih \"ikuti halaman\".", noField: true },
];

/** Add or change a page filter: which column, which control, which widgets it filters. */
export default function FilterEditor({
  config,
  sourceDefs,
  widgets,
  onApply,
  onClose,
}: {
  config: FilterConfig | null;
  sourceDefs: Partial<Record<SourceId, SourceDef>>;
  widgets: { id: string; title: string }[];
  onApply: (config: FilterConfig) => void;
  onClose: () => void;
}) {
  const fields = useMemo(() => {
    const seen = new Map<string, string>();
    for (const def of Object.values(sourceDefs)) {
      if (!def || def.id.startsWith("dataset:")) continue;
      for (const field of def.fields) if (field.kind !== "measure" && !seen.has(field.id)) seen.set(field.id, field.label);
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [sourceDefs]);

  const [control, setControl] = useState<FilterControl>(config?.control ?? "multi");
  const [field, setField] = useState(config?.field ?? fields.find((item) => item.id !== "periodKey")?.id ?? "periodKey");
  const [label, setLabel] = useState(config?.label ?? "");
  const [targets, setTargets] = useState<string[] | undefined>(config?.targets);
  const meta = controls.find((item) => item.value === control)!;
  const effectiveField = meta.periodOnly || meta.noField ? "periodKey" : field;
  const fallbackLabel = meta.noField ? "Mode periode" : control === "reference-period" ? "Periode acuan" : (fields.find((item) => item.id === effectiveField)?.label ?? "Filter");

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      art={<PickDataIllustration className="h-20" />}
      title={config ? "Ubah filter" : "Tambah filter"}
      description="Filter muncul sebagai kotak di dashboard dan bisa digeser seperti widget lain."
      align="start"
      className="sm:max-w-lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={() => onApply({ id: config?.id ?? newId("f"), field: effectiveField, label: label.trim() || fallbackLabel, control, ...(targets ? { targets } : {}) })}
          >
            {config ? "Terapkan" : "Tambahkan"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 text-left">
        <div className="grid gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-teal/80">Bentuk filter</span>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {controls.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setControl(item.value)}
                className={cn("rounded-lg border p-2 text-left", control === item.value ? "border-turquoise bg-turquoise/10 ring-1 ring-turquoise" : "border-border hover:border-turquoise/60")}
              >
                <span className="block text-xs font-bold text-teal">{item.label}</span>
                <span className="block text-[11px] text-muted-foreground">{item.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {!meta.periodOnly && !meta.noField ? (
          <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-teal/80">
            Kolom yang disaring
            <Select value={field} onValueChange={setField}>
              <SelectTrigger className="bg-white text-xs font-semibold normal-case">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fields.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}

        <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wide text-teal/80">
          Judul filter
          <Input value={label} placeholder={fallbackLabel} onChange={(event) => setLabel(event.target.value)} />
        </label>

        {!meta.noField && control !== "reference-period" ? (
          <div className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-teal/80">Berlaku untuk</span>
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant={targets ? "outline" : "default"} onClick={() => setTargets(undefined)}>
                Semua widget
              </Button>
              <Button type="button" size="sm" variant={targets ? "default" : "outline"} onClick={() => setTargets(targets ?? widgets.map((widget) => widget.id))}>
                Pilih widget
              </Button>
            </div>
            {targets ? (
              <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg bg-muted/40 p-2">
                {widgets.map((widget) => (
                  <label key={widget.id} className="flex items-center gap-2 text-xs font-semibold text-teal">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--palette-turquoise)]"
                      checked={targets.includes(widget.id)}
                      onChange={(event) => setTargets(event.target.checked ? [...targets, widget.id] : targets.filter((id) => id !== widget.id))}
                    />
                    {widget.title}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
