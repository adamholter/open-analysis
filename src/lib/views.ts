/**
 * Server-side chart payloads. Everything here is plain data (no functions) so it can cross into the
 * client chart components; chart formatting lives in src/lib/charts.ts.
 */
import { computeIndex, selectVariants, type IndexConfig, type RankedVariant } from "@/engine";
import type { Benchmark, BenchmarkCategory, Lab, Snapshot } from "@/data/types";
import { metricPanels, type MetricPoint } from "@/lib/metrics";
import { openIndexConfig, snapshot, OPEN_INDEX } from "@/lib/data";

/** Drop per-benchmark detail (estimates, evidence) the charts never read: keeps page payloads small. */
export function slim(r: RankedVariant, api?: Map<string, number>): RankedVariant & { costApi?: number } {
  const v = r.variant, m = r.model;
  const costApi = api?.get(v.id);
  return {
    ...(costApi != null ? { costApi } : {}),
    rank: r.rank, score: r.score, coverage: r.coverage, measuredShare: r.measuredShare, onFrontier: r.onFrontier, values: [],
    ...(r.costUsd != null ? { costUsd: r.costUsd } : {}), ...(r.speed != null ? { speed: r.speed } : {}),
    model: { id: m.id, name: m.name, labId: m.labId, kind: m.kind, reasoning: m.reasoning, aliases: [], ...(m.releaseDate ? { releaseDate: m.releaseDate } : {}) },
    variant: { id: v.id, modelId: v.modelId, effort: v.effort, ...(v.configuration ? { configuration: v.configuration } : {}),
      ...(v.sourceModel ? { sourceModel: { id: v.sourceModel.id, slug: v.sourceModel.slug, name: v.sourceModel.name, url: "" } } : {}) },
  };
}
const slimPoints = (pts: MetricPoint[], api?: Map<string, number>) => pts.map((p) => ({ ...p, r: slim(p.r, api) }));

const memo = new Map<string, unknown>();
function cached<T>(key: string, make: () => T): T {
  if (!memo.has(key)) memo.set(key, make());
  return memo.get(key) as T;
}

export interface IndexView { id: string; name: string; description: string; benchmarks: { id: string; name: string; share: number }[]; best: RankedVariant[]; all: (RankedVariant & { costApi?: number })[] }

/** Charts get a year of models; the page's release-window filter (default 3 months) narrows it in the browser. */
export const WINDOW_MONTHS = 12;
const windowAfter = (snap: Snapshot) => { const d = new Date(snap.date); d.setUTCMonth(d.getUTCMonth() - WINDOW_MONTHS); return d.toISOString().slice(0, 10); };
const windowed = (snap: Snapshot, config: IndexConfig): IndexConfig => ({ ...config, releasedAfter: windowAfter(snap) });

/** API-list-price cost per variant, to sit beside the default subscription cost the engine prices. */
function apiCosts(snap: Snapshot, config: IndexConfig) {
  return cached(`api:${config.id}`, () => new Map(computeIndex(snap, { ...config, costBasis: "api" }).ranked.flatMap((r) => (r.costUsd != null ? [[r.variant.id, r.costUsd] as const] : []))));
}

function indexView(snap: Snapshot, base: IndexConfig, description: string): IndexView {
  const config = windowed(snap, base);
  const api = apiCosts(snap, config);
  const result = computeIndex(snap, config);
  return {
    id: config.id, name: config.name, description,
    benchmarks: result.benchmarks.map((b) => ({ id: b.benchmark.id, name: b.benchmark.name, share: b.share })),
    best: selectVariants(result.ranked, "best").map((r) => slim(r, api)),
    all: selectVariants(result.ranked, "all").map((r) => slim(r, api)),
  };
}

export const openIndexView = () => cached("open", () => indexView(snapshot(), openIndexConfig(), `Equal-weight average of ${OPEN_INDEX.benchmarks.length} independent benchmarks.`));

/** Models released in the default window: the population capability indexes and benchmark charts are judged on. */
function recentModels(snap: Snapshot) {
  const after = windowAfter(snap);
  return new Set(snap.models.filter((m) => !m.releaseDate || m.releaseDate >= after).map((m) => m.id));
}

function coverage(snap: Snapshot, recent: Set<string>) {
  const variantModel = new Map(snap.variants.map((v) => [v.id, v.modelId]));
  const out = new Map<string, Set<string>>();
  for (const o of snap.observations) {
    const m = variantModel.get(o.variantId);
    if (!m || !recent.has(m)) continue;
    (out.get(o.benchmarkId) ?? out.set(o.benchmarkId, new Set()).get(o.benchmarkId)!).add(m);
  }
  return out;
}

