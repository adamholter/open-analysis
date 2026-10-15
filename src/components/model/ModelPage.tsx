"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import type { Benchmark, Snapshot } from "@/data/types";
import { computeIndex, type IndexConfig, type RankedVariant } from "@/engine";
import { CONTAIN_AXIS_LABELS, insideLabels, markColor, useChartPalette, useEChart } from "../chart/echarts";
import { BenchmarkInfo, InfoIcon } from "../BenchmarkInfo";
import { ModelStrengths } from "./ModelStrengths";
import { FieldStrip, type StripPoint } from "./FieldStrip";
import { ModelCostSpeed } from "./ModelCostSpeed";
import { escapeSvg as esc } from "../chart/export-frame";

type Row = { variantId: string; modelId: string; effort: string; value: number; cost?: number; rank: number };

function fmt(b: Benchmark, v: number) {
  if (b.unit === "percent") return `${v.toFixed(1)}%`;
  if (b.unit === "usd") return `$${v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2)}`;
  if (b.unit === "seconds") return `${v.toFixed(v >= 10 ? 0 : 1)}s`;
  return v.toFixed(b.unit === "elo" ? 0 : 1);
}

/**
 * Everything below the hero on a model page, in the Analysis theme: efforts, strengths radar, cost and speed
 * against the field, then this model on every benchmark. The Open Index is the fixed lens (Priors lets visitors pick their own).
 */
export function ModelPage({ snapshot, modelId, mix }: { snapshot: Snapshot; modelId: string; mix: IndexConfig }) {
  const model = snapshot.models.find((m) => m.id === modelId)!;
  const lab = snapshot.labs.find((l) => l.id === model.labId);
  const names = useMemo(() => new Map(snapshot.models.map((m) => [m.id, m.name])), [snapshot]);
  const pal = useChartPalette();
  const labC = markColor(lab?.color ?? "#2F4FB0", pal, lab?.id);
  const color = useMemo(() => ({ lab: labC, name: (id: string) => names.get(id) ?? id }), [labC, names]);
  const result = useMemo(() => computeIndex(snapshot, { ...mix, variants: "all" }), [snapshot, mix]);
  // Cost per task is measured per variant; the full-pool "all time" index supplies it for every variant.
  const costs = useMemo(() => { const r = computeIndex(snapshot, { ...mix, variants: "all", releasedAfter: "", strictness: 0 }); const m = new Map<string, number>(); for (const x of r.ranked) if (x.costUsd) { m.set(x.variant.id, x.costUsd); const base = x.variant.id.split("~")[0]; if (!m.has(base)) m.set(base, x.costUsd); } return m; }, [snapshot, mix]);
  // Not enough measured data at the mix's strictness: fall back to estimates rather than showing nothing.
  const strictMine = result.ranked.filter((r) => r.model.id === modelId);
  const loose = useMemo(() => strictMine.length ? null : computeIndex(snapshot, { ...mix, variants: "all", strictness: 0 }), [snapshot, mix, strictMine.length]);
  const shown = loose ?? result;
  const mine = shown.ranked.filter((r) => r.model.id === modelId);
  const variants = new Map(snapshot.variants.map((v) => [v.id, v]));
  const perBench = useMemo(() => {
    const out = new Map<string, Row[]>();
    for (const o of snapshot.observations) {
      const base = o.variantId.split("~")[0], v = variants.get(o.variantId) ?? variants.get(base);
      const list = out.get(o.benchmarkId) ?? out.set(o.benchmarkId, []).get(o.benchmarkId)!;
      const prev = list.find((r) => r.variantId === base);
      if (prev) { if (o.value > prev.value) prev.value = o.value; continue; }
      list.push({ variantId: base, modelId: v?.modelId ?? base.split("@")[0], effort: v?.effort ?? "default", value: o.value, cost: costs.get(base), rank: 0 });
    }
    for (const [id, list] of out) { const b = snapshot.benchmarks.find((x) => x.id === id); list.sort((a, c) => b?.higherIsBetter === false ? a.value - c.value : c.value - a.value).forEach((r, i) => { r.rank = i + 1; }); }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, costs]);
  const measured = snapshot.benchmarks.filter((b) => perBench.get(b.id)?.some((r) => r.modelId === modelId) && !b.proxy);
  const inMix = measured.filter((b) => (mix.weights[b.id] ?? 0) > 0);
  const others = measured.filter((b) => !((mix.weights[b.id] ?? 0) > 0)).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  const [info, setInfo] = useState<string | null>(null);
  return (
    <div className="oa-model grid gap-10">
      {mine.length > 1 && <div className="chart-panel">
        <h2>Reasoning efforts</h2>
        <p className="cap mt-1 mb-4">Open Index score for each effort this model was run at{loose ? " (includes estimates)" : ""}.</p>
        <div className="grid gap-[6px]">{mine.map((r) => <EffortRow key={r.variant.id} r={r} rank={shown.ranked.indexOf(r) + 1} total={shown.ranked.length} max={mine[0].score} color={labC} />)}</div>
      </div>}

      {mine.length > 0 && <div className="chart-panel"><ModelStrengths snapshot={snapshot} mix={mix} result={shown} modelId={modelId} onInfo={setInfo} /></div>}

      {mine.length > 0 && <div className="chart-panel"><ModelCostSpeed snapshot={snapshot} ranked={shown.ranked} modelId={modelId} name={model.name} color={labC} timeSource={mix.timeSource} /></div>}

      <section className="oa-section">
        <h2>Open Index benchmarks</h2>
        <p className="lede">{model.name} on the {inMix.length} of {Object.values(mix.weights).filter((w) => w > 0).length} benchmarks in the Open Index it has results for. The highlighted marks are this model; grey are everyone else.</p>
        {inMix.length ? <div className="oa-grid2">{inMix.map((b) => <BenchCard key={b.id} b={b} rows={perBench.get(b.id)!} modelId={modelId} color={color} onInfo={() => setInfo(b.id)} />)}</div>
          : <p className="cap">This model has no results on the Open Index benchmarks.</p>}
      </section>

      {others.length > 0 && <section className="oa-section">
        <details className="group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-baseline justify-between"><h2>All {measured.length} benchmarks</h2><span className="cap group-open:hidden">show {others.length} more</span><span className="cap hidden group-open:inline">hide</span></summary>
          <LazyCards list={others} perBench={perBench} modelId={modelId} color={color} onInfo={setInfo} />
        </details>
      </section>}
      <BenchmarkInfo snapshot={snapshot} benchmarkId={info} onClose={() => setInfo(null)} />
    </div>
  );
}

