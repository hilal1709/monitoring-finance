// Attribute a route's client JS (from its prerendered HTML) to source modules via source maps.
// Usage: ANALYZE=1 npm run build, then node scripts/bundle-attribution.cjs invoice [topN]
const fs = require("fs");
const page = process.argv[2] ?? "invoice";
const html = fs.readFileSync(`.next/server/app/${page}.html`, "utf8");
const srcs = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/([^"']+?\.js)/g)].map((m) => m[1]))];
const agg = {};
let total = 0;
for (const s of srcs) {
  const f = ".next/static/chunks/" + s;
  const code = fs.readFileSync(f, "utf8");
  total += code.length;
  const mapName = code.match(/sourceMappingURL=(\S+)/)?.[1];
  if (!mapName) { agg["(nomap) " + s] = code.length; continue; }
  const map = JSON.parse(fs.readFileSync(".next/static/chunks/" + mapName, "utf8"));
  const secs = map.sections ? map.sections.map((x) => x.map) : [map];
  for (const m of secs) (m.sources || []).forEach((src, i) => {
    let k = src.replace(/^.*node_modules\//, "nm/").replace(/^(\.\.\/|turbopack:\/\/\/|\[project\]\/)+/, "");
    if (k.startsWith("nm/")) k = k.split("/").slice(0, k.startsWith("nm/@") ? 3 : 2).join("/");
    agg[k] = (agg[k] || 0) + (m.sourcesContent?.[i] || "").length;
  });
}
console.log(page, "chunks", srcs.length, "minified bytes", total);
Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, Number(process.argv[3] ?? 35)).forEach(([k, v]) => console.log(String(v).padStart(8), k));
