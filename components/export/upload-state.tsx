"use client";

import { ShipExportIllustration } from "@/components/illustrations";
import { Banner } from "@/components/ui/banner";
import { DropZone } from "@/components/ui/drop-zone";
import { ExportUploadProgress, ExportUploadSuccess } from "@/components/export/upload-feedback";

export function ExportUploadState({
  uploading,
  error,
  successMessage,
  onPick,
  onDrop,
}: {
  uploading: boolean;
  error: string | null;
  successMessage: string | null;
  onPick: () => void;
  onDrop: (files: FileList | null) => void;
}) {
  return (
    <DropZone
      title="Upload Data Ekspor"
      description="Workbook harus memiliki sheet Data Ekspor."
      buttonLabel="Upload Excel Ekspor"
      busyLabel="Mengunggah & menyimpan…"
      busy={uploading}
      onPick={onPick}
      onDrop={onDrop}
      art={<ShipExportIllustration className="h-36" />}
      className="min-h-[calc(100vh-7rem)]"
    >
      {uploading ? <ExportUploadProgress /> : null}
      {successMessage ? <ExportUploadSuccess message={successMessage} /> : null}
      {error ? (
        <Banner tone="danger" title="Upload gagal">
          {error}
        </Banner>
      ) : null}
    </DropZone>
  );
}
