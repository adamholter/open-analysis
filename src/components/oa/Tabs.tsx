"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Lab } from "@/data/types";
import type { Effort } from "@/data/types";
import type { MetricPoint } from "@/lib/metrics";
import type { IndexView, BenchmarkChart, ChartModel } from "@/lib/views";
import { BenchmarkBars, IndexBars, useScope } from "./Charts";
import { categoryLabel } from "@/lib/categories";

const pct = (s: number) => `${Math.round(s)}%`;

/** AA's capability-index tabs: one chip per category index, one chart. */
export function CapabilityTabs({ indexes, labs }: { indexes: IndexView[]; labs: Lab[] }) {
  const [active, setActive] = useState(indexes[0]?.id);
  const idx = indexes.find((i) => i.id === active) ?? indexes[0];
  if (!idx) return null;
  return (
    <div>
      <div className="oa-chips mb-6" role="tablist">
        {indexes.map((i) => <button key={i.id} type="button" role="tab" aria-selected={i.id === idx.id} onClick={() => setActive(i.id)}>{i.name.replace(/ Index$/, "")}</button>)}
      </div>
      <div className="chart-panel">
        <IndexBars key={idx.id} title={`Open ${idx.name}`} all={idx.all} labs={labs} height={400}
          desc={<>Incorporates {idx.benchmarks.length} evaluations: {idx.benchmarks.map((b, n) => <span key={b.id}>{n ? ", " : ""}<Link href={`/benchmarks/${b.id}`}>{b.name}</Link> ({pct(b.share)})</span>)} · Higher is better</>} />
      </div>
    </div>
  );
}

/** AA's "Intelligence Evaluations" grid: category chips filter a two-column grid of benchmark bars. */
function decode(models: ChartModel[], points: BenchmarkChart["points"]): MetricPoint[] {
  return points.map(([i, effort, value]) => {
    const m = models[i];
    return { x: value, r: { rank: 0, score: value, coverage: 1, measuredShare: 1, onFrontier: false, values: [],
      model: { ...m, kind: "llm" as const, reasoning: effort !== "default", aliases: [] },
      variant: { id: `${m.id}@${effort}`, modelId: m.id, effort: effort as Effort } } };
  });
}

function BenchmarkCard({ c, pts, count, labs }: { c: BenchmarkChart; pts: MetricPoint[]; count: number; labs: Lab[] }) {
  return (
    <div className="chart-panel oa-small">
      <BenchmarkBars anchor={`b-${c.id}`} title={c.name} unit={c.unit} higherIsBetter={c.higherIsBetter} pts={pts} labs={labs} height={300} limit={20} more={{ href: `/benchmarks/${c.id}`, label: `all ${c.models} results` }}
        desc={<><Link href={`/benchmarks/${c.id}`}>{c.publisher}</Link>{c.community && <span className="oa-badge">community</span>} · {categoryLabel(c.category)} · {count} recent models{c.updated ? ` · updated ${c.updated}` : ""}</>} />
    </div>
  );
}

export function BenchmarkGrid({ charts, models, labs, initial = 12 }: { charts: BenchmarkChart[]; models: ChartModel[]; labs: Lab[]; initial?: number }) {
  const [cat, setCat] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const { f, points } = useScope();
  // Boards with no result inside the page filters (e.g. a retired eval with nothing from the last 3 months) have nothing to draw: leave them out.
  const live = useMemo(() => charts.flatMap((c) => {
    const pts = decode(models, c.points), kept = points(pts), count = new Set(kept.map((p) => p.r.model.id)).size;
    return count ? [{ c, pts, count }] : [];
  }), [charts, models, points]);
  const cats = [...new Set(live.map((x) => x.c.category))].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  const shown = live.filter((x) => !cat || x.c.category === cat);
  const visible = more ? shown : shown.slice(0, initial);
  return (
    <div>
      <div className="oa-chips mb-6">
        <button type="button" aria-pressed={!cat} onClick={() => setCat(null)}>All ({live.length})</button>
        {cats.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{categoryLabel(c)}</button>)}
      </div>
      {!live.length && <p className="cap py-6">No benchmark has results under the page filters.{f && !f.isDefault && <> <button type="button" className="underline" onClick={f.reset}>Reset filters</button></>}</p>}
      <div className="oa-grid2">
        {visible.map((x) => <BenchmarkCard key={x.c.id} {...x} labs={labs} />)}
      </div>
      {shown.length > initial && <p className="mt-6 text-center"><button type="button" className="btn-quiet" onClick={() => setMore(!more)}>{more ? "Show fewer" : `Show all ${shown.length} benchmarks`}</button></p>}
    </div>
  );
}
