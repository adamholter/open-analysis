"use client";
import Link from "next/link";
import { useMemo } from "react";
import type { Lab } from "@/data/types";
import type { RankedVariant } from "@/engine";
import { useChartPalette, markColor } from "@/components/chart/echarts";
import { useFilters, type Priced } from "./Filters";

const duration = (v: number) => (v >= 60 ? `${(v / 60).toFixed(v >= 600 ? 0 : 1)} min` : `${v.toFixed(v >= 10 ? 0 : 1)}s`);
const pct = (s: number) => `${Math.round(s * 100)}%`;
const usd = (v: number) => `$${v.toFixed(v < 1 ? 3 : 2)}`;

/** The All Models table: best reasoning effort per model, following the page filters. */
export function Leaderboard({ all, labs, seconds }: { all: Priced[]; labs: Lab[]; seconds: Record<string, number> }) {
  const f = useFilters();
  const pal = useChartPalette();
  const rows: RankedVariant[] = useMemo(() => f.ranked(all, "best"), [f, all]);
  const lab = useMemo(() => new Map(labs.map((l) => [l.id, l])), [labs]);
  return (
    <div className="chart-panel oa-scroll">
      <table className="oa-table">
        <thead><tr><th>#</th><th>Model</th><th className="oa-hide-sm">Lab</th><th className="num">Open Index</th><th className="num oa-hide-sm">Measured</th><th className="num">Cost / task</th><th className="num">Time / task</th><th className="oa-hide-sm">Released</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.variant.id}>
              <td>{r.rank}</td>
              <td><span className="oa-dot" data-lab={r.model.labId} style={{ background: markColor(lab.get(r.model.labId)?.color, pal, r.model.labId) }} /><Link href={`/models/${r.model.id}`}>{r.model.name}</Link>{r.variant.effort !== "default" && <span className="oa-effort">{r.variant.effort}</span>}</td>
              <td className="oa-hide-sm">{lab.get(r.model.labId)?.name ?? r.model.labId}</td>
              <td className="num"><b>{r.score.toFixed(1)}</b></td>
              <td className="num oa-hide-sm">{pct(r.measuredShare)}</td>
              <td className="num">{r.costUsd != null ? usd(r.costUsd) : "–"}</td>
              <td className="num">{seconds[r.variant.id] != null ? duration(seconds[r.variant.id]) : "–"}</td>
              <td className="oa-hide-sm">{r.model.releaseDate ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
