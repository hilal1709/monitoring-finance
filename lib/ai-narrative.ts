import "server-only";

import { createHash } from "node:crypto";

import { getPostgresPool } from "@/lib/postgres";

// ---------------------------------------------------------------------------
// AI narrative (executive summary) for PPT decks, via OpenRouter.
//
// The LLM only *interprets* pre-computed aggregates — it never sees raw records
// and is instructed never to invent numbers. Results are cached in Postgres,
// keyed by a hash of the exact aggregates, so identical data reuses the cached
// text (free + instant) and new data regenerates exactly once.
//
// Every failure path (missing key, rate limit, bad JSON, network) returns null
// so the caller renders the deck unchanged, without a narrative slide.
// ---------------------------------------------------------------------------

export type Narrative = {
  executiveSummary: string;
  insights: string[];
};

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL?.trim() || "google/gemma-4-31b-it:free";
const REQUEST_TIMEOUT_MS = 45_000;

// Free OpenRouter models are frequently rate-limited (429) upstream. We try the
// configured model first, then fall back through a few fast instruct models so a
// cache-miss download still gets a narrative. The result is cached under MODEL,
// so once any model answers, that data never needs the API again.
const FALLBACK_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

function modelChain(): string[] {
  return [...new Set([MODEL, ...FALLBACK_MODELS])];
}

// ── Schema (self-managed; mirrors supabase/schema.sql) ──────────────────────

let schemaPromise: Promise<void> | null = null;

function ensureNarrativeSchema() {
  schemaPromise ??= getPostgresPool()
    .query(`
      create table if not exists public.dashboard_narratives (
        cache_key  text primary key,
        scope      text not null,
        model      text not null,
        narrative  jsonb not null,
        created_at timestamptz not null default now()
      );
    `)
    .then(() => undefined);
  return schemaPromise;
}

// ── Aggregate builders (compact, numbers-only — anti-hallucination) ──────────

type RankItem = { label?: string; value?: number; count?: number; share?: number };

function topN(items: unknown, n = 6) {
  if (!Array.isArray(items)) return [];
  return (items as RankItem[]).slice(0, n).map((i) => ({
    label: i.label ?? "?",
    value: Math.round(Number(i.value ?? 0)),
    share: i.share != null ? Number((Number(i.share) * 100).toFixed(1)) : undefined,
  }));
}

/** Aggregates for invoice/payment decks, built from the (already filtered) section. */
export function buildNonExportAggregates(
  role: string,
  filterLabel: string,
  section: Record<string, unknown>,
) {
  const monthly = Array.isArray(section.monthly)
    ? (section.monthly as Array<{ label?: string; value?: number }>).map((m) => ({
        label: m.label ?? "?",
        value: Math.round(Number(m.value ?? 0)),
      }))
    : [];

  return {
    jenis: role === "invoice" ? "Invoice / Piutang" : "Payment / Pembayaran",
    filter: filterLabel,
    mataUang: "IDR",
    totalNilai: Math.round(Number(section.totalAmount ?? 0)),
    rataRata: Math.round(Number(section.averageAmount ?? 0)),
    jumlahRecord: Number(section.rowCount ?? 0),
    periodeTerakhir: section.latestPeriod ?? "-",
    distribusiStatus: topN(section.statusMix),
    tipeCustomer: topN(section.customerTypes),
    tipeInvoice: topN(section.invoiceTypes),
    topCustomer: topN(section.topCustomers),
    trenBulanan: monthly.slice(-12),
  };
}

type ExportRecordLike = {
  usdValue?: number;
  tonnage?: number;
  paymentDate?: unknown;
  paymentStatus?: unknown;
  companyCode?: string;
  destination?: string;
  buyer?: string;
};

function isPaid(r: ExportRecordLike) {
  return Boolean(r.paymentDate) || String(r.paymentStatus ?? "").toLowerCase() === "paid";
}

