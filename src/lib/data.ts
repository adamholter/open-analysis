import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { computeIndex, selectVariants, type IndexConfig, type RankedVariant } from "@/engine";
import type { Benchmark, Snapshot } from "@/data/types";
import openIndex from "../../open-index.json";

let cached: Snapshot | null = null;
export function snapshot(): Snapshot {
  cached ??= JSON.parse(gunzipSync(readFileSync(path.join(process.cwd(), "data/snapshot.json.gz"))).toString("utf8")) as Snapshot;
  return cached;
}

export const OPEN_INDEX = openIndex;

export function openIndexConfig(): IndexConfig {
  return {
    id: "open-index", name: openIndex.name,
    weights: Object.fromEntries(openIndex.benchmarks.map((b) => [b.id, b.weight])),
    required: [], cutoff: 5, strictness: openIndex.strictness, estimateMissing: true,
    variants: "all", rankingVariants: "best", paretoVariants: "all",
  };
}

export interface IndexRow {
  rank: number;
  modelId: string;
  variantId: string;
  name: string;
  effort: string;
  labId: string;
  labName: string;
  color: string;
  score: number;
  coverage: number;
  releaseDate?: string;
  costPerTask?: number;
  speed?: number;
  latency?: number;
}

const LAB_COLORS: Record<string, string> = {
  anthropic: "#cc785c", openai: "#1f1f1f", google: "#34A853", meta: "#0089f4", xai: "#736cd3", spacexai: "#736cd3", deepseek: "#2243e6", alibaba: "#ff7018",
  moonshot: "#047AFE", mistral: "#f32e02", zhipu: "#1c7ff8", minimax: "#EB3568", xiaomi: "#ff6900", "thinking-machines": "#676767", nvidia: "#76b900",
  stepfun: "#00b8ad", inception: "#021B30", microsoft: "#0078D5", cohere: "#D18EE2", "ant-group": "#4fb5ff", tencent: "#3c8bff", cognition: "#1B818E", cursor: "#505050", other: "#909090",
};
export const labColor = (labId: string) => LAB_COLORS[labId] ?? LAB_COLORS.other;

function metricByModel(snap: Snapshot, benchmarkId: string) {
  const out = new Map<string, number>();
  const variantModel = new Map(snap.variants.map((v) => [v.id, v.modelId]));
  for (const o of snap.observations) if (o.benchmarkId === benchmarkId) {
    const m = variantModel.get(o.variantId);
    if (m && !out.has(m)) out.set(m, o.value);
  }
  return out;
}

/** Mean measured cost per task across the index's benchmarks that publish run costs (needs two). */
function costPerTask(snap: Snapshot, variantId: string, benchmarkIds: Set<string>): number | undefined {
  const costs = snap.observations.filter((o) => o.variantId === variantId && benchmarkIds.has(o.benchmarkId) && o.costUsd != null && o.costUsd > 0).map((o) => o.costUsd!);
  if (costs.length < 2) return undefined;
  return Math.exp(costs.reduce((s, c) => s + Math.log(c), 0) / costs.length);
}

let indexCache: { best: IndexRow[]; all: IndexRow[] } | null = null;
export function openIndexRows() {
  if (indexCache) return indexCache;
  const snap = snapshot();
  const result = computeIndex(snap, openIndexConfig());
  const labs = new Map(snap.labs.map((l) => [l.id, l.name]));
  const tps = metricByModel(snap, "openrouter-tps");
  const latency = metricByModel(snap, "openrouter-latency");
  const ids = new Set(openIndex.benchmarks.map((b) => b.id));
  const row = (r: RankedVariant): IndexRow => ({
    rank: r.rank, modelId: r.model.id, variantId: r.variant.id, name: r.model.name, effort: r.variant.effort,
    labId: r.model.labId, labName: labs.get(r.model.labId) ?? r.model.labId, color: labColor(r.model.labId),
    score: r.score, coverage: r.measuredShare, releaseDate: r.model.releaseDate,
    costPerTask: costPerTask(snap, r.variant.id, ids), speed: tps.get(r.model.id), latency: latency.get(r.model.id),
  });
  indexCache = { best: selectVariants(result.ranked, "best").map(row), all: selectVariants(result.ranked, "all").map(row) };
  return indexCache;
}

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

export function sourceName(b: Benchmark): string {
  if (b.community) return b.maintainer ?? "Community";
  try { return new URL(b.url).hostname.replace(/^www\./, ""); } catch { return b.sourceId; }
}
