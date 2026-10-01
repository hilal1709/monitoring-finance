// Run Lighthouse against every dashboard route on a production server.
// Usage: npm run build && npm run start -- -p 3100, then
//        node scripts/lighthouse.mjs [baseUrl] [mobile|desktop|both] [runs] [route...]
// Each page is measured `runs` times (default 3) and the median run (by
// performance score) is reported, which irons out local machine noise.
import { mkdirSync, writeFileSync } from "node:fs";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const baseUrl = process.argv[2] ?? "http://localhost:3100";
const modeArg = process.argv[3] ?? "both";
const runs = Number(process.argv[4] ?? 3);
const allRoutes = [
  "/", "/invoice", "/payment", "/ekspor", "/ekspor/tren-ekspor", "/ekspor/tujuan-ekspor",
  "/ekspor/demurrage", "/ekspor/rkap", "/ekspor/prognosa", "/kpi", "/kpi/timely",
];
const routes = process.argv.length > 5 ? process.argv.slice(5) : allRoutes;
const modes = modeArg === "both" ? ["mobile", "desktop"] : [modeArg];
const categories = ["performance", "accessibility", "best-practices", "seo"];

mkdirSync("lighthouse-reports", { recursive: true });
const chrome = await launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
const rows = [];
let allPerfect = true;

try {
  for (const mode of modes) {
    for (const route of routes) {
      const lhrs = [];
      for (let run = 0; run < runs; run += 1) {
        const result = await lighthouse(
          baseUrl + route,
          { port: chrome.port, output: "json", logLevel: "error", onlyCategories: categories },
          mode === "desktop" ? desktopConfig : undefined,
        );
        lhrs.push(result.lhr);
      }
      lhrs.sort((left, right) => (left.categories.performance?.score ?? 0) - (right.categories.performance?.score ?? 0));
      const lhr = lhrs[Math.floor(lhrs.length / 2)];
      const scores = categories.map((key) => Math.round((lhr.categories[key]?.score ?? 0) * 100));
      const failing = Object.values(lhr.audits)
        .filter((audit) => audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== "informative" && audit.scoreDisplayMode !== "manual" && audit.scoreDisplayMode !== "notApplicable")
        .map((audit) => `${audit.id}${audit.displayValue ? ` (${audit.displayValue})` : ""}`);
      if (scores.some((score) => score < 100)) allPerfect = false;
      rows.push({ mode, route, perf: scores[0], a11y: scores[1], bp: scores[2], seo: scores[3], failing: failing.join(", ") });
      writeFileSync(`lighthouse-reports/${mode}${route.replaceAll("/", "_") || "_"}.json`, JSON.stringify(lhr));
      console.log(`${mode.padEnd(7)} ${route.padEnd(24)} ${scores.join(" / ")}${failing.length ? `  ← ${failing.join(", ")}` : ""}`);
    }
  }
} finally {
  await chrome.kill();
}

writeFileSync("lighthouse-reports/summary.json", JSON.stringify(rows, null, 2));
process.exitCode = allPerfect ? 0 : 1;
