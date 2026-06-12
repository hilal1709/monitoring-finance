import "server-only";

import { inflateRawSync } from "node:zlib";

import type {
  DashboardRecord,
  DashboardSection,
  MonitoringDashboardData,
  MonthlyPoint,
  RankedItem,
  SectionMonthlyPoint,
  UploadedWorkbookSummary,
  WorkbookRole,
} from "@/lib/monitoring-dashboard-types";

type CellValue = string | number | boolean | null;

type ParsedSheet = {
  name: string;
  rows: CellValue[][];
};

type ParsedWorkbook = {
  sheets: Map<string, ParsedSheet>;
};

type UploadedWorkbookInput = {
  name: string;
  buffer: Buffer;
};

type Period = {
  key: string;
  label: string;
  sort: number;
};

type BaseRecord = {
  amount: number;
  customerName: string;
  customerType: string;
  invoiceType: string;
  status: string;
  period: Period | null;
};

type InvoiceRecord = BaseRecord & {
  documentNumber: string;
};

type PaymentRecord = BaseRecord & {
  paymentDocument: string;
  riskStatus: string;
};

const TARGET_SHEETS = {
  invoice: "Billing Detail",
  payment: "Detail Payment",
} as const satisfies Record<WorkbookRole, string>;

const MONTHS = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const MONTH_LOOKUP: Map<string, number> = new Map([
    ["jan", 1],
    ["januari", 1],
    ["feb", 2],
    ["februari", 2],
    ["mar", 3],
    ["maret", 3],
    ["apr", 4],
    ["april", 4],
    ["may", 5],
    ["mei", 5],
    ["jun", 6],
    ["juni", 6],
    ["jul", 7],
    ["juli", 7],
    ["aug", 8],
    ["agu", 8],
    ["agustus", 8],
    ["sep", 9],
    ["sept", 9],
    ["september", 9],
    ["oct", 10],
    ["okt", 10],
    ["oktober", 10],
    ["nov", 11],
    ["november", 11],
    ["dec", 12],
    ["des", 12],
    ["desember", 12],
]);

const BUILT_IN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

function normalizeZipPath(path: string) {
  return path.replaceAll("\\", "/").replace(/^\/+/, "");
}

function decodeXml(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)));
}

function parseAttributes(source: string) {
  const attrs = new Map<string, string>();

  for (const match of source.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
    attrs.set(match[1], decodeXml(match[2]));
  }

  return attrs;
}

function unzipXlsx(buffer: Buffer) {
  const files = new Map<string, Buffer>();
  let endOfCentralDirectory = -1;

  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      endOfCentralDirectory = index;
      break;
    }
  }

  if (endOfCentralDirectory === -1) {
    throw new Error("File Excel tidak valid atau bukan format .xlsx.");
  }

  const totalEntries = buffer.readUInt16LE(endOfCentralDirectory + 10);
  let pointer = buffer.readUInt32LE(endOfCentralDirectory + 16);

  for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) {
      throw new Error("Struktur ZIP di workbook tidak bisa dibaca.");
    }

    const compressionMethod = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localHeaderOffset = buffer.readUInt32LE(pointer + 42);
    const nameStart = pointer + 46;
    const fileName = normalizeZipPath(buffer.subarray(nameStart, nameStart + nameLength).toString("utf8"));

    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error("Local header workbook tidak valid.");
    }

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = compressionMethod === 0 ? compressed : compressionMethod === 8 ? inflateRawSync(compressed) : null;

    if (!data) {
      throw new Error(`Metode kompresi Excel tidak didukung: ${compressionMethod}.`);
    }

    files.set(fileName, data);
    pointer += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

function getZipText(files: Map<string, Buffer>, path: string) {
  return files.get(normalizeZipPath(path))?.toString("utf8") ?? "";
}

function parseSharedStrings(xml: string) {
  const sharedStrings: string[] = [];

  for (const item of xml.matchAll(/<si\b[\s\S]*?<\/si>/g)) {
    let text = "";

    for (const part of item[0].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
      text += decodeXml(part[1]);
    }

    sharedStrings.push(text);
  }

  return sharedStrings;
}

