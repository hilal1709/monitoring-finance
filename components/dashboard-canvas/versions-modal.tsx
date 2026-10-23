"use client";

import { useEffect, useState } from "react";
import { SaveLayoutIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { ChartLoader } from "@/components/ui/chart-loader";
import { Modal } from "@/components/ui/modal";
import { notify } from "@/components/ui/notify";
import { formatTimestamp } from "@/lib/dashboard-format";
import type { PageLayout } from "@/lib/chart-builder/types";

type Version = { id: number; createdAt: string; widgetCount: number };

/** Lists the last saves of this page and restores one. */
export default function VersionsModal({ view, onRestored, onClose }: { view: string; onRestored: (layout: PageLayout) => void; onClose: () => void }) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/layouts/${view}?versions`)
      .then((response) => response.json() as Promise<{ versions?: Version[] }>)
      .then((payload) => setVersions(payload.versions ?? []))
      .catch(() => setVersions([]));
  }, [view]);

  async function restore(id: number) {
    setRestoring(id);
    try {
      const response = await fetch(`/api/layouts/${view}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restore: id }) });
      const payload = (await response.json()) as { layout?: PageLayout; error?: string };
      if (!response.ok || !payload.layout) throw new Error(payload.error);
      notify.success("Versi dipulihkan");
      onRestored(payload.layout);
    } catch (error) {
      notify.error("Gagal memulihkan", error instanceof Error ? error.message : undefined);
    } finally {
      setRestoring(null);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      art={<SaveLayoutIllustration className="h-20" />}
      title="Riwayat versi"
      description="20 simpanan terakhir halaman ini. Memulihkan versi juga tercatat di riwayat."
      className="sm:max-w-md"
    >
      {versions === null ? (
        <ChartLoader label="Memuat riwayat" size="sm" className="py-6" />
      ) : versions.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Belum ada versi tersimpan.</p>
      ) : (
        <ol className="grid max-h-80 gap-1.5 overflow-y-auto text-left">
          {versions.map((version, index) => (
            <li key={version.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <span>
                <span className="block text-xs font-bold text-teal">{formatTimestamp(version.createdAt)}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {version.widgetCount} widget{index === 0 ? " · versi terbaru" : ""}
                </span>
              </span>
              <Button type="button" size="sm" variant="outline" disabled={restoring !== null} onClick={() => void restore(version.id)}>
                {restoring === version.id ? "Memulihkan…" : "Pulihkan"}
              </Button>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
