/** Client-safe chart definitions keyed by id; points come from src/lib/views.ts. */
import { costChart, money, speedChart } from "@/lib/metrics";

export interface ChartDef {
  better: "lower" | "higher"; xName: string; xShort?: string; xUnit?: string; scale?: "linear" | "log" | "time";
  formatX: (x: number) => string; formatValue?: (x: number) => string; aria: string; defaultKind: "bars" | "scatter"; barName?: string;
}

const fmt = (u: string) => (x: number) => `${x.toLocaleString(undefined, { maximumFractionDigits: 2 })}${u}`;
const secs = (x: number) => x >= 1000 ? `${Math.round(x / 100) / 10}k s` : fmt("s")(x);
const pct = (x: number) => `${x >= 10 ? x.toFixed(0) : x >= 0.1 ? x.toFixed(1) : x.toFixed(2)}%`;

export const CHARTS: Record<string, ChartDef> = {
  cost: { ...costChart, defaultKind: "scatter", barName: "Cost per task ($)" },
  costBars: { ...costChart, defaultKind: "bars", barName: "Cost per task ($)" },
  speed: { ...speedChart, xUnit: speedChart.xLabel, defaultKind: "bars", barName: "Output speed (tok/s)" },
  tpt: { better: "lower", xName: "Time per task (s)", xUnit: "s/task", scale: "log", formatX: secs, aria: "Index score versus time per task", defaultKind: "scatter" },
  latency: { better: "lower", xName: "Time to first token (s)", xUnit: "s", scale: "log", formatX: fmt("s"), aria: "Index score versus time to first token", defaultKind: "bars" },
  tokens: { better: "lower", xName: "Output tokens per task", xUnit: "tok", scale: "log", formatX: (x) => x >= 1000 ? `${(x / 1000).toFixed(0)}k` : `${x.toFixed(0)}`, aria: "Index score versus output tokens per task", defaultKind: "bars" },
  date: { better: "lower", xName: "Release date", scale: "time", formatX: (x) => new Date(x).toISOString().slice(0, 10), aria: "Index score versus release date", defaultKind: "scatter" },
  uptime: { better: "higher", xName: "Uptime (%)", formatX: (t) => `${parseFloat((100 - 10 ** -t).toFixed(3))}%`, formatValue: fmt("%"), aria: "Index score versus OpenRouter uptime", defaultKind: "bars" },
  usage: { better: "higher", xName: "Share of T3 Code turns (%)", xUnit: "%", scale: "log", formatX: pct, formatValue: pct, aria: "Index score versus T3 Code usage share", defaultKind: "bars" },
  providers: { better: "higher", xName: "API providers", formatX: (x) => `${Math.round(x)}`, aria: "Index score versus number of API providers", defaultKind: "bars" },
};

export { money };

/** Value formatter for a single benchmark's unit. */
export function unitFormat(unit: string): (x: number) => string {
  if (unit === "percent") return (x) => `${x.toFixed(x >= 10 ? 0 : 1)}%`;
  if (unit === "usd") return money;
  if (unit === "seconds") return secs;
  return (x) => (Math.abs(x) >= 100 ? Math.round(x).toLocaleString() : x.toFixed(1));
}
