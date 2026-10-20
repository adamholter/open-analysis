/**
 * Server-side chart payloads. Everything here is plain data (no functions) so it can cross into the
 * client chart components; chart formatting lives in src/lib/charts.ts.
 */
import { computeIndex, selectVariants, type IndexConfig, type RankedVariant } from "@/engine";
import type { Benchmark, BenchmarkCategory, Lab, Snapshot } from "@/data/types";
import { metricPanels, type MetricPoint } from "@/lib/metrics";
import { openIndexConfig, snapshot, OPEN_INDEX } from "@/lib/data";
import { reasoningEffortChips } from "@/lib/filters";
import { categoryLabel } from "@/lib/categories";
import taskAccess from "../../config/task-access.json";

/** Drop per-benchmark detail (estimates, evidence) the charts never read: keeps page payloads small. */
export function slim(r: RankedVariant): RankedVariant {
  const v = r.variant, m = r.model;
  return {
    rank: r.rank, score: r.score, coverage: r.coverage, measuredShare: r.measuredShare, onFrontier: r.onFrontier, values: [],
    ...(r.costUsd != null ? { costUsd: r.costUsd } : {}), ...(r.speed != null ? { speed: r.speed } : {}),
    model: { id: m.id, name: m.name, labId: m.labId, kind: m.kind, reasoning: m.reasoning, aliases: [], ...(m.releaseDate ? { releaseDate: m.releaseDate } : {}) },
    variant: { id: v.id, modelId: v.modelId, effort: v.effort, ...(v.configuration ? { configuration: v.configuration } : {}),
      ...(v.sourceModel ? { sourceModel: { id: v.sourceModel.id, slug: v.sourceModel.slug, name: v.sourceModel.name, url: "" } } : {}) },
  };
}
const slimPoints = (pts: MetricPoint[]) => pts.map((p) => ({ ...p, r: slim(p.r) }));

const memo = new Map<string, unknown>();
function cached<T>(key: string, make: () => T): T {
  if (!memo.has(key)) memo.set(key, make());
  return memo.get(key) as T;
}

export interface IndexView { id: string; name: string; description: string; benchmarks: { id: string; name: string; share: number }[]; best: RankedVariant[]; all: RankedVariant[] }

/** Charts get a year of models; the page's release-window filter (default 3 months) narrows it in the browser. */
export const WINDOW_MONTHS = 12;
const windowAfter = (snap: Snapshot) => { const d = new Date(snap.date); d.setUTCMonth(d.getUTCMonth() - WINDOW_MONTHS); return d.toISOString().slice(0, 10); };
const windowed = (snap: Snapshot, config: IndexConfig): IndexConfig => ({ ...config, releasedAfter: windowAfter(snap) });

function indexView(snap: Snapshot, base: IndexConfig, description: string): IndexView {
  const config = windowed(snap, base);
  const result = computeIndex(snap, config);
  return {
    id: config.id, name: config.name, description,
    benchmarks: result.benchmarks.map((b) => ({ id: b.benchmark.id, name: b.benchmark.name, share: b.share })),
    best: selectVariants(result.ranked, "best").map(slim),
    all: selectVariants(result.ranked, "all").map(slim),
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

export const CAPABILITIES: { id: BenchmarkCategory; name: string }[] = (["coding", "agentic", "reasoning", "math", "knowledge", "economics", "long-context", "safety"] as BenchmarkCategory[])
  .map((id) => ({ id, name: categoryLabel(id) }));

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
export interface BenchmarkChart { id: string; name: string; category: string; publisher: string; community: boolean; unit: string; higherIsBetter: boolean; updated?: string; models: number; description: string; access?: "public" | "closed"; points: CompactPoint[] }
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
    const access = accessOf(b.id);
    charts.push({ id: b.id, name: b.name, category: b.category, publisher: publisherOf(b), community: !!b.community, unit: b.unit,
      higherIsBetter: b.higherIsBetter, updated: b.lastUpdated, models: cov.get(b.id)!.size, description: b.description, ...(access ? { access } : {}), points });
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
  const result = computeIndex(snap, config);
  const ranked = selectVariants(result.ranked, "all");
  const panels = metricPanels(snap, ranked).filter((p) => p.chart).map((p) => ({ id: p.id, title: p.title, desc: p.desc, points: slimPoints(p.chart!.points(ranked)) }));
  const speed = ranked.filter((r) => r.speed && r.speed > 0).map((r) => ({ x: r.speed!, r: slim(r) }));
  const cost = ranked.filter((r) => r.costUsd != null && r.costUsd > 0).map((r) => ({ x: r.costUsd!, r: slim(r) }));
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
  const efforts = new Map<string, Set<string>>();
  for (const r of all) {
    const cur = best.get(r.model.id);
    if (!cur || r.score > cur.score) best.set(r.model.id, { id: r.model.id, name: r.model.name, labId: r.model.labId, ...(r.model.releaseDate ? { releaseDate: r.model.releaseDate } : {}), score: r.score, efforts: [] });
    efforts.set(r.model.id, (efforts.get(r.model.id) ?? new Set()).add(r.variant.effort));
  }
  for (const m of best.values()) m.efforts = reasoningEffortChips([...efforts.get(m.id)!]);
  const dates = Object.fromEntries(snapshot().models.flatMap((m) => (m.releaseDate && m.releaseDate >= windowAfter(snapshot()) ? [[m.id, m.releaseDate] as const] : [])));
  return { asOf: snapshot().date, models: [...best.values()].sort((a, b) => b.score - a.score), efforts: [...new Set([...all.map((r) => r.variant.effort), ...snapshot().variants.map((v) => v.effort)])], dates };
});
export interface PickerRow { id: string; name: string; labId: string; releaseDate?: string; score: number; /** Reasoning efforts this model is ranked at, in display order. */ efforts: string[] }

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