function parseStyles(xml: string) {
  const customFormats = new Map<number, string>();
  const dateStyleIndexes = new Set<number>();

  const numFmts = xml.match(/<numFmts\b[\s\S]*?<\/numFmts>/)?.[0] ?? "";
  for (const format of numFmts.matchAll(/<numFmt\b([^>]*)\/?>/g)) {
    const attrs = parseAttributes(format[1]);
    const id = Number(attrs.get("numFmtId"));
    const code = attrs.get("formatCode") ?? "";

    if (Number.isFinite(id)) {
      customFormats.set(id, code);
    }
  }

  const cellXfs = xml.match(/<cellXfs\b[\s\S]*?<\/cellXfs>/)?.[0] ?? "";
  let index = 0;

  for (const xf of cellXfs.matchAll(/<xf\b([^>]*)\/?>/g)) {
    const attrs = parseAttributes(xf[1]);
    const numFmtId = Number(attrs.get("numFmtId"));
    const customCode = customFormats.get(numFmtId)?.replace(/"[^"]*"|\\./g, "").toLowerCase() ?? "";
    const isCustomDate = /[dmyhs]/.test(customCode);

    if (BUILT_IN_DATE_FORMATS.has(numFmtId) || isCustomDate) {
      dateStyleIndexes.add(index);
    }

    index += 1;
  }

  return dateStyleIndexes;
}

function excelSerialToIsoDate(serial: number) {
  const millis = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(millis);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function columnIndexFromReference(reference: string) {
  const letters = reference.match(/[A-Z]+/i)?.[0]?.toUpperCase() ?? "";
  let index = 0;

  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }

  return Math.max(0, index - 1);
}

function parseCellValue(source: string, sharedStrings: string[], dateStyleIndexes: Set<number>): CellValue {
  const attrs = parseAttributes(source.match(/^<c\b([^>]*)>/)?.[1] ?? source);
  const type = attrs.get("t");
  const styleIndex = Number(attrs.get("s"));
  const valueMatch = source.match(/<v>([\s\S]*?)<\/v>/);
  const rawValue = valueMatch ? decodeXml(valueMatch[1]) : "";

  if (type === "inlineStr") {
    const inline = source.match(/<is\b[\s\S]*?<\/is>/)?.[0] ?? "";
    return [...inline.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join("");
  }

  if (!valueMatch) {
    return null;
  }

  if (type === "s") {
    return sharedStrings[Number(rawValue)] ?? "";
  }

  if (type === "b") {
    return rawValue === "1";
  }

  if (type === "str") {
    return rawValue;
  }

  const numeric = Number(rawValue);

  if (!Number.isFinite(numeric)) {
    return rawValue;
  }

  if (dateStyleIndexes.has(styleIndex) && numeric > 0 && numeric < 60000) {
    return excelSerialToIsoDate(numeric) ?? numeric;
  }

  return numeric;
}

function parseWorksheet(xml: string, sharedStrings: string[], dateStyleIndexes: Set<number>): CellValue[][] {
  const rows: CellValue[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowAttrs = parseAttributes(rowMatch[1]);
    const rowNumber = Number(rowAttrs.get("r"));
    const row: CellValue[] = [];

    for (const cellMatch of rowMatch[2].matchAll(/<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/g)) {
      const cellXml = cellMatch[0];
      const reference = parseAttributes(cellXml.match(/^<c\b([^>]*)/)?.[1] ?? "").get("r") ?? "";
      const colIndex = columnIndexFromReference(reference);
      row[colIndex] = parseCellValue(cellXml, sharedStrings, dateStyleIndexes);
    }

    rows[Math.max(0, rowNumber - 1)] = row;
  }

  return rows;
}

function resolveWorkbookTarget(target: string) {
  const normalized = normalizeZipPath(target);

  if (normalized.startsWith("xl/")) {
    return normalized;
  }

  return normalizeZipPath(`xl/${normalized}`);
}

function parseWorkbook(buffer: Buffer): ParsedWorkbook {
  const zipFiles = unzipXlsx(buffer);
  const workbookXml = getZipText(zipFiles, "xl/workbook.xml");
  const relationshipsXml = getZipText(zipFiles, "xl/_rels/workbook.xml.rels");
  const sharedStrings = parseSharedStrings(getZipText(zipFiles, "xl/sharedStrings.xml"));
  const dateStyleIndexes = parseStyles(getZipText(zipFiles, "xl/styles.xml"));
  const relationships = new Map<string, string>();
  const sheets = new Map<string, ParsedSheet>();

  for (const relationship of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = parseAttributes(relationship[1]);
    const id = attrs.get("Id");
    const target = attrs.get("Target");

    if (id && target) {
      relationships.set(id, resolveWorkbookTarget(target));
    }
  }

  for (const sheet of workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const attrs = parseAttributes(sheet[1]);
    const name = attrs.get("name");
    const relationshipId = attrs.get("r:id");
    const sheetPath = relationshipId ? relationships.get(relationshipId) : null;
    const sheetXml = sheetPath ? getZipText(zipFiles, sheetPath) : "";

    if (name && sheetXml) {
      sheets.set(name.toLowerCase(), {
        name,
        rows: parseWorksheet(sheetXml, sharedStrings, dateStyleIndexes),
      });
    }
  }

  return { sheets };
}

function toText(value: CellValue | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function toNumber(value: CellValue | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/[^\d,.-]/g, "").replaceAll(".", "").replace(",", ".");
  const numeric = Number(normalized);

  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeHeader(value: CellValue | undefined) {
  return toText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findHeader(rows: CellValue[][], required: string[]) {
  const normalizedRequired = required.map((item) => normalizeHeader(item));

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    const headers = row.map(normalizeHeader);

    if (normalizedRequired.every((item) => headers.includes(item))) {
      const indexByHeader = new Map<string, number>();

      headers.forEach((header, index) => {
        if (header && !indexByHeader.has(header)) {
          indexByHeader.set(header, index);
        }
      });

      return { rowIndex, indexByHeader };
    }
  }

  throw new Error(`Header sheet tidak lengkap. Kolom wajib: ${required.join(", ")}.`);
}

function getByAlias(row: CellValue[], indexByHeader: Map<string, number>, aliases: string[]) {
  for (const alias of aliases) {
    const index = indexByHeader.get(normalizeHeader(alias));

    if (index !== undefined) {
      const value = row[index];

      if (toText(value)) {
        return value;
      }
    }
  }

  return null;
}

function parsePeriod(monthValue: CellValue | undefined, yearValue: CellValue | undefined): Period | null {
  const monthText = toText(monthValue).toLowerCase();
  const month = MONTH_LOOKUP.get(monthText) ?? MONTH_LOOKUP.get(monthText.slice(0, 3));
  const year = Number(toText(yearValue).match(/\d{4}/)?.[0]);

  if (!month || !Number.isFinite(year)) {
    return null;
  }

  const key = `${year}-${String(month).padStart(2, "0")}`;

  return {
    key,
    label: `${MONTHS[month]} ${year}`,
    sort: year * 100 + month,
  };
}

function parseDateValueAsPeriod(value: CellValue | undefined): Period | null {
  if (!value) return null;
  
  let date: Date | null = null;
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      date = new Date(value);
    }
  } else if (typeof value === "number" && value > 0 && value < 60000) {
    const iso = excelSerialToIsoDate(value);
    if (iso) {
      date = new Date(iso);
    }
  }

  if (date && !Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return {
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: `${MONTHS[month]} ${year}`,
      sort: year * 100 + month,
    };
  }

  return null;
}

