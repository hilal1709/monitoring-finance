"use client";

import { Banner } from "@/components/ui/banner";

export function ExportUploadProgress() {
  return (
    <Banner tone="warning" title="Sedang memproses">
      Mengunggah dan menyimpan data Ekspor. Proses ini bisa memakan waktu beberapa menit untuk file besar.
    </Banner>
  );
}

export function ExportUploadSuccess({ message }: { message: string }) {
  return <Banner tone="success" title={message} dismissible />;
}
