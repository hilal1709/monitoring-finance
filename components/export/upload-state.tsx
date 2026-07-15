import { FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <section
      className="grid min-h-[calc(100vh-7rem)] place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(event.dataTransfer.files);
      }}
    >
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-[#ffd166]/30 bg-[#ffd166]/10 text-[#ffd166]">
          <FileSpreadsheet className="h-7 w-7" />
        </div>
        <h3 className="mt-5 text-2xl font-bold text-[var(--app-fg)]">Upload Data Ekspor</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-fg)]">Workbook harus memiliki sheet Data Ekspor.</p>
        <Button className="mt-5 w-full rounded-lg bg-[#ffd166] text-[#211600] hover:bg-[#ffe29a]" disabled={uploading} onClick={onPick}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {uploading ? "Mengunggah & menyimpan..." : "Upload Excel Ekspor"}
        </Button>
        {uploading ? (
          <div className="mt-3 text-left">
            <ExportUploadProgress />
          </div>
        ) : null}
        <div className="mt-3 rounded-lg border border-dashed border-[var(--border)] p-4 text-xs text-[var(--muted-fg)]">atau drop file .xlsx di sini</div>
        {successMessage ? (
          <div className="mt-3 text-left">
            <ExportUploadSuccess message={successMessage} />
          </div>
        ) : null}
        {error ? <p className="mt-3 rounded-lg border border-[#ff7b72]/25 bg-[#ff7b72]/10 p-3 text-sm text-[#ff9f8e]">{error}</p> : null}
      </div>
    </section>
  );
}
