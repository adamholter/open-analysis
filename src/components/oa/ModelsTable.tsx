"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { useLabColor } from "./palette";
import type { ModelRow } from "@/lib/bars";
import { date, money, rate } from "@/lib/format";
import { useSelection } from "./Selection";
import { SearchBox } from "./SearchBox";
import { Radar } from "./Radar";
import { effortName } from "./ModelPicker";

type Key = "name" | "release" | "score" | "cost" | "speed" | "results";
const COLS: [Key, string, string, boolean][] = [
  ["name", "Model", "Model and lab", false], ["release", "Released", "Release date", false], ["score", "Open Index", "Open Index score at the best reasoning level", true],
  ["cost", "Cost / task", "API cost per Open Index task", true], ["speed", "Speed", "Output tokens per second", true], ["results", "Results", "Benchmarks with a result", true],
];

/** Every model the picker offers: levels, Open Index, best capability, cost and speed. Hover a row for its capability radar. */
export function ModelsTable({ rows, axes, indexSize }: { rows: ModelRow[]; axes: { id: string; name: string }[]; indexSize: number }) {
  const { catalog } = useSelection();
  const labColor = useLabColor();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "score", dir: -1 });
  const [lab, setLab] = useState("all");
  const [ranked, setRanked] = useState<"all" | "index">("all");
  const [hov, setHov] = useState<{ row: ModelRow; y: number } | null>(null);
  const labName = useMemo(() => new Map(catalog.labs.map((l) => [l.id, l.name])), [catalog.labs]);
  const labs = useMemo(() => [...new Set(rows.map((r) => r.labId))].sort((a, b) => (labName.get(a) ?? a).localeCompare(labName.get(b) ?? b)), [rows, labName]);
  const val = (r: ModelRow, k: Key): number | string | undefined => (k === "name" ? r.name.toLowerCase() : k === "release" ? r.releaseDate : k === "score" ? r.score : k === "cost" ? r.cost : k === "speed" ? r.speed : r.results);
  const s = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!s || `${r.name} ${labName.get(r.labId) ?? ""}`.toLowerCase().includes(s)) && (lab === "all" || r.labId === lab) && (ranked === "all" || r.score != null))
    .sort((a, b) => { const x = val(a, sort.k), y = val(b, sort.k); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  const top = Math.max(...rows.map((r) => r.score ?? 0));
  const th = ([k, label, title, num]: (typeof COLS)[number]) => (
    <th key={k} className={num ? "num" : undefined} aria-sort={sort.k === k ? (sort.dir > 0 ? "ascending" : "descending") : undefined}>
      <button type="button" className="oa-thsort" title={`Sort by ${title.toLowerCase()}`} onClick={() => setSort(sort.k === k ? { k, dir: (sort.dir * -1) as 1 | -1 } : { k, dir: k === "name" || k === "cost" ? 1 : -1 })}>
        {label}{sort.k === k && (sort.dir > 0 ? <IconArrowUp size={12} stroke={2} /> : <IconArrowDown size={12} stroke={2} />)}
      </button>
    </th>
  );
  return (
    <div className="oa-card oa-mt">
      <div className="oa-mtools">
        <div style={{ width: 300, maxWidth: "100%" }}><SearchBox value={q} onChange={setQ} placeholder="Search models or labs" label="Search models" /></div>
        <select aria-label="Lab" value={lab} onChange={(e) => setLab(e.target.value)} className="oa-select"><option value="all">All labs</option>{labs.map((l) => <option key={l} value={l}>{labName.get(l) ?? l}</option>)}</select>
        <div className="oa-seg" role="group" aria-label="Which models"><button type="button" aria-pressed={ranked === "all"} onClick={() => setRanked("all")}>All {rows.length}</button><button type="button" aria-pressed={ranked === "index"} onClick={() => setRanked("index")} title="Models with an Open Index score">On the Open Index</button></div>
        <span className="oa-muted" style={{ marginLeft: "auto", fontSize: 12.5 }}>{shown.length} models · hover a row for its capabilities</span>
      </div>
      <div className="oa-scroll" onMouseLeave={() => setHov(null)}>
        <table className="oa-table oa-mtable">
          <thead><tr><th>#</th>{COLS.slice(0, 2).map(th)}<th>Levels</th>{th(COLS[2])}<th title="The capability where the model ranks highest">Best at</th>{COLS.slice(3).map(th)}<th>Weights</th></tr></thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.id} onMouseEnter={(e) => { const box = (e.currentTarget.closest(".oa-scroll") as HTMLElement).getBoundingClientRect(); setHov({ row: r, y: e.currentTarget.getBoundingClientRect().top - box.top }); }}>
                <td className="oa-muted">{i + 1}</td>
                <td><Link href={`/models/${r.id}`} className="oa-mname"><i className="oa-dot" style={{ background: labColor(r.labId) }} /><span><b>{r.name}</b><small>{labName.get(r.labId) ?? r.labId}</small></span></Link></td>
                <td className="oa-muted">{date(r.releaseDate)}</td>
                <td><span className="oa-lchips">{r.efforts.filter((e) => e !== "default").map((e) => <span key={e} title={effortName(e)} data-best={e === r.effort || undefined}>{e === "none" ? "none" : e}</span>)}</span></td>
                <td className="num">{r.score != null ? <span className="oa-ibar" title={`Results on ${r.measured} of ${indexSize} index benchmarks`}><i style={{ width: `${(100 * r.score) / top}%`, background: labColor(r.labId) }} /><b>{r.score.toFixed(1)}</b></span> : <span className="oa-muted" title="Too few results on the index benchmarks">–</span>}</td>
                <td>{r.best ? <span title={`#${r.best.rank} of ${r.best.of} models`}>{r.best.name} <small className="oa-muted">#{r.best.rank}</small></span> : <span className="oa-muted">–</span>}</td>
                <td className="num">{r.cost != null ? money(r.cost) : "–"}</td>
                <td className="num">{r.speed != null ? rate(r.speed) : "–"}</td>
                <td className="num">{r.results}</td>
                <td>{r.open == null ? <span className="oa-muted">–</span> : r.open ? <span className="oa-badge" style={{ marginLeft: 0 }}>Open</span> : <span className="oa-muted">Closed</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {hov && Object.keys(hov.row.caps).length >= 3 && (
          <div className="oa-mradar" style={{ top: Math.max(40, hov.y - 100) }}>
            <b>{hov.row.name}</b><small>Capability scores</small>
            <Radar axes={axes} series={[{ key: hov.row.id, name: hov.row.name, labId: hov.row.labId, values: hov.row.caps }]} size={200} />
          </div>
        )}
      </div>
    </div>
  );
}