/** Whether a benchmark publishes its tasks (config/task-access.json); unknown when not listed. */
export type Access = "public" | "closed" | undefined;
const PUBLIC = new Set(taskAccess.public), CLOSED = new Set(taskAccess.closed);
export const accessOf = (id: string): Access => (CLOSED.has(id) ? "closed" : PUBLIC.has(id) ? "public" : undefined);

/** A model as every picker, preset and search sees it: best Open Index level, its coverage, cost and speed. */
export interface CatModel { id: string; name: string; labId: string; releaseDate?: string; efforts: string[];
  /** Best Open Index score and its level; absent for models the index doesn't rank. */ score?: number; effort?: string;
  /** Index benchmarks with a measured result, out of `indexSize`. */ measured: number; results: number; cost?: number; speed?: number; open?: boolean }
export interface CatBench { id: string; name: string; category: string; publisher: string; models: number; community?: boolean; access?: "public" | "closed"; cost?: boolean; updated?: string }
export interface Catalog { asOf: string; indexSize: number; labs: { id: string; name: string; color: string }[]; models: CatModel[]; benchmarks: CatBench[];
  /** Models with results that are not on the Open Index (older or too few results), for search: [id, name, labId]. */ others: [string, string, string][] }

/** Models the picker offers besides the Open Index ones: released in the chart window with results on this many benchmarks. */
const EXTRA_MIN_RESULTS = 30;

