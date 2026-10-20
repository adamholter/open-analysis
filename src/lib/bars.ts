/** Server-side: ranked rows and benchmark results as plain bar rows for the client charts. */
import type { RankedVariant } from "@/engine";
import type { Bar } from "@/components/oa/Bars";
import type { Point } from "@/components/oa/Scatter";
import type { MetricPoint } from "@/lib/metrics";
import { OPEN_INDEX } from "@/lib/data";
import { benchmarkCharts, capabilityIndexes, metricViews, openIndexView, publisherOf, accessOf, scoreTable, catalog, type IndexView } from "@/lib/views";
import { snapshot } from "@/lib/data";
import { categoryDescription } from "@/lib/categories";

const usd = (v: number) => `$${v < 0.01 ? v.toPrecision(2) : v.toFixed(v < 0.1 ? 3 : 2)}`;
const base = (r: RankedVariant) => ({ key: r.variant.id, modelId: r.model.id, name: r.model.name, labId: r.model.labId, effort: r.variant.effort, ...(r.model.releaseDate ? { releaseDate: r.model.releaseDate } : {}) });

/** Index rows as bars; the tooltip says how many index benchmarks back the score. */
export function indexBars(view: IndexView): Bar[] {
  const n = view.benchmarks.length;
  return view.all.map((r) => {
    const m = Math.round(r.measuredShare * n);
    return { ...base(r), value: +r.score.toFixed(2), tip: [`Results on ${m} of ${n} index benchmarks`, ...(r.costUsd != null ? [`Cost per task ${usd(r.costUsd)}`] : [])] };
  });
}

const metricBar = (p: MetricPoint, tip?: string[]): Bar => ({ ...base(p.r), value: +(p.raw ?? p.x).toPrecision(5), pick: p.r.score, ...(tip ? { tip } : {}) });

export interface CapabilityData { id: string; name: string; description: string; bars: Bar[]; benchmarks: { id: string; name: string; share: number; publisher: string; description: string; access?: "public" | "closed" }[] }

/** Everything the home page draws, as plain data. */
export function homeData() {
  const snap = snapshot();
  const bench = new Map(snap.benchmarks.map((b) => [b.id, b]));
  const index = openIndexView();
  const metrics = metricViews();
  const latency = metrics.panels.find((p) => p.id === "latency");
  const caps: CapabilityData[] = capabilityIndexes().map((v) => {
    const cat = v.id.replace(/^cap-/, "");
    return { id: v.id, name: v.name.replace(/ Index$/, ""), description: categoryDescription(cat), bars: indexBars(v),
      benchmarks: v.benchmarks.map((b) => { const x = bench.get(b.id)!; const access = accessOf(b.id); return { id: b.id, name: b.name, share: b.share, publisher: publisherOf(x), description: x.description, ...(access ? { access } : {}) }; }) };
  });
  const costPoints: Point[] = index.all.filter((r) => r.costUsd != null && r.costUsd > 0).map((r) => ({ ...base(r), x: +r.costUsd!.toPrecision(4), y: +r.score.toFixed(2) }));
  return {
    index: {
      bars: indexBars(index), size: index.benchmarks.length,
      benchmarks: index.benchmarks.map((b) => ({ id: b.id, name: b.name })),
    },
    caps,
    cost: { bars: index.all.filter((r) => r.costUsd != null && r.costUsd > 0).map((r) => ({ ...base(r), value: +r.costUsd!.toPrecision(4), pick: r.score, tip: [`Open Index ${r.score.toFixed(1)}`] })), points: costPoints },
    speed: metrics.speed.map((p) => metricBar(p, [`Open Index ${p.r.score.toFixed(1)}`])),
    latency: (latency?.points ?? []).map((p) => metricBar(p, [`Open Index ${p.r.score.toFixed(1)}`])),
    benchmarks: benchmarkCharts(),
    scores: scoreTable(),
    weights: OPEN_INDEX.benchmarks.map((b) => b.id),
    catalogSize: catalog().models.length,
  };
}
export type HomeData = ReturnType<typeof homeData>;

