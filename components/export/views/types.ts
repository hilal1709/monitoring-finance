import type { CanvasSources } from "@/components/dashboard-canvas/canvas";

/** What every export view hands to its canvas. */
export type ExportCanvasProps = {
  sources: CanvasSources;
  /** The toolbar's period ("Semua Periode" → null). */
  periodScope: string[] | null;
};
