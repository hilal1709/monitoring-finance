import { expect, test } from "@playwright/test";
import { compare, shiftMonths, sumByPeriod, timeSeries } from "../lib/chart-builder/time-intel";

// Pure maths; no browser needed.
const rows = [
  { p: "2025-01", v: 100 },
  { p: "2025-02", v: 200 },
  { p: "2025-12", v: 400 },
  { p: "2026-01", v: 150 },
  { p: "2026-02", v: 300 },
  { p: "2026-03", v: 0 },
];
const totals = sumByPeriod(rows, (row) => row.p, (row) => row.v);

test("shiftMonths crosses year boundaries", () => {
  expect(shiftMonths("2026-01", -1)).toBe("2025-12");
  expect(shiftMonths("2025-12", 1)).toBe("2026-01");
  expect(shiftMonths("2026-03", -12)).toBe("2025-03");
});

test("MoM in January compares with December last year", () => {
  const result = compare(totals, "mom", "2026-01");
  expect(result?.previous).toBe(400);
  expect(result?.percent).toBeCloseTo(-0.625);
  expect(result?.previousLabel).toBe("Des 2025");
});

test("YoY compares the same month last year", () => {
  const result = compare(totals, "yoy", "2026-02");
  expect(result?.current).toBe(300);
  expect(result?.previous).toBe(200);
  expect(result?.percent).toBeCloseTo(0.5);
});

test("YTD compares the same month range last year, not the full year", () => {
  const result = compare(totals, "ytd", "2026-02");
  expect(result?.current).toBe(450);
  expect(result?.previous).toBe(300);
  expect(result?.currentLabel).toBe("Jan–Feb 2026");
});

test("latest month is the default reference", () => {
  expect(compare(totals, "yoy")?.reference).toBe("2026-03");
  // March 2025 is missing, so there is nothing to compare.
  expect(compare(totals, "yoy")?.percent).toBeNull();
});

test("single-year data has no comparison", () => {
  const only = sumByPeriod([{ p: "2026-05", v: 10 }], (row) => row.p, (row) => row.v);
  expect(compare(only, "ytd")?.previous).toBeNull();
  expect(compare(only, "mom")?.percent).toBeNull();
});

test("YTD cumulative series runs Jan..reference with last year alongside", () => {
  const points = timeSeries(totals, "ytd-vs-last-year", { selected: "2026-02" });
  expect(points.map((point) => point.value)).toEqual([150, 450]);
  expect(points.map((point) => point.compare)).toEqual([100, 300]);
});

test("YoY growth skips months without a base", () => {
  const points = timeSeries(totals, "yoy-growth");
  expect(points.map((point) => point.key)).toEqual(["2026-01", "2026-02"]);
  expect(points[0].value).toBeCloseTo(0.5);
});