function parseInvoiceRecords(sheet: ParsedSheet) {
  const header = findHeader(sheet.rows, ["Cust. Name", "Doc. Number", "Amount in local currency", "Bucket"]);
  const records: InvoiceRecord[] = [];

  for (let rowIndex = header.rowIndex + 1; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    const amount = toNumber(getByAlias(row, header.indexByHeader, ["Amount in local currency"]));
    const customerName = toText(getByAlias(row, header.indexByHeader, ["Cust. Name", "Cust.Name"]));
    const documentNumber = toText(getByAlias(row, header.indexByHeader, ["Doc. Number", "Invoice reference"]));

    if (!amount || !customerName || !documentNumber) {
      continue;
    }

    records.push({
      amount,
      customerName,
      documentNumber,
      customerType: toText(getByAlias(row, header.indexByHeader, ["Cust. Typ", "Custo. Typ"])) || "Unmapped",
      invoiceType: toText(getByAlias(row, header.indexByHeader, ["Invoice Typ"])) || "Unmapped",
      status: toText(getByAlias(row, header.indexByHeader, ["Bucket", "Aging"])) || "Unmapped",
      period: parsePeriod(
        getByAlias(row, header.indexByHeader, ["Month"]),
        getByAlias(row, header.indexByHeader, ["Year"]),
      ),
    });
  }

  return records;
}

