import { DollarCircleIcon, Invoice03Icon, ShipIcon } from "@hugeicons/core-free-icons";
import { DashboardCanvas } from "@/components/dashboard-canvas/canvas";
import type { BuiltinWidget } from "@/components/dashboard-canvas/layout-utils";
import { HorizontalBars } from "@/components/export/horizontal-bars";
import { SourceNotice } from "@/components/export/source-notice";
import { exportCard, exportPanel } from "@/components/export/views/widgets";
import type { ExportCanvasProps } from "@/components/export/views/types";
import { formatIdr } from "@/lib/export-dashboard-format";
import { rankRecords, total } from "@/lib/export-dashboard-data";
import type { ExportViewRecord } from "@/lib/export-dashboard-types";

const withImpact = (records: ExportViewRecord[]) => records.filter((record) => record.exchangeImpact !== 0);
const impactRule = [{ field: "exchangeImpact", op: "not-in" as const, values: [0] }];

const builtins: BuiltinWidget[] = [
  {
    id: "notice",
    title: "Catatan sumber data",
    kind: "panel",
    w: 12,
    h: 2,
    render: () => <SourceNotice>Workbook tidak memiliki kolom demurrage/despatch. Agar halaman tetap berguna tanpa membuat angka palsu, visual di bawah hanya menampilkan data selisih kurs yang memang tersedia.</SourceNotice>,
  },
  exportCard({ id: "impact", title: "Dampak Selisih Kurs", icon: DollarCircleIcon, iconKey: "dollar", tone: "turquoise", highlight: true, w: 4, value: (records) => formatIdr(total(withImpact(records), (record) => record.exchangeImpact)), spec: { field: "exchangeImpact", agg: "sum" } }),
  exportCard({ id: "impacted-count", title: "Transaksi dengan Selisih", icon: Invoice03Icon, iconKey: "invoice", tone: "mint", w: 4, value: (records) => withImpact(records).length.toLocaleString("id-ID"), spec: { measures: [{ field: "count", agg: "count" }] } }),
  exportCard({ id: "companies", title: "Company Terdampak", icon: ShipIcon, iconKey: "ship", tone: "coral", w: 4, value: (records) => new Set(withImpact(records).map((record) => record.companyCode)).size.toLocaleString("id-ID"), spec: { measures: [{ field: "companyCode", agg: "distinct" }] } }),
  exportPanel({
    id: "by-company",
    title: "Dampak Selisih Kurs per Company (IDR)",
    w: 6,
    h: 6,
    newRow: true,
    spec: { chart: "bar-h", dimension: "companyCode", measures: [{ field: "exchangeImpact", agg: "sum" }], limit: 8, sort: "abs-desc" },
    children: (records) => <HorizontalBars items={rankRecords(withImpact(records), (record) => record.companyCode, (record) => record.exchangeImpact)} formatValue={formatIdr} />,
  }),
  exportPanel({
    id: "by-buyer",
    title: "Dampak Selisih Kurs per Buyer (IDR)",
    w: 6,
    h: 6,
    spec: { chart: "bar-h", dimension: "buyer", measures: [{ field: "exchangeImpact", agg: "sum", color: "coral" }], limit: 8, sort: "abs-desc" },
    children: (records) => <HorizontalBars items={rankRecords(withImpact(records), (record) => record.buyer, (record) => record.exchangeImpact, 8)} formatValue={formatIdr} tone="coral" />,
  }),
];

// Cards on this page only count rows that have an exchange difference.
for (const widget of builtins) if (widget.spec) widget.spec = { ...widget.spec, filters: impactRule };

export function DemurrageView(props: ExportCanvasProps) {
  return <DashboardCanvas builtins={builtins} primarySource="export" {...props} />;
}