function rankBy<T>(records: ExportRecordLike[], keyFn: (r: ExportRecordLike) => string, n = 6) {
  const map = new Map<string, { value: number; count: number }>();
  for (const r of records) {
    const k = keyFn(r) || "Unmapped";
    const e = map.get(k) ?? { value: 0, count: 0 };
    e.value += Number(r.usdValue ?? 0);
    e.count += 1;
    map.set(k, e);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, value: Math.round(v.value), count: v.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

/** Aggregates for the export deck, built from raw export records + monthly rollups. */
export function buildExportAggregates(
  records: ExportRecordLike[],
  months: Array<{ label?: string; totalUsd?: number; totalTonnage?: number }>,
) {
  const totalUsd = records.reduce((s, r) => s + Number(r.usdValue ?? 0), 0);
  const paid = records.filter(isPaid);
  const unpaid = records.filter((r) => !isPaid(r));
  const totalPaid = paid.reduce((s, r) => s + Number(r.usdValue ?? 0), 0);
  const totalOutstanding = unpaid.reduce((s, r) => s + Number(r.usdValue ?? 0), 0);
  const totalTon = records.reduce((s, r) => s + Number(r.tonnage ?? 0), 0);

  return {
    jenis: "Ekspor SIG Group",
    mataUang: "USD",
    totalPenjualanUsd: Math.round(totalUsd),
    totalPenerimaanUsd: Math.round(totalPaid),
    outstandingUsd: Math.round(totalOutstanding),
    totalTonase: Math.round(totalTon),
    jumlahTransaksi: records.length,
    jumlahLunas: paid.length,
    jumlahBelumLunas: unpaid.length,
    topEntitas: rankBy(records, (r) => r.companyCode ?? ""),
    topTujuan: rankBy(records, (r) => r.destination ?? ""),
    topBuyer: rankBy(records, (r) => r.buyer ?? ""),
    trenBulanan: (months ?? []).slice(0, 12).map((m) => ({
      label: m.label ?? "?",
      penjualanUsd: Math.round(Number(m.totalUsd ?? 0)),
      tonase: Math.round(Number(m.totalTonnage ?? 0)),
    })),
  };
}

// ── OpenRouter call + cache ──────────────────────────────────────────────────

function cacheKey(scope: string, aggregates: unknown) {
  return createHash("sha256")
    .update(JSON.stringify({ scope, model: MODEL, aggregates }))
    .digest("hex");
}

function parseNarrative(content: string): Narrative | null {
  let text = content.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  let obj: { executiveSummary?: unknown; insights?: unknown };
  try {
    obj = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  const summary = typeof obj.executiveSummary === "string" ? obj.executiveSummary.trim() : "";
  const insights = Array.isArray(obj.insights)
    ? obj.insights
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  if (!summary && insights.length === 0) return null;
  return { executiveSummary: summary, insights };
}

const SYSTEM_PROMPT =
  "Kamu analis keuangan senior. Berdasarkan AGREGAT DATA berikut, tulis ringkasan eksekutif " +
  "untuk slide presentasi manajemen dalam Bahasa Indonesia yang profesional, ringkas, dan actionable. " +
  "ATURAN KETAT: hanya gunakan angka yang ADA atau dapat dihitung langsung dari data; " +
  "DILARANG mengarang angka, persentase, atau fakta yang tidak ada di data. " +
  "Soroti tren, konsentrasi/risiko (mis. piutang outstanding, status menunggak), dan hal yang perlu ditindaklanjuti. " +
  'Balas HANYA JSON valid tanpa teks lain, format: {"executiveSummary": string (2-3 kalimat), "insights": string[] (3-5 poin singkat)}.';

/** Single OpenRouter call for one model. Throws on network/timeout; returns null on bad/empty response. */
async function callModel(
  apiKey: string,
  model: string,
  scope: string,
  aggregates: unknown,
): Promise<Narrative | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "DeptControl PPT Narrative",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Konteks: ${scope}\n\nData agregat:\n${JSON.stringify(aggregates)}` },
        ],
      }),
    });

    if (!res.ok) {
      console.warn(`[ai-narrative] ${model} -> ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    return content ? parseNarrative(content) : null;
  } finally {
    clearTimeout(timer);
  }
}

/** Tries the model chain in order until one returns a usable narrative. */
async function callOpenRouter(apiKey: string, scope: string, aggregates: unknown): Promise<Narrative | null> {
  for (const model of modelChain()) {
    try {
      const narrative = await callModel(apiKey, model, scope, aggregates);
      if (narrative) return narrative;
    } catch (error) {
      console.warn(`[ai-narrative] ${model} error:`, error instanceof Error ? error.message : error);
    }
  }
  return null;
}

/**
 * Returns a cached or freshly-generated narrative for the given scope+aggregates,
 * or null if AI is disabled/unavailable (caller renders the deck without it).
 */
export async function getNarrative(scope: string, aggregates: unknown): Promise<Narrative | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    await ensureNarrativeSchema();
    const pool = getPostgresPool();
    const key = cacheKey(scope, aggregates);

    const hit = await pool.query<{ narrative: Narrative }>(
      `select narrative from public.dashboard_narratives where cache_key = $1;`,
      [key],
    );
    if (hit.rows[0]) return hit.rows[0].narrative;

    const narrative = await callOpenRouter(apiKey, scope, aggregates);
    if (!narrative) return null;

    await pool.query(
      `insert into public.dashboard_narratives (cache_key, scope, model, narrative)
       values ($1, $2, $3, $4)
       on conflict (cache_key) do nothing;`,
      [key, scope, MODEL, JSON.stringify(narrative)],
    );
    return narrative;
  } catch (error) {
    console.warn("[ai-narrative] gagal:", error instanceof Error ? error.message : error);
    return null;
  }
}
