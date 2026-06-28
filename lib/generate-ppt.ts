import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { getExportDashboard } from "@/lib/export-dashboard-store";
import { buildExportAggregates, getNarrative, type Narrative } from "@/lib/ai-narrative";

function pythonExe(): string {
  // Use the AutoClaw-bundled Python on Windows, or system python3 on Unix
  if (process.platform === "win32") {
    const bundled = "C:\\Program Files\\AutoClaw\\resources\\python\\python.exe";
    if (fs.existsSync(bundled)) return bundled;
    return "python";
  }
  return "python3";
}

function pythonScriptPath(name: string) {
  return path.join(process.cwd(), "lib", name);
}

function runPythonGenerator(scriptName: string, inputData: Record<string, unknown>): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `deptcontrol_pptx_${Date.now()}.pptx`);
  const exe = pythonExe();

  return new Promise<Buffer>((resolve, reject) => {
    const proc = spawn(exe, [pythonScriptPath(scriptName), outputPath], {
      stdio: ["pipe", "pipe", "pipe"],
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

    proc.stdin.write(JSON.stringify(inputData));
    proc.stdin.end();
  });
}

export async function generateNonExportPpt(inputData: {
  role: string;
  filterLabel: string;
  section: Record<string, unknown>;
  narrative?: Narrative | null;
}): Promise<Buffer> {
  return runPythonGenerator("generate_ppt.py", inputData);
}

export async function generateExportPpt(theme: "black" | "light" = "black"): Promise<Buffer> {
  const dashboard = await getExportDashboard();

  if (!dashboard.records || dashboard.records.length === 0) {
    throw new Error("Data Ekspor belum tersedia. Upload workbook Ekspor terlebih dahulu.");
  }

  // Narrative is theme-independent, so it caches once and is reused for black/light.
  const narrative = await getNarrative(
    "export",
    buildExportAggregates(dashboard.records as never[], dashboard.months as never[]),
  );

  return runPythonGenerator("generate_export_ppt.py", {
    records: dashboard.records,
    months: dashboard.months,
    theme,
    narrative,
  });
}
