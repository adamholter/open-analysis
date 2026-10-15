"use client";
import { useMemo, useState, type ReactNode } from "react";
import type { Lab } from "@/data/types";
import type { RankedVariant } from "@/engine";
import type { MetricPoint } from "@/lib/metrics";
import { MetricBars } from "@/components/chart/MetricBars";
import { Rankings } from "@/components/Rankings";
import { ScoreScatter, useScatterView } from "@/components/chart/ScoreScatter";
import { ParetoChart } from "@/components/chart/ParetoChart";
import { ChartSettings } from "@/components/chart/ChartSettings";

import { anchorOf } from "@/lib/metrics";
import { CHARTS } from "@/lib/charts";

/** Per model, the highest-index point that has this metric (Priors' pickPoints). */
function bestPoints(pts: MetricPoint[], lowerIsBetter = false): MetricPoint[] {
  const best = new Map<string, MetricPoint>();
  for (const p of pts) { const cur = best.get(p.r.model.id); if (!cur || (lowerIsBetter ? p.r.score < cur.r.score : p.r.score > cur.r.score)) best.set(p.r.model.id, p); }
  return [...best.values()];
}

/** Bars show every model (AA style); the settings picker can hide some. */
function useAllBars(pts: MetricPoint[]) {
  const [hidden, setHidden] = useState<string[]>([]);
  const models = useMemo(() => {
    const best = new Map<string, MetricPoint>();
    for (const p of pts) { const cur = best.get(p.r.model.id); if (!cur || p.r.score > cur.r.score) best.set(p.r.model.id, p); }
    return [...best.values()].sort((a, b) => b.r.score - a.r.score).map((p) => ({ id: p.r.model.id, name: p.r.model.name }));
  }, [pts]);
  const points = useMemo(() => (hidden.length ? pts.filter((p) => !hidden.includes(p.r.model.id)) : pts), [pts, hidden]);
  const picker = {
    models, excluded: new Set(hidden),
    onToggleModel: (id: string) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id])),
    onShowAllModels: () => setHidden([]),
    onHideAllModels: () => setHidden(models.map((m) => m.id)),
  };
  return { points, picker };
}

function Heading({ title, desc }: { title: string; desc?: ReactNode }) {
  return <div><h2 className="text-[22px]">{title}</h2>{desc && <p className="cap mt-1">{desc}</p>}</div>;
}

const KindToggle = ({ bars, onChange, label }: { bars: boolean; onChange: (k: "bars" | "scatter") => void; label: string }) => (
  <div className="seg" role="group" aria-label={`${label} chart type`}>
    <button type="button" aria-pressed={!bars} title="Score vs metric" onClick={() => onChange("scatter")}><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="4" cy="11" r="1.6" /><circle cx="8" cy="6" r="1.6" /><circle cx="12.5" cy="4" r="1.6" /><circle cx="10" cy="10" r="1.6" /></svg></button>
    <button type="button" aria-pressed={bars} title="Bar chart" onClick={() => onChange("bars")}><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="2" y="3" width="3" height="11" /><rect x="6.5" y="6" width="3" height="8" /><rect x="11" y="9" width="3" height="5" /></svg></button>
  </div>
);

/** Index ranking with Priors' leaderboard (columns under the Analysis theme), best effort per model by default. */
export function IndexBars({ title, desc, best, all, labs, limit = 30 }: { title: string; desc?: ReactNode; best: RankedVariant[]; all: RankedVariant[]; labs: Lab[]; height?: number; limit?: number }) {
  const [mode, setMode] = useState<"all" | "best">("best");
  const [view, setView] = useScatterView(`index-${anchorOf(title)}`, "bars");
  const rows = mode === "best" ? best : all;
  const vis = useAllBars(useMemo(() => rows.map((r) => ({ x: r.score, r })), [rows]));
  return <Rankings ranked={vis.points.map((p) => p.r)} labs={labs} limit={limit} showEffort={mode === "all"} anchor={anchorOf(title)} title={<Heading title={title} desc={desc} />}
    actions={<ChartSettings label={title} anchor={anchorOf(title)} mode={mode} onChange={setMode} view={view} onView={setView} {...vis.picker} />} />;
}