function parsePaymentRecords(sheet: ParsedSheet) {
  const header = findHeader(sheet.rows, ["Cust.Name", "Payment Document", "Payment Amount", "Risk Status"]);
  const records: PaymentRecord[] = [];

  for (let rowIndex = header.rowIndex + 1; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    const amount = toNumber(getByAlias(row, header.indexByHeader, ["Payment Amount"]));
    const customerName = toText(getByAlias(row, header.indexByHeader, ["Cust.Name", "Cust. Name"])) || "Unmapped";
    const paymentDocument = toText(getByAlias(row, header.indexByHeader, ["Payment Document", "Invoice Number"]));

    if (!amount) {
      continue;
    }

    const riskStatus = toText(getByAlias(row, header.indexByHeader, ["Risk Status", "Aging"])) || "Unmapped";

    records.push({
      amount,
      customerName,
      paymentDocument,
      riskStatus,
      customerType: toText(getByAlias(row, header.indexByHeader, ["Custo. Typ", "Cust. Typ"])) || "Unmapped",
      invoiceType: toText(getByAlias(row, header.indexByHeader, ["Invoice Typ"])) || "Unmapped",
      status: riskStatus,
      period: parsePeriod(
        getByAlias(row, header.indexByHeader, ["Month"]),
        getByAlias(row, header.indexByHeader, ["Year"]),
      ),
    });
  }

  return records;
}

function sum(records: BaseRecord[]) {
  return records.reduce((total, record) => total + record.amount, 0);
}

function rankBy(records: BaseRecord[], keyFn: (record: BaseRecord) => string, limit = 8, order?: string[]): RankedItem[] {
  const grouped = new Map<string, { value: number; count: number }>();
  const totalAmount = sum(records) || 1;
  const orderMap = new Map((order ?? []).map((label, index) => [label.toLowerCase(), index]));

  for (const record of records) {
    const label = keyFn(record) || "Unmapped";
    const item = grouped.get(label) ?? { value: 0, count: 0 };
    item.value += record.amount;
    item.count += 1;
    grouped.set(label, item);
  }

  return [...grouped.entries()]
    .map(([label, item]) => ({
      label,
      value: item.value,
      count: item.count,
      share: item.value / totalAmount,
    }))
    .sort((a, b) => {
      const aOrder = orderMap.get(a.label.toLowerCase());
      const bOrder = orderMap.get(b.label.toLowerCase());

      if (aOrder !== undefined || bOrder !== undefined) {
        return (aOrder ?? Number.MAX_SAFE_INTEGER) - (bOrder ?? Number.MAX_SAFE_INTEGER);
      }

      return b.value - a.value;
    })
    .slice(0, limit);
}

