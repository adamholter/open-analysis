import type { EChartsOption } from "echarts";
import type { Lab } from "../../data/types";
import { CONTAIN_AXIS_LABELS, dimColor, insideLabelOn, markColor, markSize, textSize, type ChartPalette } from "./theme";
import { chartLabel } from "../../lib/metrics";
import { featuredPoints, highlightedModels, type ScatterPoint } from "./scatter-option";

import { labelScale as normalizeLabelScale } from "./label-size";

const value = (p: ScatterPoint) => p.raw ?? p.x;
/** Tooltips render as HTML; model names come from scraped and community data. */
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export type BarLayoutLabel = { modelId: string; modelName: string; effort: string; label: string };
const effortLabel = (effort: string) => ({ none: "N", minimal: "Min", low: "L", medium: "M", high: "H", xhigh: "X", max: "Mx", default: "B" }[effort] ?? effort);

/** Axis rows for model groups: efforts stay on the first row, one model name sits under each group. */
export function barLayout<T extends BarLayoutLabel>(bars: T[]): { entries: (T | null)[]; effortLabels: string[]; modelLabels: string[] } {
  const entries: (T | null)[] = [], effortLabels: string[] = [], modelLabels: string[] = [];
  let previousGroupSize = 0;
  for (let start = 0; start < bars.length;) {
    let end = start + 1;
    while (end < bars.length && bars[end].modelId === bars[start].modelId) end++;
    const group = bars.slice(start, end);
    // A gap separates effort clusters. Single-bar models are ordinary adjacent categories.
    if (entries.length && (previousGroupSize > 1 || group.length > 1)) { entries.push(null); effortLabels.push(""); modelLabels.push(""); }
    const center = entries.length + Math.floor((group.length - 1) / 2);
    for (const bar of group) {
      entries.push(bar);
      const repeatedEffort = group.filter((item) => item.effort === bar.effort).length > 1;
      effortLabels.push(group.length === 1 ? "" : repeatedEffort ? bar.label : effortLabel(bar.effort));
      modelLabels.push("");
    }
    modelLabels[center] = group[0].modelName;
    previousGroupSize = group.length;
    start = end;
  }
  return { entries, effortLabels, modelLabels };
}

/** Models with any Pareto-optimal effort, plus the index's top `topCount` distinct models. */
export function defaultBarModels(points: ScatterPoint[], better: "lower" | "higher", ranked: ScatterPoint["r"][] = points.map((p) => p.r), topCount = 3): Set<string> {
  const visible = new Set<string>();
  const ordered = points.filter((p) => Number.isFinite(value(p)) && Number.isFinite(p.r.score))
    .sort((a, b) => (better === "lower" ? value(a) - value(b) : value(b) - value(a)) || b.r.score - a.r.score);
  let bestScore = -Infinity;
  for (let start = 0; start < ordered.length;) {
    let end = start + 1;
    while (end < ordered.length && value(ordered[end]) === value(ordered[start])) end++;
    const group = ordered.slice(start, end), groupBest = Math.max(...group.map((p) => p.r.score));
    if (groupBest > bestScore) for (const p of group) if (p.r.score === groupBest) visible.add(p.r.model.id);
    bestScore = Math.max(bestScore, groupBest);
    start = end;
  }

  const bestByModel = new Map<string, ScatterPoint["r"]>();
  for (const r of ranked) {
    const current = bestByModel.get(r.model.id);
    if (!current || r.score > current.score || (r.score === current.score && r.rank < current.rank)) bestByModel.set(r.model.id, r);
  }
  [...bestByModel.values()]
    .sort((a, b) => b.score - a.score || a.rank - b.rank || a.model.id.localeCompare(b.model.id))
    .slice(0, Math.max(0, topCount))
    .forEach((r) => visible.add(r.model.id));
  return visible;
}

export function filterBarModels(points: ScatterPoint[], visibleModels: Set<string>): ScatterPoint[] {
  return points.filter((p) => visibleModels.has(p.r.model.id));
}

/** Bar labels: round to what a reader compares (189 s, 45.2%, 0.83 s), keeping the metric's unit. */
export const compact = (format: (x: number) => string) => (v: number) => {
  const unit = format(1).replace(/^[$]?[\d.,]+/, ""), dollar = format(1).startsWith("$");
  const n = Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : Math.abs(v) >= 100 ? Math.round(v).toString() : Math.abs(v) >= 10 ? v.toFixed(1) : v.toPrecision(2);
  return `${dollar ? "$" : ""}${n}${unit.replace(/^k(?=\s|$)/, "")}`;
};

