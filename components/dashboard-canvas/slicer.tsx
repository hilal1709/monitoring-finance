"use client";

import { FilterPanel } from "@/components/dashboard/filter-panel";
import { PeriodModeSelector } from "@/components/dashboard/period-mode-selector";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { periodLabel } from "@/lib/chart-builder/time-intel";
import type { FilterConfig } from "@/lib/chart-builder/types";
import type { PeriodMode } from "@/lib/dashboard-types";

const ALL = "__all__";

function label(field: string, value: string) {
  return field === "periodKey" && /^\d{4}-\d{2}$/.test(value) ? periodLabel(value) : value;
}

/** A page filter placed on the canvas (Power BI "slicer"). */
export function Slicer({
  config,
  options,
  values,
  onChange,
  periodMode,
  onPeriodModeChange,
}: {
  config: FilterConfig;
  /** Distinct values of the field across the page's rows. */
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  periodMode: PeriodMode;
  onPeriodModeChange: (value: PeriodMode) => void;
}) {
  const title = config.label || "Filter";
  const box = "flex h-full flex-col justify-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5";
  const caption = <span className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-teal/90">{title}</span>;

  if (config.control === "period-mode") {
    return (
      <div className={box}>
        {caption}
        <PeriodModeSelector value={periodMode} onChange={onPeriodModeChange} />
      </div>
    );
  }

  if (config.control === "multi") {
    return (
      <FilterPanel
        title={title}
        items={options.map((option) => label(config.field, option))}
        columns={options.length > 8 ? 2 : 1}
        selected={values.map((value) => label(config.field, value))}
        onToggle={(shown) => {
          const value = options.find((option) => label(config.field, option) === shown) ?? shown;
          onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
        }}
        onClear={() => onChange([])}
        compact
      />
    );
  }

  if (config.control === "segmented") {
    const choices = [{ value: ALL, label: "Semua" }, ...options.slice(0, 5).map((option) => ({ value: option, label: label(config.field, option) }))];
    return (
      <div className={box}>
        {caption}
        <SegmentedControl size="xs" ariaLabel={title} value={values[0] ?? ALL} options={choices} onChange={(value) => onChange(value === ALL ? [] : [value])} className="max-w-full overflow-x-auto" />
      </div>
    );
  }

  if (config.control === "search") {
    return (
      <label className={box}>
        {caption}
        <Input value={values[0] ?? ""} placeholder="Ketik untuk mencari…" className="h-7 text-xs" onChange={(event) => onChange(event.target.value ? [event.target.value] : [])} />
      </label>
    );
  }

  if (config.control === "reference-period") {
    return (
      <div className={box}>
        {caption}
        <Select value={values[0] ?? ALL} onValueChange={(value) => onChange(value === ALL ? [] : [value])}>
          <SelectTrigger aria-label={title} className="h-7 bg-muted text-xs font-semibold">
            <SelectValue>{values[0] ? periodLabel(values[0]) : "Bulan terakhir"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Bulan terakhir</SelectItem>
            {[...options].reverse().map((option) => (
              <SelectItem key={option} value={option}>
                {periodLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // period-range: [from, to]
  const [from = "", to = ""] = values;
  const pick = (index: 0 | 1, value: string) => {
    const next = [from, to];
    next[index] = value === ALL ? "" : value;
    onChange(next[0] || next[1] ? next : []);
  };
  return (
    <div className={box}>
      {caption}
      <div className="grid grid-cols-2 gap-1">
        {([0, 1] as const).map((index) => (
          <Select key={index} value={(index === 0 ? from : to) || ALL} onValueChange={(value) => pick(index, value)}>
            <SelectTrigger aria-label={`${title} ${index === 0 ? "dari" : "sampai"}`} className="h-7 bg-muted text-xs font-semibold">
              <SelectValue>{(index === 0 ? from : to) ? periodLabel(index === 0 ? from : to) : index === 0 ? "Dari awal" : "Sampai akhir"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{index === 0 ? "Dari awal" : "Sampai akhir"}</SelectItem>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {periodLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
    </div>
  );
}