function monthlySeries(records: BaseRecord[]): SectionMonthlyPoint[] {
  const grouped = new Map<string, { label: string; sort: number; value: number }>();

  for (const record of records) {
    if (!record.period) {
      continue;
    }

    const item = grouped.get(record.period.key) ?? {
      label: record.period.label,
      sort: record.period.sort,
      value: 0,
    };

    item.value += record.amount;
    grouped.set(record.period.key, item);
  }

  return [...grouped.entries()]
    .map(([key, item]) => ({ key, label: item.label, value: item.value, sort: item.sort }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => ({ key: item.key, label: item.label, value: item.value }));
}

function latestPeriod(records: BaseRecord[]) {
  const latest = records
    .map((record) => record.period)
    .filter((period): period is Period => Boolean(period))
    .sort((a, b) => b.sort - a.sort)[0];

  return latest?.label ?? "-";
}

function toDashboardRecord(record: BaseRecord): DashboardRecord {
  return {
    amount: record.amount,
    customerName: record.customerName,
    customerType: record.customerType,
    invoiceType: record.invoiceType,
    status: record.status,
    periodKey: record.period?.key ?? null,
    periodLabel: record.period?.label ?? null,
    periodSort: record.period?.sort ?? null,
  };
}

function buildSection(records: BaseRecord[], statusOrder: string[]): DashboardSection {
  const totalAmount = sum(records);

  return {
    rowCount: records.length,
    totalAmount,
    averageAmount: records.length > 0 ? totalAmount / records.length : 0,
    latestPeriod: latestPeriod(records),
    statusMix: rankBy(records, (record) => record.status, 8, statusOrder),
    customerTypes: rankBy(records, (record) => record.customerType, 6),
    invoiceTypes: rankBy(records, (record) => record.invoiceType, 8),
    topCustomers: rankBy(records, (record) => record.customerName, 8),
    monthly: monthlySeries(records),
    records: records.map(toDashboardRecord),
  };
}

function combinedMonthly(invoiceRecords: InvoiceRecord[], paymentRecords: PaymentRecord[]): MonthlyPoint[] {
  const grouped = new Map<string, { label: string; sort: number; invoice: number; payment: number }>();

  for (const [role, records] of [
    ["invoice", invoiceRecords],
    ["payment", paymentRecords],
  ] as const) {
    for (const record of records) {
      if (!record.period) {
        continue;
      }

      const item = grouped.get(record.period.key) ?? {
        label: record.period.label,
        sort: record.period.sort,
        invoice: 0,
        payment: 0,
      };

      item[role] += record.amount;
      grouped.set(record.period.key, item);
    }
  }

  return [...grouped.entries()]
    .map(([key, item]) => ({ key, label: item.label, sort: item.sort, invoice: item.invoice, payment: item.payment }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => ({ key: item.key, label: item.label, invoice: item.invoice, payment: item.payment }));
}

function findSheet(workbook: ParsedWorkbook, sheetName: string) {
  return workbook.sheets.get(sheetName.toLowerCase()) ?? null;
}

function workbookSummary(role: WorkbookRole, name: string, sheetName: string, records: BaseRecord[]): UploadedWorkbookSummary {
  return {
    role,
    name,
    sheetName,
    rowCount: records.length,
    totalAmount: sum(records),
  };
}

export function buildMonitoringDashboardFromFiles(files: UploadedWorkbookInput[], expectedRole?: WorkbookRole): MonitoringDashboardData {
  let invoiceFileName = "";
  let paymentFileName = "";
  let invoiceRecords: InvoiceRecord[] | null = null;
  let paymentRecords: PaymentRecord[] | null = null;

  for (const file of files) {
    const workbook = parseWorkbook(file.buffer);
    const invoiceSheet = findSheet(workbook, TARGET_SHEETS.invoice);
    const paymentSheet = findSheet(workbook, TARGET_SHEETS.payment);

    if (invoiceSheet && !invoiceRecords && (!expectedRole || expectedRole === "invoice")) {
      invoiceRecords = parseInvoiceRecords(invoiceSheet);
      invoiceFileName = file.name;
    }

    if (paymentSheet && !paymentRecords && (!expectedRole || expectedRole === "payment")) {
      paymentRecords = parsePaymentRecords(paymentSheet);
      paymentFileName = file.name;
    }
  }

  if (expectedRole === "invoice" && !invoiceRecords) {
    throw new Error("Sheet Billing Detail tidak ditemukan di file yang diupload.");
  }

  if (expectedRole === "payment" && !paymentRecords) {
    throw new Error("Sheet Detail Payment tidak ditemukan di file yang diupload.");
  }

  if (!invoiceRecords && !paymentRecords) {
    throw new Error("Sheet Billing Detail atau Detail Payment tidak ditemukan di file yang diupload.");
  }

  const safeInvoiceRecords = invoiceRecords ?? [];
  const safePaymentRecords = paymentRecords ?? [];
  const totalOutstanding = sum(safeInvoiceRecords);
  const totalPaid = sum(safePaymentRecords);
  const highRiskPaymentRecords = safePaymentRecords.filter((record) => record.riskStatus.toLowerCase().includes("high risk"));
  const highRiskPayment = sum(highRiskPaymentRecords);
  const overdueOutstanding = sum(safeInvoiceRecords.filter((record) => record.status.toLowerCase() !== "current"));
  const externalOutstanding = sum(safeInvoiceRecords.filter((record) => record.customerType.toLowerCase() === "external"));
  const invoice = invoiceRecords ? buildSection(invoiceRecords, ["Current", "Bucket 1", "Bucket 2", "Bucket 3", "Bucket 4"]) : undefined;
  const payment = paymentRecords ? buildSection(paymentRecords, ["No Risk", "Low Risk", "Warning", "Warning +", "High Risk", "High Risk +"]) : undefined;
  const filesSummary = [
    invoiceRecords ? workbookSummary("invoice", invoiceFileName, TARGET_SHEETS.invoice, invoiceRecords) : null,
    paymentRecords ? workbookSummary("payment", paymentFileName, TARGET_SHEETS.payment, paymentRecords) : null,
  ].filter((file): file is UploadedWorkbookSummary => Boolean(file));

  return {
    generatedAt: new Date().toISOString(),
    files: filesSummary,
    overview: {
      totalOutstanding,
      totalPaid,
      cashCoverage: totalOutstanding > 0 ? totalPaid / totalOutstanding : 0,
      netExposure: totalOutstanding - totalPaid,
      invoiceCount: safeInvoiceRecords.length,
      paymentCount: safePaymentRecords.length,
      overdueOutstanding,
      highRiskPayment,
      highRiskPaymentCount: highRiskPaymentRecords.length,
      externalOutstandingShare: totalOutstanding > 0 ? externalOutstanding / totalOutstanding : 0,
    },
    invoice,
    payment,
    combinedMonthly: combinedMonthly(safeInvoiceRecords, safePaymentRecords),
  };
}