function EffortRow({ r, rank, total, max, color }: { r: RankedVariant; rank: number; total: number; max: number; color?: string }) {
  return <div className="grid grid-cols-[64px_minmax(0,1fr)_56px_90px] items-center gap-3 h-[26px] text-[12.5px]">
    <span className="mono">{r.variant.effort}</span>
    <span className="h-[9px] bg-hair-2 rounded-[2px] overflow-hidden"><i className="block h-full rounded-[2px]" style={{ width: `${Math.max(3, r.score / Math.max(1, max) * 100)}%`, background: color }} /></span>
    <span className="num text-right">{r.score.toFixed(1)}</span>
    <span className="cap text-right">#{rank} of {total}</span>
  </div>;
}

function LazyCards({ list, perBench, modelId, color, onInfo }: { list: Benchmark[]; perBench: Map<string, Row[]>; modelId: string; color: { lab: string; name: (id: string) => string }; onInfo: (id: string) => void }) {
  return <div className="oa-grid2 mt-5">{list.map((b) => <BenchCard key={b.id} b={b} rows={perBench.get(b.id)!} modelId={modelId} color={color} onInfo={() => onInfo(b.id)} />)}</div>;
}

/** One benchmark: this model's efforts highlighted on score-vs-cost (others ghosted), or on the field's spread when cost is unknown, plus placements. */
function BenchCard({ b, rows, modelId, color, onInfo }: { b: Benchmark; rows: Row[]; modelId: string; color: { lab: string; name: (id: string) => string }; onInfo: () => void }) {
  const mine = rows.filter((r) => r.modelId === modelId);
  const withCost = rows.filter((r) => r.cost && r.cost > 0);
  return (
    <article className="chart-panel oa-small grid gap-3 content-start">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="cap">{b.category}</p><h3 className="text-[19px] leading-tight flex items-center gap-1.5">{b.name}<InfoIcon name={b.name} onClick={onInfo} /></h3></div><span className="cap shrink-0 pt-4">{rows.length} results</span></div>
      {withCost.length >= 3 && mine.some((r) => r.cost) ? <BenchScatter b={b} rows={withCost} modelId={modelId} color={color} />
        : rows.length >= 3 && <BenchStrip b={b} rows={rows} modelId={modelId} color={color} />}
      <ol className="grid gap-[4px]">
        {mine.map((r) => <li key={r.variantId} className="grid grid-cols-[52px_minmax(0,1fr)_70px] items-center gap-3 text-[12.5px] h-[24px]">
          <span className="num text-[15px]" style={{ color: "var(--indigo)" }}>#{r.rank}</span>
          <span className="truncate">{r.effort === "default" ? "default" : r.effort} <span className="cap">of {rows.length}</span></span>
          <span className="num text-right">{fmt(b, r.value)}</span>
        </li>)}
      </ol>
      <p className="cap">Leader: {rows[0]?.modelId === modelId ? "this model" : color.name(rows[0]?.modelId ?? "")} · {rows[0] ? fmt(b, rows[0].value) : ""}</p>
    </article>
  );
}