/** Keep complete model groups, cap by model score, then draw groups and bars in ascending metric order. */
export function selectBars(pts: ScatterPoint[], _better: "lower" | "higher", modelCap: number, highlight: string[] = []): ScatterPoint[] {
  const featured = featuredPoints(pts, highlight), pinned = new Set(featured.map((p) => p.r.model.id));
  const groups = new Map<string, ScatterPoint[]>();
  for (const p of pts) (groups.get(p.r.model.id) ?? groups.set(p.r.model.id, []).get(p.r.model.id)!).push(p);
  const top = [...groups.entries()].sort(([, a], [, b]) =>
    Math.max(...b.map((p) => p.r.score)) - Math.max(...a.map((p) => p.r.score)) ||
    Math.min(...a.map((p) => p.r.rank)) - Math.min(...b.map((p) => p.r.rank)) ||
    a[0].r.model.id.localeCompare(b[0].r.model.id),
  );
  const keptModels = new Set(pinned);
  for (const [id] of top) {
    if (keptModels.size >= Math.max(0, modelCap) && !keptModels.has(id)) continue;
    keptModels.add(id);
  }
  const kept = [...groups.entries()].filter(([id]) => keptModels.has(id));
  kept.sort(([, a], [, b]) => {
    const maxA = Math.max(...a.map(value)), maxB = Math.max(...b.map(value));
    return maxA - maxB || a[0].r.model.name.localeCompare(b[0].r.model.name) || a[0].r.model.id.localeCompare(b[0].r.model.id);
  });
  return kept.flatMap(([, group]) => [...group].sort((a, b) => value(a) - value(b) || b.r.score - a.r.score || a.r.variant.id.localeCompare(b.r.variant.id)));
}

/** The ECharts option behind MetricBars — shared verbatim by the browser chart and /og rasterizer. */
/**
 * Where bar values fit: inside the bar, above it, or turned vertical when even the category slot
 * is too narrow. JetBrains Mono advances 0.6em per glyph; a lone bar series fills 76% of its slot.
 */
export function barLabelFit(texts: string[], fontSize: number, slots: number, plotWidth: number, maxBar: number): "inside" | "above" | "vertical" {
  const slot = plotWidth / Math.max(1, slots), bar = Math.min(maxBar, slot * 0.76);
  const widest = Math.max(0, ...texts.map((text) => text.length)) * fontSize * 0.6;
  return widest + 4 <= bar ? "inside" : widest <= slot ? "above" : "vertical";
}

/** Keep values horizontal and model names legible, even when the viewport needs to scroll. */
export function barChartMinWidth(slots: number, labels: string[], fontSize: number) {
  const widestValue = Math.max(0, ...labels.map((label) => label.length)) * fontSize * 0.6;
  return Math.ceil(96 + slots * Math.max(52 * fontSize / 11.5, widestValue + 12));
}

/** Round added label headroom so the top axis tick never prints a floating-point tail. */
export function barAxisMax(max: number, headroom = 0.08) {
  if (max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max) - 1);
  return Number((Math.ceil(max * (1 + headroom) / step) * step).toPrecision(12));
}

