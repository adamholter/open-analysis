/** Client-safe number formats for charts and tables. */
export const score = (v: number) => v.toFixed(1);
export const money = (v: number) => (v === 0 ? "free" : `$${v < 0.01 ? +v.toPrecision(2) : v.toFixed(v < 0.1 ? 3 : 2)}`);
export const moneyAxis = (v: number) => `$${v < 0.01 ? +v.toPrecision(1) : +v.toFixed(v < 10 ? 2 : 0)}`;
export const secs = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k s` : `${v < 10 ? +v.toFixed(2) : v < 100 ? +v.toFixed(1) : Math.round(v)}s`);
export const rate = (v: number) => `${Math.round(v)}`;
export const date = (d?: string) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "–");

/** Value and axis formats for a benchmark's unit. */
export function unitFormats(unit: string): { value: (v: number) => string; axis: (v: number) => string; max?: number } {
  if (unit === "percent") return { value: (v) => v.toFixed(1), axis: (v) => `${v}%`, max: 100 };
  if (unit === "usd") return { value: money, axis: moneyAxis };
  if (unit === "seconds") return { value: secs, axis: secs };
  return { value: (v) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1)), axis: (v) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${+v.toFixed(2)}`) };
}
