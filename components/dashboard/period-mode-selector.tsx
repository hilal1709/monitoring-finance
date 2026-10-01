"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { periodModeOptions } from "@/lib/dashboard-constants";
import type { PeriodMode } from "@/lib/dashboard-types";

export function PeriodModeSelector({ value, onChange }: { value: PeriodMode; onChange: (value: PeriodMode) => void }) {
  return <SegmentedControl size="xs" ariaLabel="Mode periode" value={value} options={[...periodModeOptions]} onChange={onChange} />;
}
