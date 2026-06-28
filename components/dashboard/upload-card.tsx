import { CheckCircle2, Loader2, ReceiptText, UploadCloud, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { compactFileName, formatCurrency, formatNumber } from "@/lib/dashboard-format";
import type { LoadedReport } from "@/lib/dashboard-types";
import type { WorkbookRole } from "@/lib/monitoring-dashboard-types";

export function UploadCard({
  role,
  title,
  description,
  isLoading,
  loaded,
  error,
  onPick,
  onDrop,
}: {
  role: WorkbookRole;
  title: string;
  description: string;
  isLoading: boolean;
  loaded?: LoadedReport;
  error?: string;
  onPick: () => void;
  onDrop: (files: FileList) => void;
}) {
  const Icon = role === "invoice" ? ReceiptText : Wallet;
  const accent = role === "invoice" ? "text-[#ffd166] border-[#ffd166]/30 bg-[#ffd166]/10" : "text-[#70f0bf] border-[#70f0bf]/30 bg-[#70f0bf]/10";

  return (
    <Card
      data-animate-block
      id={role === "invoice" ? "upload-invoice" : "upload-payment"}
      className="border-white/10 bg-[#0c1724]/90 shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(event.dataTransfer.files);
      }}
    >
      <CardHeader className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className={cn("grid h-12 w-12 place-items-center rounded-lg border", accent)}>
            <Icon className="h-6 w-6" />
          </div>
          {loaded ? (
            <Badge className="border border-[#70f0bf]/25 bg-[#70f0bf]/10 text-[#70f0bf]">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Saved
            </Badge>
          ) : null}
        </div>
        <CardTitle className="text-2xl text-white">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <Button type="button" onClick={onPick} disabled={isLoading} className="w-full rounded-lg bg-[#ffd166] text-[#211600] hover:bg-[#ffe29a]">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {isLoading ? "Processing" : `Upload ${role === "invoice" ? "Invoice" : "Payment"}`}
        </Button>
        {loaded ? (
          <div className="rounded-lg border border-white/10 bg-[#07111f] p-3 text-sm">
            <p className="truncate font-medium text-white">{compactFileName(loaded.file.name)}</p>
            <p className="mt-1 text-slate-500">{formatNumber(loaded.file.rowCount)} rows - {formatCurrency(loaded.file.totalAmount, true)}</p>
            {loaded.id ? <p className="mt-1 text-xs text-[#70f0bf]">Database upload #{loaded.id}</p> : null}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/15 bg-[#07111f] p-4 text-center text-sm text-slate-500">Drop file .xlsx di sini</div>
        )}
        {error ? <p className="rounded-lg border border-[#ff9f8e]/25 bg-[#ff9f8e]/10 p-3 text-sm text-[#ffb4a6]">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
