import { datasetDef, withDerivedFields, type DatasetMeta } from "@/lib/chart-builder/datasets";
import type { Row } from "@/lib/chart-builder/types";
import { unpackRows, type PackedRows } from "@/lib/packed-rows";
import type { CanvasSource } from "@/components/dashboard-canvas/canvas-content";

// Downloads uploaded datasets (module cache: each one once per visit). Imported
// lazily by use-datasets so pages without uploaded data never load it.

const cache = new Map<string, Promise<CanvasSource>>();

function toSource(meta: DatasetMeta, rows: Row[]): CanvasSource {
  const derived = withDerivedFields(rows);
  return { def: datasetDef(meta), rows: derived, records: derived };
}

export function fetchDatasetSource(id: string): Promise<CanvasSource> {
  let pending = cache.get(id);
  if (!pending) {
    pending = fetch(`/api/datasets/${id}`)
      .then(async (response) => {
        const payload = (await response.json()) as { dataset?: DatasetMeta & { rows: PackedRows<Row> }; error?: string };
        if (!response.ok || !payload.dataset) throw new Error(payload.error ?? "Data upload tidak dapat dimuat.");
        return toSource(payload.dataset, unpackRows(payload.dataset.rows));
      })
      .catch((error) => {
        cache.delete(id);
        throw error;
      });
    cache.set(id, pending);
  }
  return pending;
}

/** Registers a just-uploaded dataset without a round trip. */
export function primeDatasetSource(meta: DatasetMeta, rows: Row[]) {
  const source = toSource(meta, rows);
  cache.set(meta.id, Promise.resolve(source));
  return source;
}
