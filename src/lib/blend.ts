/** Build your index: a weighted average of benchmarks on one 0–100 scale. Client-safe. */
import type { ScoreBench } from "@/lib/views";

export interface Pick { id: string; w: number }

/** A benchmark result on 0–100: percentages as they are, other units scaled between the worst and best catalog model (flipped when lower is better). */
export function normalizer(b: ScoreBench) {
  if (b.unit === "percent") return (v: number) => Math.max(0, Math.min(100, v));
  const vs = b.cells.map((c) => c[1]), lo = Math.min(...vs), hi = Math.max(...vs);
  return (v: number) => { const t = (v - lo) / (hi - lo || 1); return 100 * (b.higher ? t : 1 - t); };
}

export interface Blended { model: number; score: number; have: number; cost?: number; efforts: string[] }

/** Each model's blended score over the picked benchmarks it has results on; cost is the weighted cost per task where those results carry one. */
export function blend(scores: ScoreBench[], picks: Pick[]): Blended[] {
  const byId = new Map(scores.map((b) => [b.id, b]));
  const acc = new Map<number, { s: number; w: number; have: number; c: number; cw: number; efforts: string[] }>();
  for (const p of picks) {
    const b = byId.get(p.id); if (!b || p.w <= 0) continue;
    const norm = normalizer(b);
    for (const [m, v, effort, cost] of b.cells) {
      const a = acc.get(m) ?? acc.set(m, { s: 0, w: 0, have: 0, c: 0, cw: 0, efforts: [] }).get(m)!;
      a.s += norm(v) * p.w; a.w += p.w; a.have += 1; a.efforts.push(effort);
      if (cost != null) { a.c += cost * p.w; a.cw += p.w; }
    }
  }
  return [...acc.entries()].map(([model, a]) => ({ model, score: a.s / a.w, have: a.have, ...(a.cw ? { cost: a.c / a.cw } : {}), efforts: a.efforts }));
}

export const encodePicks = (p: Pick[]) => p.map((x) => (x.w === 1 ? x.id : `${x.id}:${x.w}`)).join(",");
export const decodePicks = (s: string | null): Pick[] => (s ? s.split(",").filter(Boolean).map((t) => { const i = t.lastIndexOf(":"); const w = i > 0 ? Number(t.slice(i + 1)) : NaN; return Number.isFinite(w) ? { id: t.slice(0, i), w } : { id: t, w: 1 }; }) : []);
