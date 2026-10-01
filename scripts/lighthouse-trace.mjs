// Debug helper: run Lighthouse (mobile) once and list the main-thread tasks
// that run before first paint, to see what delays FCP/LCP.
// Usage: node scripts/lighthouse-trace.mjs http://localhost:3100/invoice
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const url = process.argv[2] ?? "http://localhost:3100/";
const chrome = await launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });

try {
  const result = await lighthouse(url, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance"] });
  const events = result.artifacts.Trace.traceEvents;
  const navStart = events.find((event) => event.name === "navigationStart" && event.args?.data?.isLoadingMainFrame)?.ts ?? events[0].ts;
  const fcp = events.find((event) => event.name === "firstContentfulPaint");
  const lcp = events.filter((event) => event.name === "largestContentfulPaint::Candidate").at(-1);
  const ms = (ts) => Math.round((ts - navStart) / 1000);

  console.log("FCP", fcp ? ms(fcp.ts) : "-", "LCP", lcp ? ms(lcp.ts) : "-");

  const mainPid = fcp?.pid;
  const tasks = events
    .filter((event) => event.name === "RunTask" && event.pid === mainPid && event.dur > 15000 && (!fcp || event.ts < fcp.ts + 200000))
    .map((task) => {
      const inner = events
        .filter((event) => event.pid === task.pid && event.tid === task.tid && event.ts >= task.ts && event.ts <= task.ts + task.dur && ["EvaluateScript", "FunctionCall", "v8.compile", "ParseHTML", "Layout", "UpdateLayoutTree", "TimerFire", "FireAnimationFrame", "v8.parseOnBackground", "RunMicrotasks"].includes(event.name))
        .sort((left, right) => (right.dur ?? 0) - (left.dur ?? 0))
        .slice(0, 3)
        .map((event) => `${event.name}${event.args?.data?.url ? `(${event.args.data.url.split("/").at(-1)})` : event.args?.data?.functionName ? `(${event.args.data.functionName})` : ""} ${Math.round((event.dur ?? 0) / 1000)}ms`);
      return `${ms(task.ts)}ms +${Math.round(task.dur / 1000)}ms  ${inner.join(" | ")}`;
    });

  console.log(tasks.join("\n"));
} finally {
  await chrome.kill();
}