/** Every result on one benchmark as bars (all levels), plus cost bars where runs report a cost. */
export function benchmarkBars(id: string): { score: Bar[]; cost: Bar[] } {
  const snap = snapshot();
  const models = new Map(snap.models.map((m) => [m.id, m]));
  const variants = new Map(snap.variants.map((v) => [v.id, v]));
  const score: Bar[] = [], cost: Bar[] = [];
  for (const o of snap.observations) {
    if (o.benchmarkId !== id || !Number.isFinite(o.value)) continue;
    const v = variants.get(o.variantId), m = v && models.get(v.modelId);
    if (!v || !m) continue;
    const b = { key: `${v.id}#${score.length}`, modelId: m.id, name: m.name, labId: m.labId, effort: v.effort, ...(m.releaseDate ? { releaseDate: m.releaseDate } : {}) };
    score.push({ ...b, value: +o.value.toPrecision(5), ...(o.costUsd != null ? { tip: [`Cost per task ${usd(o.costUsd)}`] } : {}) });
    if (o.costUsd != null && o.costUsd > 0) cost.push({ ...b, value: +o.costUsd.toPrecision(4), tip: [`Score ${+o.value.toPrecision(4)}`] });
  }
  return { score, cost };
}

/** Capability axes and each model's best score on them. */
export function capabilityScores() {
  const caps = capabilityIndexes();
  const axes = caps.map((c) => ({ id: c.id, name: c.name.replace(/ Index$/, "") }));
  const byModel: Record<string, Record<string, number>> = {};
  const ranks: Record<string, Record<string, [number, number]>> = {};
  for (const c of caps) {
    c.best.forEach((r, i) => {
      (byModel[r.model.id] ??= {})[c.id] = +r.score.toFixed(1);
      (ranks[r.model.id] ??= {})[c.id] = [i + 1, c.best.length];
    });
  }
  return { axes, byModel, ranks };
}

export interface ModelRow { id: string; name: string; labId: string; releaseDate?: string; efforts: string[]; score?: number; effort?: string; measured: number; results: number; cost?: number; speed?: number; open?: boolean;
  /** The capability where the model ranks highest among all models. */ best?: { name: string; rank: number; of: number }; caps: Record<string, number> }

/** The Models table: every model the picker offers, with its index score, best capability, cost and speed. */
export function modelsTable(): { rows: ModelRow[]; axes: { id: string; name: string }[]; indexSize: number } {
  const cat = catalog();
  const { axes, byModel, ranks } = capabilityScores();
  const name = new Map(axes.map((a) => [a.id, a.name]));
  return {
    indexSize: cat.indexSize, axes,
    rows: cat.models.map((m) => {
      const caps = byModel[m.id] ?? {};
      const top = Object.entries(ranks[m.id] ?? {}).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1] || a[1][0] - b[1][0])[0];
      return { ...m, caps, ...(top ? { best: { name: name.get(top[0])!, rank: top[1][0], of: top[1][1] } } : {}) };
    }),
  };
}

const memoRanks: { v?: Map<string, Map<string, [number, number]>> } = {};
/** Each model's place on each benchmark (best result per model): [rank, models ranked]. One pass for every model page. */
export function benchmarkRanks() {
  if (memoRanks.v) return memoRanks.v;
  const snap = snapshot();
  const bench = new Map(snap.benchmarks.map((b) => [b.id, b]));
  const variants = new Map(snap.variants.map((v) => [v.id, v.modelId]));
  const best = new Map<string, Map<string, number>>();
  for (const o of snap.observations) {
    const m = variants.get(o.variantId), b = bench.get(o.benchmarkId);
    if (!m || !b || !Number.isFinite(o.value)) continue;
    const per = best.get(b.id) ?? best.set(b.id, new Map()).get(b.id)!;
    const cur = per.get(m);
    if (cur == null || (b.higherIsBetter ? o.value > cur : o.value < cur)) per.set(m, o.value);
  }
  const out = new Map<string, Map<string, [number, number]>>();
  for (const [id, per] of best) {
    const hi = bench.get(id)!.higherIsBetter;
    const sorted = [...per.entries()].sort((a, b) => (hi ? b[1] - a[1] : a[1] - b[1]));
    out.set(id, new Map(sorted.map(([m], i) => [m, [i + 1, sorted.length]])));
  }
  return (memoRanks.v = out);
}
