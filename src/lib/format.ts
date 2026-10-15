export const usd = (v?: number) => v == null ? "–" : `$${v < 0.01 ? v.toFixed(4) : v < 1 ? v.toFixed(3) : v.toFixed(2)}`;
export const num = (v?: number, d = 0) => v == null ? "–" : v.toFixed(d);
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const effortLabel = (e: string) => e === "default" ? "" : e;
