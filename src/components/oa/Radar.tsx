"use client";
import { useLabColor } from "./palette";

export interface RadarSeries { key: string; name: string; labId: string; values: Record<string, number | undefined> }

/** Capability radar: one ring per 25 points, one polygon per model. Missing axes sit at the centre and are listed in the tooltip text. */
export function Radar({ axes, series, size = 360, labels = true, dashed = [] }: { axes: { id: string; name: string }[]; series: RadarSeries[]; size?: number; labels?: boolean; dashed?: string[] }) {
  const labColor = useLabColor();
  const pad = labels ? 78 : 10, r = size / 2 - pad, cx = size / 2 + (labels ? 30 : 0), cy = size / 2;
  const width = size + (labels ? 60 : 0);
  const n = axes.length;
  const at = (i: number, v: number) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n, d = (r * Math.max(0, Math.min(100, v))) / 100; return [cx + d * Math.cos(a), cy + d * Math.sin(a)]; };
  if (n < 3) return null;
  return (
    <svg width={width} height={size} viewBox={`0 0 ${width} ${size}`} className="oa-svg oa-radar" role="img" aria-label={`Capability radar: ${series.map((s) => s.name).join(", ")}`}>
      {[25, 50, 75, 100].map((t) => <polygon key={t} className="oa-grid" fill="none" points={axes.map((_, i) => at(i, t).join(",")).join(" ")} />)}
      {axes.map((ax, i) => {
        const [x, y] = at(i, 100), [lx, ly] = at(i, 118);
        return <g key={ax.id}><line className="oa-grid" x1={cx} y1={cy} x2={x} y2={y} />
          {labels && <text className="oa-tick" x={lx} y={ly + 4} textAnchor={Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end"}>{ax.name}</text>}</g>;
      })}
      {series.map((s) => {
        const c = labColor(s.labId);
        return <polygon key={s.key} points={axes.map((ax, i) => at(i, s.values[ax.id] ?? 0).join(",")).join(" ")} fill={c} fillOpacity={0.12} stroke={c} strokeWidth={1.8} strokeDasharray={dashed.includes(s.key) ? "4 3" : undefined} />;
      })}
    </svg>
  );
}