/** Index vs cost per task: Priors' Pareto chart (frontier + attractive quadrant), switchable to bars. */
export function CostChart({ title, desc, all, labs }: { title: string; desc?: ReactNode; all: RankedVariant[]; labs: Lab[] }) {
  const [mode, setMode] = useState<"all" | "best">("best");
  const [view, setView] = useScatterView("cost", "scatter");
  return <ParetoChart ranked={all} mode={mode} labs={labs} view={view} onView={setView} anchor="cost" title={<h2 className="text-[22px]">{title}</h2>} description={desc as string}
    actions={(picker) => <ChartSettings label={title} anchor="cost" mode={mode} onChange={setMode} view={view} onView={setView} defaultScale="log" {...(picker ?? {})} />} />;
}

/** One metric (speed, latency, tokens, time per task, uptime…) as score-vs-metric scatter or bars. */
export function MetricCard({ chart, title, desc, pts: allPts, labs, height = 420 }: { chart: keyof typeof CHARTS | string; title: string; desc?: ReactNode; pts: MetricPoint[]; labs: Lab[]; height?: number }) {
  const def = CHARTS[chart];
  const anchor = anchorOf(title);
  const [mode, setMode] = useState<"all" | "best">(def.defaultKind === "bars" ? "best" : "all");
  const [view, setView] = useScatterView(`metric-${chart}`, def.defaultKind, def.scale !== "time");
  const bars = view.kind === "bars" && def.scale !== "time";
  const pts = useMemo(() => (mode === "best" ? bestPoints(allPts) : allPts), [mode, allPts]);
  const vis = useAllBars(pts);
  const actions = <>{def.scale !== "time" && <KindToggle bars={bars} onChange={(kind) => setView({ ...view, kind })} label={title} />}
    <ChartSettings label={title} anchor={anchor} mode={mode} onChange={setMode} view={view} onView={setView} defaultScale={def.scale === "log" ? "log" : undefined} {...(bars ? vis.picker : {})} /></>;
  if (bars) return <MetricBars pts={vis.points} labs={labs} better={def.better} xName={def.barName ?? def.xName} formatValue={def.formatX} height={height} aria={def.aria.replace("Index score versus", "By model:")} title={<Heading title={title} desc={desc} />} actions={actions} anchor={anchor} exportName={title} labelScale={view.labelScale} />;
  return <ScoreScatter pts={pts} labs={labs} better={def.better} xName={def.xName} xShort={def.xShort} xUnit={def.xUnit} scale={def.scale} formatX={def.formatX} formatValue={def.formatValue} height={height} aria={def.aria} title={<Heading title={title} desc={desc} />} actions={actions} view={view} anchor={anchor} exportName={title} />;
}

/** A single benchmark's leaderboard as Analysis columns, best result per model first. */
export function BenchmarkBars({ title, desc, higherIsBetter, pts: allPts, labs, limit = 24, anchor }: { title: string; desc?: ReactNode; unit: string; higherIsBetter: boolean; pts: MetricPoint[]; labs: Lab[]; height?: number; limit?: number; anchor?: string }) {
  const [mode, setMode] = useState<"all" | "best">("best");
  const [view, setView] = useScatterView(`bench-${anchor ?? anchorOf(title)}`, "bars");
  const sorted = useMemo(() => (mode === "best" ? bestPoints(allPts, !higherIsBetter) : allPts).slice().sort((a, b) => (higherIsBetter ? b.x - a.x : a.x - b.x)), [mode, allPts, higherIsBetter]);
  const vis = useAllBars(sorted);
  const rows = useMemo(() => vis.points.map((p, i) => ({ ...p.r, rank: i + 1 })), [vis.points]);
  return <Rankings ranked={rows} labs={labs} limit={limit} showEffort={mode === "all"} anchor={anchor ?? anchorOf(title)} title={<Heading title={title} desc={desc} />}
    actions={<ChartSettings label={title} anchor={anchor ?? anchorOf(title)} mode={mode} onChange={setMode} view={view} onView={setView} {...vis.picker} />} />;
}