/** Everything the shared model selection and the header search need, on every page. */
export const catalog = (): Catalog => cached("catalog", () => {
  const snap = snapshot();
  const { all, benchmarks: idx } = openIndexView();
  const open = openness().known;
  const variantModel = new Map(snap.variants.map((v) => [v.id, v]));
  const benchOf = new Map<string, Set<string>>(), effortsOf = new Map<string, Set<string>>(), counts = new Map<string, Set<string>>(), costed = new Set<string>();
  for (const o of snap.observations) {
    const v = variantModel.get(o.variantId); if (!v) continue;
    if (o.costUsd != null && o.costUsd > 0) costed.add(o.benchmarkId);
    (benchOf.get(v.modelId) ?? benchOf.set(v.modelId, new Set()).get(v.modelId)!).add(o.benchmarkId);
    (effortsOf.get(v.modelId) ?? effortsOf.set(v.modelId, new Set()).get(v.modelId)!).add(v.effort);
    (counts.get(o.benchmarkId) ?? counts.set(o.benchmarkId, new Set()).get(o.benchmarkId)!).add(v.modelId);
  }
  const best = new Map<string, RankedVariant>(), efforts = new Map<string, Set<string>>();
  for (const r of all) {
    const cur = best.get(r.model.id);
    if (!cur || r.score > cur.score) best.set(r.model.id, r);
    efforts.set(r.model.id, (efforts.get(r.model.id) ?? new Set()).add(r.variant.effort));
  }
  const ranked: CatModel[] = [...best.values()].sort((a, b) => b.score - a.score).map((r) => ({
    id: r.model.id, name: r.model.name, labId: r.model.labId, ...(r.model.releaseDate ? { releaseDate: r.model.releaseDate } : {}),
    efforts: reasoningEffortChips([...efforts.get(r.model.id)!]), score: +r.score.toFixed(2), effort: r.variant.effort,
    measured: Math.round(r.measuredShare * idx.length), results: benchOf.get(r.model.id)?.size ?? 0,
    ...(r.costUsd != null ? { cost: +r.costUsd.toPrecision(4) } : {}), ...(r.speed != null ? { speed: +r.speed.toFixed(1) } : {}),
    ...(open.has(r.model.id) ? { open: open.get(r.model.id) } : {}),
  }));
  const inIndex = new Set(ranked.map((m) => m.id)), after = windowAfter(snap);
  const extra: CatModel[] = snap.models.filter((m) => m.kind === "llm" && !inIndex.has(m.id) && m.releaseDate && m.releaseDate >= after && (benchOf.get(m.id)?.size ?? 0) >= EXTRA_MIN_RESULTS)
    .map((m) => ({ id: m.id, name: m.name, labId: m.labId, releaseDate: m.releaseDate, efforts: reasoningEffortChips([...effortsOf.get(m.id)!]), measured: 0, results: benchOf.get(m.id)!.size, ...(open.has(m.id) ? { open: open.get(m.id) } : {}) }))
    .sort((a, b) => b.results - a.results);
  const models = [...ranked, ...extra];
  const used = new Set(models.map((m) => m.labId));
  const benchmarks: CatBench[] = snap.benchmarks.filter((b) => counts.has(b.id)).map((b) => {
    const access = accessOf(b.id);
    return { id: b.id, name: b.name, category: b.category, publisher: publisherOf(b), models: counts.get(b.id)!.size, ...(b.community ? { community: true } : {}), ...(access ? { access } : {}),
      ...(costed.has(b.id) ? { cost: true } : {}), ...(b.lastUpdated ? { updated: b.lastUpdated } : {}) };
  }).sort((a, b) => b.models - a.models);
  const listed = new Set(models.map((m) => m.id));
  const others = snap.models.filter((m) => m.kind === "llm" && !listed.has(m.id) && benchOf.has(m.id)).map((m) => [m.id, m.name, m.labId] as [string, string, string]);
  const labIds = new Set([...used, ...others.map((o) => o[2])]);
  return { asOf: snap.date, indexSize: idx.length, labs: snap.labs.filter((l) => labIds.has(l.id)).map((l) => ({ id: l.id, name: l.name, color: l.color })), models, benchmarks, others };
});

/** One benchmark's results for the catalog's models: [model index, best value, its level, cost per task]. */
export type ScoreCell = [number, number, string, number?];
export interface ScoreBench { id: string; name: string; category: string; unit: string; higher: boolean; publisher: string; community?: boolean; access?: "public" | "closed"; description: string; cells: ScoreCell[] }

/** Best result per catalog model on every benchmark that at least three of them have: the data for Build your index and Compare. */
export const scoreTable = (): ScoreBench[] => cached("scores", () => {
  const snap = snapshot();
  const slot = new Map(catalog().models.map((m, i) => [m.id, i]));
  const variants = new Map(snap.variants.map((v) => [v.id, v]));
  const byBench = new Map<string, Map<number, ScoreCell>>();
  const bench = new Map(snap.benchmarks.map((b) => [b.id, b]));
  for (const o of snap.observations) {
    const v = variants.get(o.variantId), b = bench.get(o.benchmarkId);
    const i = v && slot.get(v.modelId);
    if (i == null || !b || !Number.isFinite(o.value) || !(rankable(b) || b.category === "composite")) continue;
    const cells = byBench.get(b.id) ?? byBench.set(b.id, new Map()).get(b.id)!;
    const cur = cells.get(i);
    if (cur && (b.higherIsBetter ? cur[1] >= o.value : cur[1] <= o.value)) continue;
    cells.set(i, [i, +o.value.toPrecision(5), v!.effort, ...(o.costUsd != null ? [+o.costUsd.toPrecision(4)] : [])] as ScoreCell);
  }
  return [...byBench.entries()].filter(([, c]) => c.size >= 3).map(([id, c]) => {
    const b = bench.get(id)!, access = accessOf(id);
    return { id, name: b.name, category: b.category, unit: b.unit, higher: b.higherIsBetter, publisher: publisherOf(b), ...(b.community ? { community: true } : {}), ...(access ? { access } : {}), description: b.description, cells: [...c.values()] };
  }).sort((a, b) => b.cells.length - a.cells.length);
});