const SCORE_UNITS = new Set(["percent", "score", "elo"]);
const rankable = (b: Benchmark) => SCORE_UNITS.has(b.unit) && !b.proxy && b.category !== "composite" && b.category !== "cost" && b.category !== "speed" && b.category !== "reliability" && b.category !== "other";

export const CAPABILITIES: { id: BenchmarkCategory; name: string }[] = [
  { id: "coding", name: "Coding" }, { id: "agentic", name: "Agentic" }, { id: "reasoning", name: "Reasoning" },
  { id: "math", name: "Math" }, { id: "knowledge", name: "Knowledge" }, { id: "economics", name: "Professional" },
  { id: "long-context", name: "Long Context" }, { id: "safety", name: "Cyber" },
];

/** One index per capability: the six best-covered benchmarks in that category, equal weight, at most two per publisher. */
export const capabilityIndexes = () => cached("capabilities", () => {
  const snap = snapshot();
  const cov = coverage(snap, recentModels(snap));
  return CAPABILITIES.flatMap((cap) => {
    const perSource = new Map<string, number>();
    const picks = snap.benchmarks.filter((b) => b.category === cap.id && rankable(b) && (cov.get(b.id)?.size ?? 0) >= 12)
      .sort((a, b) => cov.get(b.id)!.size - cov.get(a.id)!.size)
      .filter((b) => { const key = b.sourceId.replace(/^vals-.*/, "vals"); const n = perSource.get(key) ?? 0; perSource.set(key, n + 1); return n < 2; })
      .slice(0, 6);
    if (picks.length < 2) return [];
    const config: IndexConfig = { ...openIndexConfig(), id: `cap-${cap.id}`, name: `${cap.name} Index`, weights: Object.fromEntries(picks.map((b) => [b.id, 1])) };
    return [indexView(snap, config, `Equal-weight average of ${picks.length} ${cap.name.toLowerCase()} benchmarks.`)];
  });
});

/** Points travel compactly: [index into `models`, effort, value]. Decoded on the client. */
export type CompactPoint = [number, string, number];
export interface BenchmarkChart { id: string; name: string; category: string; publisher: string; community: boolean; unit: string; higherIsBetter: boolean; updated?: string; models: number; points: CompactPoint[] }
export interface ChartModel { id: string; name: string; labId: string; releaseDate?: string }
export interface BenchmarkCharts { models: ChartModel[]; charts: BenchmarkChart[] }

/** Single-benchmark bar charts for every benchmark with enough recent models, best covered first. */
export const benchmarkCharts = (): BenchmarkCharts => cached("benchmarks", () => {
  const snap = snapshot();
  const recent = recentModels(snap);
  const cov = coverage(snap, recent);
  const variants = new Map(snap.variants.map((v) => [v.id, v]));
  const models: ChartModel[] = [], slot = new Map<string, number>();
  const modelSlot = (id: string) => {
    if (!slot.has(id)) { const m = snap.models.find((x) => x.id === id)!; slot.set(id, models.length); models.push({ id: m.id, name: m.name, labId: m.labId, ...(m.releaseDate ? { releaseDate: m.releaseDate } : {}) }); }
    return slot.get(id)!;
  };
  const charts: BenchmarkChart[] = [];
  for (const b of snap.benchmarks) {
    if (!(rankable(b) || b.category === "composite") || (cov.get(b.id)?.size ?? 0) < 8) continue;
    const points: CompactPoint[] = [];
    for (const o of snap.observations) {
      if (o.benchmarkId !== b.id || !Number.isFinite(o.value)) continue;
      const v = variants.get(o.variantId);
      if (!v || !recent.has(v.modelId)) continue;
      points.push([modelSlot(v.modelId), v.effort, +o.value.toPrecision(5)]);
    }
    // Skip boards that are mostly zeros (e.g. sub-scores nobody passes): nothing to compare.
    if (new Set(points.filter((p) => p[2] !== 0).map((p) => p[0])).size < 8) continue;
    charts.push({ id: b.id, name: b.name, category: b.category, publisher: publisherOf(b), community: !!b.community, unit: b.unit,
      higherIsBetter: b.higherIsBetter, updated: b.lastUpdated, models: cov.get(b.id)!.size, points });
  }
  return { models, charts: charts.sort((a, b) => b.models - a.models) };
});

export function publisherOf(b: Benchmark): string {
  if (b.community) return b.maintainer ?? "Community";
  const known: Record<string, string> = { aa: "Artificial Analysis", openrouter: "OpenRouter", arena: "LMArena", arcagi: "ARC Prize", frontiermath: "Epoch AI", "epoch-furniture": "Epoch AI", simplebench: "SimpleBench", terminalbench: "Terminal-Bench", deepswe: "Datacurve", frontierswe: "FrontierSWE", frontiercode: "Cognition", bsbench: "Peter Gostev", andonlabs: "Andon Labs", weirdml: "WeirdML", zapier: "Zapier", roboflow: "Roboflow", osworld: "OSWorld", scale: "Scale AI", "scale-hss": "Scale AI", simpleqa: "SimpleQA", voxelbench: "VoxelBench", minebench: "MineBench", slopalytics: "Slopalytics", posttrainbench: "PostTrainBench", exploitbench: "ExploitBench", programbench: "ProgramBench", realapipricing: "Real API Pricing" };
  return known[b.sourceId] ?? (b.sourceId.startsWith("vals") ? "Vals AI" : b.sourceId);
}