function BenchScatter({ b, rows, modelId, color }: { b: Benchmark; rows: Row[]; modelId: string; color: { lab: string; name: (id: string) => string } }) {
  const pal = useChartPalette();
  const [plotW, setPlotW] = useState(0);
  const option = useMemo<EChartsOption>(() => {
    const mine = rows.filter((r) => r.modelId === modelId).sort((a, c) => a.cost! - c.cost!), rest = rows.filter((r) => r.modelId !== modelId);
    const labColor = color.lab;
    return {
      grid: { left: 44, right: 70, top: 14, bottom: 34, ...CONTAIN_AXIS_LABELS },
      xAxis: { type: "log", name: "$ / task", nameLocation: "end", nameGap: 6, nameTextStyle: { color: pal.grey, fontSize: 10, align: "right", verticalAlign: "top", padding: [22, 0, 0, 0] }, axisLabel: { formatter: (v: number) => `$${v >= 1 ? Math.round(v) : v.toFixed(2)}`, hideOverlap: true, showMinLabel: false, showMaxLabel: false }, min: (e: { min: number }) => e.min / 1.5, max: (e: { max: number }) => e.max * 1.5 },
      yAxis: { type: "value", scale: true, axisLabel: { formatter: (v: number) => b.unit === "percent" ? `${v}%` : `${v}` } },
      tooltip: { trigger: "item", confine: true, formatter: (p: unknown) => { const d = (p as { data?: { r?: Row } }).data?.r; return d ? `<b>${esc(color.name(d.modelId))} ${esc(d.effort)}</b><br/><span style="font-family:var(--font-jetbrains)">${fmt(b, d.value)} · $${d.cost!.toFixed(2)}/task · #${d.rank}</span>` : ""; } },
      series: [
        { type: "scatter", id: "ghost", symbolSize: 7, data: rest.map((r) => ({ value: [r.cost, r.value], r })), itemStyle: { color: pal.dark ? "#8C8B83" : "#A3A39B", opacity: pal.dark ? 0.32 : 0.28 }, emphasis: { itemStyle: { opacity: 0.9 } }, z: 1 },
        { type: "line", id: "mine-line", data: mine.map((r) => [r.cost, r.value]), showSymbol: false, lineStyle: { color: labColor, width: 1.2, opacity: 0.6 }, silent: true, z: 2 },
        { type: "scatter", id: "mine", symbolSize: 11, data: mine.map((r) => ({ value: [r.cost, r.value], r, name: r.effort })), itemStyle: { color: labColor, borderColor: pal.ink, borderWidth: 1.2 }, label: { show: true, position: "right", formatter: "{b}", fontSize: 11, color: pal.ink, distance: 6, textBorderColor: pal.bg, textBorderWidth: 3 }, labelLayout: insideLabels(() => plotW || undefined), z: 3 },
      ],
    };
  }, [b, rows, modelId, color, pal, plotW]);
  const { ref } = useEChart(option, [option]);
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(([e]) => setPlotW(Math.round(e.contentRect.width / 4) * 4)); ro.observe(el); return () => ro.disconnect(); }, [ref]);
  return <div ref={ref} role="img" aria-label={`${b.name} score versus cost per task`} style={{ width: "100%", height: 230 }} />;
}

/** Every result on the benchmark spread along its score (best to the right); this model, the leader and the median marked. */
function BenchStrip({ b, rows, modelId, color }: { b: Benchmark; rows: Row[]; modelId: string; color: { lab: string; name: (id: string) => string } }) {
  const { field, mine, lead } = useMemo(() => {
    const point = (r: Row): StripPoint => ({ key: r.variantId, value: r.value, label: r.effort === "default" ? "" : r.effort, tip: `<b>${esc(color.name(r.modelId))} ${esc(r.effort)}</b><br/><span style="font-family:var(--font-jetbrains)">${fmt(b, r.value)} · #${r.rank} of ${rows.length}</span>` });
    const top = rows[0];
    return { field: rows.filter((r) => r.modelId !== modelId).map(point), mine: rows.filter((r) => r.modelId === modelId).map(point), lead: top && top.modelId !== modelId ? { ...point(top), label: color.name(top.modelId) } : undefined };
  }, [b, rows, modelId, color]);
  const format = useCallback((v: number) => fmt(b, v).replace(/\.0(?=%|$)/, ""), [b]);
  return <FieldStrip field={field} mine={mine} lead={lead} color={color.lab} fmt={format} inverse={b.higherIsBetter === false} aria={`${b.name}: where this model sits among ${rows.length} results`} />;
}
