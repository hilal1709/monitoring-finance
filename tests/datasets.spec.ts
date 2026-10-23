import { expect, test } from "@playwright/test";
import { detectColumns, toPeriodKey, toRows } from "../lib/chart-builder/datasets";

// Pure parsing helpers behind "Upload Excel / CSV"; no browser needed.

test("toPeriodKey reads the date shapes clients paste", () => {
  expect(toPeriodKey("2026-03-15")).toBe("2026-03");
  expect(toPeriodKey("15/03/2026")).toBe("2026-03");
  expect(toPeriodKey("Maret 2026")).toBe("2026-03");
  expect(toPeriodKey("Oct 2025")).toBe("2025-10");
  expect(toPeriodKey(46096)).toBe("2026-03"); // Excel serial for 2026-03-15
  expect(toPeriodKey(new Date(2026, 0, 31))).toBe("2026-01");
  expect(toPeriodKey("PT Semen")).toBeNull();
});

test("detectColumns guesses period, number and text columns", () => {
  const headers = ["Tanggal", "Customer", "Nilai (Rp)"];
  const rows = [
    ["2026-01-10", "PT A", "1.250.000,50"],
    ["2026-02-11", "PT B", 900000],
  ];
  const columns = detectColumns(headers, rows);
  expect(columns.map((column) => column.kind)).toEqual(["period", "dimension", "measure"]);
  expect(columns[0].id).toBe("periodKey");

  const parsed = toRows(headers, rows, columns);
  expect(parsed[0]).toMatchObject({ periodKey: "2026-01", nilai_rp: 1250000.5 });
  expect(parsed[1]).toMatchObject({ periodKey: "2026-02", customer: "PT B", nilai_rp: 900000 });
});