/** Metric panels (latency, tokens, time per task, release date, uptime, usage) as plain points, on the Open Index ranking. */
export const metricViews = () => cached("metrics", () => {
  const snap = snapshot();
  const config = windowed(snap, openIndexConfig());
  const api = apiCosts(snap, config);
  const result = computeIndex(snap, config);
  const ranked = selectVariants(result.ranked, "all");
  const panels = metricPanels(snap, ranked).filter((p) => p.chart).map((p) => ({ id: p.id, title: p.title, desc: p.desc, points: slimPoints(p.chart!.points(ranked), api) }));
  const speed = ranked.filter((r) => r.speed && r.speed > 0).map((r) => ({ x: r.speed!, r: slim(r, api) }));
  const cost = ranked.filter((r) => r.costUsd != null && r.costUsd > 0).map((r) => ({ x: r.costUsd!, r: slim(r, api) }));
  return { panels, speed, cost };
});

export interface OpennessRow { open: RankedVariant[]; closed: RankedVariant[] }

/** Open Index split by open weights (AA model metadata), best effort per model. */
export const openness = () => cached("openness", () => {
  const snap = snapshot();
  const open = new Map<string, boolean>();
  for (const v of snap.variants) {
    if (open.has(v.modelId)) continue;
    for (const sm of v.sourceModels ?? (v.sourceModel ? [v.sourceModel] : [])) {
      const flag = sm.metadata?.isOpenWeights;
      if (typeof flag === "boolean") { open.set(v.modelId, flag); break; }
    }
  }
  const { best, all } = openIndexView();
  return {
    open: best.filter((r) => open.get(r.model.id) === true), closed: best.filter((r) => open.get(r.model.id) === false), known: open,
    openAll: all.filter((r) => open.get(r.model.id) === true),
  };
});

/** Provider count per model (OpenRouter), on each model's best Open Index effort. */
export const providers = () => cached("providers", () => {
  const snap = snapshot();
  const variantModel = new Map(snap.variants.map((v) => [v.id, v.modelId]));
  const count = new Map<string, number>();
  for (const o of snap.observations) if (o.benchmarkId === "openrouter-providers") { const m = variantModel.get(o.variantId); if (m) count.set(m, Math.max(count.get(m) ?? 0, o.value)); }
  return openIndexView().all.filter((r) => count.has(r.model.id)).map((r) => ({ x: count.get(r.model.id)!, r }));
});

/** Everything the page-wide model picker needs: one row per model (best score) and the efforts that exist. */
export const pickerData = () => cached("picker", () => {
  const { all } = openIndexView();
  const best = new Map<string, PickerRow>();
  for (const r of all) { const cur = best.get(r.model.id); if (!cur || r.score > cur.score) best.set(r.model.id, { id: r.model.id, name: r.model.name, labId: r.model.labId, ...(r.model.releaseDate ? { releaseDate: r.model.releaseDate } : {}), score: r.score }); }
  const dates = Object.fromEntries(snapshot().models.flatMap((m) => (m.releaseDate && m.releaseDate >= windowAfter(snapshot()) ? [[m.id, m.releaseDate] as const] : [])));
  return { asOf: snapshot().date, models: [...best.values()].sort((a, b) => b.score - a.score), efforts: [...new Set([...all.map((r) => r.variant.effort), ...snapshot().variants.map((v) => v.effort)])], dates };
});
export interface PickerRow { id: string; name: string; labId: string; releaseDate?: string; score: number }

export const labs = (): Lab[] => snapshot().labs;

/** Every measured result for one benchmark (all release dates), as bar points. */
export function benchmarkPoints(id: string): MetricPoint[] {
  const snap = snapshot();
  const models = new Map(snap.models.map((m) => [m.id, m]));
  const variants = new Map(snap.variants.map((v) => [v.id, v]));
  return slimPoints(snap.observations.flatMap((o) => {
    if (o.benchmarkId !== id) return [];
    const v = variants.get(o.variantId), m = v && models.get(v.modelId);
    return v && m && Number.isFinite(o.value) ? [{ x: o.value, r: { variant: v, model: m, score: o.value, coverage: 1, measuredShare: 1, values: [], onFrontier: false, rank: 0 } }] : [];
  }));
}
