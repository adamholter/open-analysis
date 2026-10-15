"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, ScatterChart } from "echarts/charts";
import { GridComponent, TooltipComponent, MarkAreaComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { LabelLayout } from "echarts/features";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([BarChart, ScatterChart, GridComponent, TooltipComponent, MarkAreaComponent, SVGRenderer, LabelLayout]);

export interface Point { id: string; name: string; label: string; color: string; x?: number; y: number; href?: string }

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setDark(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
}

const FONT = "Switzer, 'Helvetica Neue', Arial, sans-serif";
const palette = (dark: boolean) => ({ ink: dark ? "#fafafa" : "#000", grey: dark ? "#a1a1aa" : "#71717a", hair: dark ? "#27272a" : "#e4e4e7", bg: dark ? "#141414" : "#fff", accent: dark ? "#a78bfa" : "#7f4bf3" });
// Near-black/near-white labs (OpenAI) flip in dark mode so marks stay visible.
const markColor = (c: string, dark: boolean) => (dark && /^#(1f1f1f|021b30|505050)$/i.test(c) ? "#e6e6e6" : c);

function useEChart(option: (dark: boolean) => EChartsCoreOption, points: Point[], height: number) {
  const ref = useRef<HTMLDivElement>(null);
  const dark = useDark();
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "svg" });
    chart.setOption(option(dark));
    chart.on("click", (e) => { const href = points[e.dataIndex]?.href; if (href) window.location.href = href; });
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); chart.dispose(); };
  }, [dark, option, points]);
  return <div ref={ref} style={{ width: "100%", height }} />;
}

/** AA-style vertical bars: model names under bars, value on top, lab colors. */
export function Bars({ points, unit = "", digits = 0, height = 360, lowerIsBetter = false }: { points: Point[]; unit?: string; digits?: number; height?: number; lowerIsBetter?: boolean }) {
  const option = useCallback((dark: boolean): EChartsCoreOption => {
    const fmt = (v: number) => `${v.toFixed(digits)}${unit}`;
    const p = palette(dark);
    return {
      animation: false,
      textStyle: { fontFamily: FONT },
      grid: { left: 8, right: 8, top: 28, bottom: 8, containLabel: true },
      tooltip: { trigger: "item", formatter: (x: { dataIndex: number }) => `${points[x.dataIndex].label}<br/><b>${fmt(points[x.dataIndex].y)}</b>${lowerIsBetter ? " (lower is better)" : ""}` },
      xAxis: { type: "category", data: points.map((d) => d.name), axisTick: { show: false }, axisLine: { lineStyle: { color: p.hair } },
        axisLabel: { color: p.ink, fontSize: 11, rotate: points.length > 12 ? 45 : 0, interval: 0, width: 90, overflow: "truncate" } },
      yAxis: { type: "value", splitLine: { lineStyle: { color: p.hair, type: [2, 3] } }, axisLabel: { color: p.grey, fontSize: 11 } },
      series: [{ type: "bar", barMaxWidth: 34, data: points.map((d) => ({ value: d.y, itemStyle: { color: markColor(d.color, dark), borderRadius: [3, 3, 0, 0] } })),
        label: { show: true, position: "top", color: p.ink, fontSize: 11, formatter: (x: { value: number }) => x.value.toFixed(digits) }, cursor: "pointer" }],
    };
  }, [points, unit, digits, lowerIsBetter]);
  return useEChart(option, points, height);
}

/** Score vs metric scatter with AA's "most attractive quadrant" shaded from the medians. */
export function Scatter({ points, xName, yName, logX = false, xUnit = "", higherXIsBetter = false, height = 420 }: { points: Point[]; xName: string; yName: string; logX?: boolean; xUnit?: string; higherXIsBetter?: boolean; height?: number }) {
  const option = useCallback((dark: boolean): EChartsCoreOption => {
    const p = palette(dark);
    const xs = points.map((d) => d.x!).sort((a, b) => a - b), ys = points.map((d) => d.y).sort((a, b) => a - b);
    const mx = xs[Math.floor(xs.length / 2)], my = ys[Math.floor(ys.length / 2)];
    const fx = (v: number) => (xUnit === "$" ? `$${v < 1 ? v.toFixed(2) : v.toFixed(v < 10 ? 1 : 0)}` : `${v.toFixed(0)}${xUnit}`);
    return {
      animation: false,
      textStyle: { fontFamily: FONT },
      grid: { left: 36, right: 96, top: 16, bottom: 40, containLabel: true },
      tooltip: { trigger: "item", formatter: (x: { dataIndex: number }) => { const d = points[x.dataIndex]; return `${d.label}<br/>${yName}: <b>${d.y.toFixed(1)}</b><br/>${xName}: <b>${fx(d.x!)}</b>`; } },
      xAxis: { type: logX ? "log" : "value", name: xName, nameLocation: "middle", nameGap: 28, nameTextStyle: { color: p.grey, fontSize: 12 },
        splitLine: { lineStyle: { color: p.hair, type: [2, 3] } }, axisLine: { lineStyle: { color: p.hair } }, axisLabel: { color: p.grey, fontSize: 11, formatter: fx }, scale: true },
      yAxis: { type: "value", name: yName, nameLocation: "middle", nameGap: 32, nameTextStyle: { color: p.grey, fontSize: 12 }, scale: true,
        splitLine: { lineStyle: { color: p.hair, type: [2, 3] } }, axisLabel: { color: p.grey, fontSize: 11 } },
      series: [{
        type: "scatter", symbolSize: 11, cursor: "pointer",
        data: points.map((d) => ({ value: [d.x, d.y], itemStyle: { color: markColor(d.color, dark), borderColor: p.bg, borderWidth: 1 } })),
        label: { show: true, position: "right", color: p.ink, fontSize: 11, formatter: (x: { dataIndex: number }) => points[x.dataIndex].name },
        labelLayout: { hideOverlap: true, moveOverlap: "shiftY" },
        markArea: { silent: true, itemStyle: { color: dark ? "rgba(167,139,250,0.07)" : "rgba(127,75,243,0.05)" },
          data: [[{ xAxis: higherXIsBetter ? mx : "min", yAxis: my }, { xAxis: higherXIsBetter ? "max" : mx, yAxis: "max" }]] },
      }],
    };
  }, [points, xName, yName, logX, xUnit, higherXIsBetter]);
  return useEChart(option, points, height);
}
