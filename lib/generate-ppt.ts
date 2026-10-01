import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { getExportDashboard } from "@/lib/export-dashboard-store";
import { buildExportAggregates, buildNonExportAggregates, getNarrative } from "@/lib/ai-narrative";
import { buildExportPptSpec, buildReportPptSpec, type PptSpec } from "@/lib/ppt-spec";
import type { DashboardSection, WorkbookRole } from "@/lib/monitoring-dashboard-types";

function pythonExe(): string {
  // Use the AutoClaw-bundled Python on Windows, or system python3 on Unix
  if (process.platform === "win32") {
    const bundled = "C:\\Program Files\\AutoClaw\\resources\\python\\python.exe";
    if (fs.existsSync(bundled)) return bundled;
    return "python";
  }
  return "python3";
}

// Renders a slide spec (lib/ppt-spec.ts) onto the SIG template.
const RENDER_SCRIPT = path.join(process.cwd(), "lib", "ppt_render.py");

function renderPpt(spec: PptSpec): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `deptcontrol_pptx_${Date.now()}.pptx`);
  const exe = pythonExe();

  return new Promise<Buffer>((resolve, reject) => {
    const proc = spawn(exe, [RENDER_SCRIPT, outputPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    const outChunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    proc.stdout.on("data", (d: Buffer) => outChunks.push(d));
    proc.stderr.on("data", (d: Buffer) => errChunks.push(d));

    proc.on("close", (code) => {
      const stdout = Buffer.concat(outChunks).toString("utf8").trim();
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();

      if (code !== 0) {
        reject(new Error(stderr || stdout || "Python script failed"));
        return;
      }

      try {
        const buffer = fs.readFileSync(outputPath);
        fs.unlinkSync(outputPath);
        resolve(buffer);
      } catch (e) {
        reject(new Error(`Failed to read PPTX: ${stderr || stdout}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Python (${exe}) not found: ${err.message}`));
    });

    proc.stdin.write(JSON.stringify(spec));
    proc.stdin.end();
  });
}

export async function generateNonExportPpt({
  role,
  filterLabel,
  section,
}: {
  role: WorkbookRole;
  filterLabel: string;
  section: DashboardSection;
}): Promise<Buffer> {
  const narrative = await getNarrative(
    `${role}:${filterLabel}`,
    buildNonExportAggregates(role, filterLabel, section as unknown as Record<string, unknown>),
  );

  return renderPpt(buildReportPptSpec(role, filterLabel, section, narrative));
}

export async function generateExportPpt(theme: "black" | "light" = "black"): Promise<Buffer> {
  const dashboard = await getExportDashboard();

  if (!dashboard.records || dashboard.records.length === 0) {
    throw new Error("Data Ekspor belum tersedia. Upload workbook Ekspor terlebih dahulu.");
  }

  // Narrative is theme-independent, so it caches once and is reused for black/light.
  const narrative = await getNarrative(
    "export",
    buildExportAggregates(dashboard.records as never[], dashboard.months as never[], dashboard.kpi),
  );

  return renderPpt(buildExportPptSpec(dashboard, narrative, theme));
}
