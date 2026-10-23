"use client";

import { useCallback, useEffect, useState } from "react";
import type { PageLayout, SourceId } from "@/lib/chart-builder/types";
import { isBuiltin } from "@/lib/chart-builder/types";
import type { CanvasSource, CanvasSources } from "@/components/dashboard-canvas/canvas-content";

// Uploaded datasets are fetched only when a widget on the page uses one (or the
// editor picks one); the loader itself is a lazy chunk.

export function useDatasetSources(layout: PageLayout) {
  const [loaded, setLoaded] = useState<CanvasSources>({});
  const wanted = Object.values(layout.widgets)
    .flatMap((widget) => (!isBuiltin(widget) && widget.source.startsWith("dataset:") ? [widget.source.slice(8)] : []))
    .filter((id, index, list) => list.indexOf(id) === index)
    .join(",");

  const add = useCallback((id: string, source: CanvasSource) => setLoaded((current) => ({ ...current, [`dataset:${id}`]: source })), []);

  useEffect(() => {
    const missing = (wanted ? wanted.split(",") : []).filter((id) => !loaded[`dataset:${id}` as SourceId]);
    if (!missing.length) return;
    void import("@/components/dashboard-canvas/dataset-loader").then(({ fetchDatasetSource }) => {
      for (const id of missing) {
        fetchDatasetSource(id)
          .then((source) => add(id, source))
          .catch(() => undefined);
      }
    });
  }, [wanted, loaded, add]);

  return { datasetSources: loaded, addDatasetSource: add };
}
