"use client";
import type { EChartsOption } from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Lab } from "@/data/types";
import type { RankedVariant } from "@/engine";
import { variantLabel } from "./ParetoChart";
import { markColor, useChartPalette, useEChart, insideLabelOn } from "./echarts";
import { barAxisMax, barChartMinWidth, barLabelFit, escapeHtml } from "./bars-option";
import { CONTAIN_AXIS_LABELS, dimColor, markSize, textSize } from "./theme";
import { BarChartScroll } from "./BarChartScroll";

let ctx: CanvasRenderingContext2D | null = null;
const fmtValue = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1));
/** Cut a label with an ellipsis so it is at most `max` px wide in `font`. */
function ellipsize(text: string, max: number, font: string) {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text;
  ctx.font = font;
  if (ctx.measureText(text).width <= max) return text;
  let n = text.length;
  while (n > 1 && ctx.measureText(text.slice(0, n).trimEnd() + "…").width > max) n--;
  return text.slice(0, n).trimEnd() + "…";
}

/** The Analysis theme leaderboard: one vertical bar per model, best first, score inside the bar (Artificial Analysis style). */
export function RankingColumns({ rows, labs, showEffort, selected, onSelect, getRef }: {
  rows: RankedVariant[]; labs: Lab[]; showEffort: boolean; selected?: string | null; onSelect?: (r: RankedVariant | null) => void;
  getRef?: (svg: () => string | undefined) => void;
}) {
  const pal = useChartPalette(), t = textSize(pal);
  const valueFont = 11.5 * t;
  const minWidth = barChartMinWidth(rows.length, rows.map((r) => fmtValue(r.score)), valueFont);
  const pick = useRef(onSelect), rowsRef = useRef(rows), selRef = useRef(selected);
  useEffect(() => { pick.current = onSelect; rowsRef.current = rows; selRef.current = selected; });
  // Labels slant down-left from their bar, so the first few have little room before the chart's left edge.
  const box = useRef<HTMLDivElement | null>(null), [w, setW] = useState<number>();
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width))); ro.observe(el); return () => ro.disconnect(); }, []);
  const option = useMemo<EChartsOption>(() => {
    const color = new Map(labs.map((l) => [l.id, markColor(l.color, pal, l.id)]));
    const on = !!selected && rows.some((r) => r.variant.id === selected);
    const width = Math.max(w ?? 0, minWidth);
    const left = 64 * t, size = 12 * t, slot = (width - left - 16) / Math.max(1, rows.length);
    const font = `${size}px ${(pal.fonts?.sans ?? "").replace(/var\([^)]*\),?\s*/g, "") || "Inter, sans-serif"}`;
    // Open Analysis: values sit inside only when they fit the bar (as in bars-option), else above, else vertical.
    const maxBar = (rows.length <= 6 ? 144 : 64) * markSize(pal);
    const fit = barLabelFit(rows.map((r) => fmtValue(r.score)), valueFont, rows.length, width - left - 16, maxBar);
    // Bars shorter than their value label show it above (plot height ≈ chart height minus grid margins).
    const top = Math.max(0, ...rows.map((r) => r.score)), bottom = Math.min(0, ...rows.map((r) => r.score));
    const plot = 420 * (pal.size?.height ?? 1) - 32 - 104 * t, short = (v: number) => top === bottom || (Math.abs(v) / (top - bottom)) * plot * 0.9 < valueFont + 14;
    const above = { position: "top" as const, distance: 5, rotate: 0, align: "center" as const, verticalAlign: "bottom" as const, color: pal.ink, textBorderWidth: 0, opacity: 1 };
    const outside = (v: number) => v < 0 ? { ...above, position: "bottom" as const, verticalAlign: "top" as const } : above;
    const label = (text: string, i: number) => (w ? ellipsize(text, Math.min(150 * t, (left + slot * (i + 0.5) - 6) / Math.SQRT1_2 - size), font) : text);
    return {
      grid: { left, right: 16, top: 32, bottom: 104 * t, ...CONTAIN_AXIS_LABELS },
      xAxis: { type: "category", data: rows.map((r, i) => label(showEffort ? variantLabel(r) : r.model.name, i)), axisLabel: { rotate: 45, interval: 0, hideOverlap: false, margin: 10, fontSize: size, color: pal.ink2, fontFamily: pal.fonts?.sans ?? "var(--font-inter), Inter, sans-serif", width: 150 * t, overflow: "truncate" }, axisTick: { show: false }, axisLine: { show: false } },
      yAxis: { type: "value", min: (e: { min: number }) => e.min < 0 ? -barAxisMax(-e.min) : 0, max: (e: { min: number; max: number }) => e.max > 0 ? barAxisMax(e.max) : e.min < 0 ? 0 : 1 },
      tooltip: { trigger: "item", confine: true, formatter: (p: unknown) => { const r = rows[(p as { dataIndex: number }).dataIndex]; return r ? `<div style="font-weight:600">${escapeHtml(r.variant.sourceModel?.name ?? variantLabel(r))}</div><div style="font-family:var(--font-jetbrains);margin-top:4px">#${r.rank} · index ${r.score.toFixed(1)}</div>` : ""; } },
      series: [{
        type: "bar", id: "rank", barMaxWidth: maxBar, barCategoryGap: "24%",
        data: rows.map((r) => {
          const c = color.get(r.model.labId) ?? "#A3A39B", dim = on && r.variant.id !== selected;
          const fill = dim ? dimColor(c, pal) : c;
          // ECharts merges per-item labels by index. Reset placement as well as color on every update.
          const label = fit === "inside" && !short(r.score) ? { position: "inside" as const, distance: 0, rotate: 0, align: "center" as const, verticalAlign: "middle" as const, opacity: 1, ...insideLabelOn(fill) } : outside(r.score);
          return { value: r.score, itemStyle: { color: fill, opacity: dim ? 0.6 : 1, borderRadius: [pal.style?.barRadius ?? 2, pal.style?.barRadius ?? 2, 0, 0] }, label };
        }),
        label: { show: true, ...(fit === "inside" ? { position: "inside" as const, distance: 0, rotate: 0, align: "center" as const, verticalAlign: "middle" as const, color: "#FFFFFF", textBorderWidth: 0 } : above), fontSize: valueFont, fontFamily: pal.fonts?.mono ?? "var(--font-jetbrains), monospace", formatter: (p: { value?: unknown }) => fmtValue(Number(p.value)) }, labelLayout: { hideOverlap: true },
        animationDurationUpdate: 350,
      }],
    };
  }, [rows, labs, showEffort, selected, pal, t, w, valueFont, minWidth]);
  const { ref, chart } = useEChart(option, [option], (c) => {
    c.on("click", (e) => { const r = rowsRef.current[e.dataIndex]; if (r) pick.current?.(selRef.current === r.variant.id ? null : r); });
  });
  useEffect(() => { getRef?.(() => chart.current?.renderToSVGString()); });
  return <BarChartScroll label="Rankings"><div ref={(el) => { ref.current = el; box.current = el; }} role="img" aria-label={`Rankings, ${rows.length} models by index score`} style={{ width: "100%", minWidth, height: Math.round(420 * (pal.size?.height ?? 1)), overflow: "hidden", position: "relative", isolation: "isolate" }} /></BarChartScroll>;
}
