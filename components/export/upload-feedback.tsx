import { CheckCircle2, Loader2 } from "lucide-react";

export function ExportUploadProgress() {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-[#ffd166]/25 bg-[#ffd166]/10 p-3 text-sm text-[#ffd166]">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      Mengunggah dan menyimpan data Ekspor. Proses ini bisa memakan waktu beberapa menit untuk file besar.
    </p>
  );
}

export function ExportUploadSuccess({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-[#70f0bf]/25 bg-[#70f0bf]/10 p-3 text-sm text-[#70f0bf]">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}
