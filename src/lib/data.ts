import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import type { IndexConfig } from "@/engine";
import { themeById } from "@/lib/page-presets";
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


