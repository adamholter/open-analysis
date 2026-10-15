import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { themeById } from "@/lib/page-presets";
import type { Benchmark, Snapshot } from "@/data/types";

let cached: Snapshot | null = null;
export function snapshot(): Snapshot {
  cached ??= JSON.parse(gunzipSync(readFileSync(path.join(process.cwd(), "data/snapshot.json.gz"))).toString("utf8")) as Snapshot;
  return cached;
}

export { OPEN_INDEX, openIndexConfig } from "@/lib/open-index";

/** Lab colors from the Analysis theme (AA creator colors), same as the charts. */
const LAB_COLORS = themeById("aa")!.labColors!;
export const labColor = (labId: string) => LAB_COLORS[labId] ?? LAB_COLORS.other;

export function benchmarkById(id: string): Benchmark | undefined {
  return snapshot().benchmarks.find((b) => b.id === id);
}

export interface ModelResult { benchmark: Benchmark; effort: string; value: number; costUsd?: number; sourceUrl: string; harness?: string }

/** Every measured result for a model, best effort per benchmark first. */
export function modelResults(modelId: string): ModelResult[] {
  const snap = snapshot();
  const variants = new Map(snap.variants.filter((v) => v.modelId === modelId).map((v) => [v.id, v]));
  const bench = new Map(snap.benchmarks.map((b) => [b.id, b]));
  return snap.observations.filter((o) => variants.has(o.variantId) && bench.has(o.benchmarkId)).map((o) => ({
    benchmark: bench.get(o.benchmarkId)!, effort: variants.get(o.variantId)!.effort, value: o.value, costUsd: o.costUsd, sourceUrl: o.sourceUrl, harness: o.harness,
  }));
}

export interface BenchmarkRow { modelId: string; name: string; labId: string; color: string; effort: string; value: number; costUsd?: number; harness?: string; sourceUrl: string }

/** One row per model (its best result) for a benchmark, best first. */
export function benchmarkRows(benchmarkId: string): BenchmarkRow[] {
  const snap = snapshot();
  const b = snap.benchmarks.find((x) => x.id === benchmarkId);
  if (!b) return [];
  const variants = new Map(snap.variants.map((v) => [v.id, v]));
  const models = new Map(snap.models.map((m) => [m.id, m]));
  const best = new Map<string, BenchmarkRow>();
  for (const o of snap.observations) {
    if (o.benchmarkId !== benchmarkId) continue;
    const v = variants.get(o.variantId); const m = v && models.get(v.modelId);
    if (!v || !m) continue;
    const prev = best.get(m.id);
    if (prev && (b.higherIsBetter ? prev.value >= o.value : prev.value <= o.value)) continue;
    best.set(m.id, { modelId: m.id, name: m.name, labId: m.labId, color: labColor(m.labId), effort: v.effort, value: o.value, costUsd: o.costUsd, harness: o.harness, sourceUrl: o.sourceUrl });
  }
  return [...best.values()].sort((x, y) => (b.higherIsBetter ? y.value - x.value : x.value - y.value));
}




/**
 * The snapshot minus what model pages never read (source URLs, notes, AA metadata blobs), served once as a static file
 * at /data/snapshot-lite.json and shared by every model page instead of being embedded in each of them.
 */
export function liteSnapshot(): Snapshot {
  const snap = snapshot();
  const keepDetails = new Set(["estimatedDecodeSecondsPerTask", "outputTokensPerTask", "priorsEstimate", "window"]);
  // Radar axes print `shortName ?? name`; drop trailing "(Vals)"-style qualifiers so long names fit around the chart.
  const benchmarks = snap.benchmarks.map((b) => { if (b.shortName) return b; const short = b.name.replace(/\s*\([^)]*\)\s*$/, ""); return short !== b.name && short.length >= 4 ? { ...b, shortName: short } : b; });
  return {
    ...snap,
    benchmarks,
    sources: [],
    series: [],
    variants: snap.variants.map((v) => ({ ...v, sourceModels: undefined, sourceModel: v.sourceModel ? { id: v.sourceModel.id, slug: v.sourceModel.slug, name: v.sourceModel.name, url: "" } : undefined })),
    observations: snap.observations.map((o) => {
      const details = o.details && Object.fromEntries(Object.entries(o.details).filter(([k]) => keepDetails.has(k)));
      return { benchmarkId: o.benchmarkId, variantId: o.variantId, value: o.value, observedAt: "", sourceUrl: "",
        ...(o.costUsd != null ? { costUsd: o.costUsd } : {}), ...(o.durationSec != null ? { durationSec: o.durationSec } : {}), ...(o.outputTokens != null ? { outputTokens: o.outputTokens } : {}),
        ...(details && Object.keys(details).length ? { details } : {}) };
    }),
  };
}

export interface ModelFacts { creator?: string; openWeights?: boolean; license?: string; paramsB?: number; activeParamsB?: number; contextTokens?: number; priceInPerM?: number; priceOutPerM?: number }

/** What Artificial Analysis publishes about a model itself (licensing, size, context window, list price). */
export function modelFacts(modelId: string): ModelFacts | undefined {
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
  for (const v of snapshot().variants) {
    if (v.modelId !== modelId) continue;
    for (const sm of v.sourceModels ?? (v.sourceModel ? [v.sourceModel] : [])) {
      const m = sm.metadata;
      if (!m || !("isOpenWeights" in m)) continue;
      return {
        creator: (m.creator as { name?: string } | undefined)?.name, openWeights: typeof m.isOpenWeights === "boolean" ? m.isOpenWeights : undefined,
        license: typeof m.licenseName === "string" ? m.licenseName : undefined, paramsB: num(m.parameters), activeParamsB: num(m.inferenceParametersActiveBillions ?? m.activeParams),
        contextTokens: num(m.contextWindowTokens), priceInPerM: num(m.price1mInputTokens), priceOutPerM: num(m.price1mOutputTokens),
      };
    }
  }
  return undefined;
}