export function barsOption({ bars, labs, xName, formatValue, pal, highlight, labelScale, width, height = 400 }: {
  bars: ScatterPoint[]; labs: Lab[]; xName: string; formatValue: (x: number) => string; pal: ChartPalette; narrow: boolean; highlight?: string[]; labelScale?: number;
  /** Chart size in px; inside labels need it to know whether they fit. Unknown width means they sit above the bars. */
  width?: number; height?: number;
}): EChartsOption {
  const t = textSize(pal), fontScale = normalizeLabelScale(labelScale) * t;
  const hl = highlightedModels(highlight ?? []), on = hl.size > 0, featured = new Set(featuredPoints(bars, highlight ?? []).map((p) => p.r.variant.id));
  const color = new Map(labs.map((l) => [l.id, l.color]));
  const layout = barLayout(bars.map((p) => ({ modelId: p.r.model.id, modelName: p.r.model.name, effort: p.r.variant.effort, label: chartLabel(p.r), point: p })));
  const grouped = layout.effortLabels.some(Boolean);
  const fmt = compact(formatValue), fontSize = 11.5 * fontScale, maxBar = (bars.length <= 6 ? 144 : 64) * markSize(pal);
  const fit = width === undefined ? "above" : barLabelFit(bars.map((p) => fmt(value(p))), fontSize, layout.entries.length, width - 52 * t - 30, maxBar);
  const inside = pal.style?.barLabels === "inside" && fit === "inside";
  // Bars shorter than their value (y max is at least the top bar, so this errs short) show it above.
  const top = Math.max(...bars.map(value)), plot = height - 52 - (grouped ? 124 : 104) * fontScale, short = (p: ScatterPoint) => top === 0 || (value(p) / top) * plot * 0.9 < fontSize + 14;
  // Dimmed bars are too pale for white text, so their values sit above in grey.
  const above = { position: "top" as const, distance: 5, rotate: 0, align: "center" as const, verticalAlign: "bottom" as const, color: pal.ink, textBorderWidth: 0, opacity: 1 };
  return {
    grid: { left: 64 * t, right: 16, top: 52, bottom: (grouped ? 124 : 104) * fontScale, ...CONTAIN_AXIS_LABELS },
    xAxis: [
      { type: "category", data: layout.effortLabels.map((label, i) => on && layout.entries[i] && featured.has(layout.entries[i]!.point.r.variant.id) ? { value: label, textStyle: { color: pal.ink, fontWeight: 600 } } : label), axisLabel: { show: grouped, rotate: 0, interval: 0, hideOverlap: false, fontSize: 11 * fontScale, color: pal.ink2, fontFamily: pal.fonts?.sans ?? "var(--font-inter), Inter, sans-serif", width: 44 * fontScale, overflow: "truncate" }, axisTick: { show: false }, axisLine: { show: false } },
      { type: "category", data: layout.modelLabels.map((label, i) => { const p = layout.entries[i]?.point, featuredModel = p && bars.some((bar) => bar.r.model.id === p.r.model.id && featured.has(bar.r.variant.id)); return on && label && p && (hl.has(p.r.model.id) || featuredModel) ? { value: label, textStyle: { color: pal.ink, fontWeight: 600 } } : label; }), position: "bottom", offset: grouped ? 24 * fontScale : 0, axisLabel: { rotate: 45, interval: 0, hideOverlap: false, margin: 10, fontSize: 12 * fontScale, color: pal.ink2, fontFamily: pal.fonts?.sans ?? "var(--font-inter), Inter, sans-serif", width: 160 * fontScale, overflow: "truncate" }, axisTick: { show: false }, axisLine: { show: false } },
    ],
    // Open Analysis: headroom so labels above the tallest bars never reach the axis title.
    yAxis: { type: "value", ...(fit !== "inside" ? { max: (e: { max: number }) => barAxisMax(e.max) } : {}), name: xName, nameTextStyle: { color: pal.grey, fontSize: 11 * t, align: "left", padding: [0, 0, 0, -30 * t] }, axisLabel: { formatter: (v: number) => compact(formatValue)(v) } },
    tooltip: { trigger: "item", confine: true, formatter: (p: unknown) => { const d = (p as { data?: { point?: ScatterPoint } }).data?.point; return d ? `<div style="font-weight:600">${escapeHtml(chartLabel(d.r))}</div><div style="font-family:var(--font-jetbrains);margin-top:4px">${escapeHtml(formatValue(value(d)))} · index ${d.r.score.toFixed(1)}</div>` : ""; } },
    series: [{
      type: "bar", id: "bars", barMaxWidth: maxBar, barCategoryGap: "24%",
      data: layout.entries.map((entry) => {
        if (!entry) return { value: null, itemStyle: { color: "transparent" }, label: { show: false } };
        const p = entry.point, c = markColor(color.get(p.r.model.labId), pal, p.r.model.labId), dim = on && !hl.has(p.r.model.id);
        const placement = inside && !dim && !short(p) ? { position: "inside" as const, distance: 0, rotate: 0, align: "center" as const, verticalAlign: "middle" as const, opacity: 1, ...insideLabelOn(c) } : above;
        return { value: value(p), point: p, extra: p, itemStyle: { color: dim ? dimColor(c, pal) : c, opacity: dim ? 0.6 : 1, borderRadius: [pal.style?.barRadius ?? 2, pal.style?.barRadius ?? 2, 0, 0] }, label: { show: true, ...placement, fontWeight: on && featured.has(p.r.variant.id) ? 700 : 400 } };
      }),
      label: { show: true, ...(inside ? { position: "inside" as const, distance: 0, rotate: 0, align: "center" as const, verticalAlign: "middle" as const, color: "#FFFFFF", textBorderWidth: 0 } : above), fontSize, fontFamily: pal.fonts?.mono ?? "var(--font-jetbrains), monospace", formatter: (p: { value?: unknown }) => fmt(Number(p.value)) }, labelLayout: { hideOverlap: true },
      animationDurationUpdate: 350,
    }],
  };
}
