"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconLock, IconPlus, IconX } from "@tabler/icons-react";
import { useLabColor } from "./palette";
import type { CatModel, ScoreBench } from "@/lib/views";
import { categoryLabel } from "@/lib/categories";
import { blend, normalizer } from "@/lib/blend";
import { date, money, rate, unitFormats } from "@/lib/format";
import { useLightDismiss } from "@/lib/useLightDismiss";
import { ChartCard, HBars, type Bar } from "./Bars";
import { Radar } from "./Radar";
import { useSelection } from "./Selection";
import { SearchBox } from "./SearchBox";
import { usePicks } from "./Home";
import { effortName } from "./ModelPicker";

const MAX = 4;

function AddModel({ models, chosen, onAdd }: { models: CatModel[]; chosen: string[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false), [q, setQ] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useLightDismiss(root, useCallback(() => setOpen(false), []));
  const { catalog } = useSelection();
  const labName = new Map(catalog.labs.map((l) => [l.id, l.name]));
  const s = q.trim().toLowerCase();
  const list = models.filter((m) => !chosen.includes(m.id) && (!s || `${m.name} ${labName.get(m.labId) ?? ""}`.toLowerCase().includes(s)));
  return (
    <div ref={root} className="oa-pwrap">
      <button type="button" className="oa-btn" onClick={() => setOpen(!open)} disabled={chosen.length >= MAX} aria-expanded={open} title={chosen.length >= MAX ? `Up to ${MAX} models` : "Add a model"}><IconPlus size={15} stroke={1.8} aria-hidden="true" />Add model</button>
      {open && <div className="oa-picker" data-align="left" style={{ maxHeight: 420, width: 320 }} role="dialog" aria-label="Add a model">
        <div className="oa-ppad"><SearchBox value={q} onChange={setQ} placeholder="Search models or labs" label="Search models" autoFocus /></div>
        <div className="oa-pscroll"><div className="oa-plist">
          {list.map((m) => <button key={m.id} type="button" className="oa-pmodel" onClick={() => { onAdd(m.id); setOpen(false); setQ(""); }}><span>{m.name}</span><small>{labName.get(m.labId)}{m.score != null ? ` · ${m.score.toFixed(1)}` : ""}</small></button>)}
          {!list.length && <p className="oa-pnote">No model matches.</p>}
        </div></div>
      </div>}
    </div>
  );
}

/** Compare 2–4 models: your index, the capability radar, the key numbers side by side, then where they differ most. */
export function Compare({ scores, axes, caps }: { scores: ScoreBench[]; axes: { id: string; name: string }[]; caps: Record<string, Record<string, number>> }) {
  const { catalog } = useSelection();
  const labColor = useLabColor();
  const [ids, setIds] = useState<string[]>([]);
  const [cat, setCat] = useState("all");
  const [shared, setShared] = useState(true);
  const byId = useMemo(() => new Map(catalog.models.map((m) => [m.id, m])), [catalog.models]);
  const slot = useMemo(() => new Map(catalog.models.map((m, i) => [m.id, i])), [catalog.models]);
  useEffect(() => {
    const fromUrl = (new URL(window.location.href).searchParams.get("c") ?? "").split(",").filter((x) => byId.has(x)).slice(0, MAX);
    const start = fromUrl.length >= 2 ? fromUrl : [...fromUrl, ...catalog.models.filter((m) => m.score != null && !fromUrl.includes(m.id)).slice(0, 2 - fromUrl.length).map((m) => m.id)];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the compared models come from the link
    setIds(start);
  }, [byId, catalog.models]);
  useEffect(() => {
    if (!ids.length) return;
    const url = new URL(window.location.href); url.searchParams.set("c", ids.join(","));
    window.history.replaceState(window.history.state, "", url.pathname + `?${url.searchParams}` + url.hash);
  }, [ids]);
  const ms = ids.map((id) => byId.get(id)!).filter(Boolean);
  const labName = new Map(catalog.labs.map((l) => [l.id, l.name]));
  const color = (m: CatModel) => labColor(m.labId);
  // Your index for these models.
  const { picks, loaded } = usePicks(scores);
  const yours = useMemo(() => blend(scores, picks), [scores, picks]);
  const yourBars: Bar[] = ms.flatMap((m) => { const b = yours.find((x) => x.model === slot.get(m.id)); return b ? [{ key: m.id, modelId: m.id, name: m.name, labId: m.labId, effort: "default", value: +b.score.toFixed(1), tip: [`Results on ${b.have} of ${picks.length} benchmarks`] }] : []; }).sort((a, b) => b.value - a.value);
  // Benchmarks where they differ most.
  const diffs = useMemo(() => {
    const idx = ms.map((m) => slot.get(m.id)!);
    return scores.flatMap((b) => {
      if (cat !== "all" && b.category !== cat) return [];
      const vals = idx.map((i) => b.cells.find((c) => c[0] === i));
      const have = vals.filter(Boolean).length;
      if (have < 2 || (shared && have < idx.length)) return [];
      const norm = normalizer(b), ns = vals.map((c) => (c ? norm(c[1]) : undefined)).filter((x): x is number => x != null);
      return [{ b, vals, gap: Math.max(...ns) - Math.min(...ns) }];
    }).sort((a, b) => b.gap - a.gap).slice(0, 25);
  }, [scores, ms, slot, cat, shared]);
  const cats = useMemo(() => [...new Set(scores.map((b) => b.category))].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b))), [scores]);
  if (!ms.length) return null;
  const facts: [string, (m: CatModel) => string, ((m: CatModel) => number | undefined)?, ("high" | "low")?][] = [
    ["Open Index", (m) => (m.score != null ? m.score.toFixed(1) : "–"), (m) => m.score, "high"],
    ["Cost per task", (m) => (m.cost != null ? money(m.cost) : "–"), (m) => m.cost, "low"],
    ["Output speed", (m) => (m.speed != null ? `${rate(m.speed)} tok/s` : "–"), (m) => m.speed, "high"],
    ["Released", (m) => date(m.releaseDate)],
    ["Weights", (m) => (m.open == null ? "–" : m.open ? "Open" : "Closed")],
    ["Reasoning levels", (m) => m.efforts.filter((e) => e !== "default").join(", ") || "–"],
    ["Index coverage", (m) => (m.score != null ? `${m.measured} of ${catalog.indexSize}` : "–")],
    ["Results", (m) => `${m.results} benchmarks`, (m) => m.results, "high"],
  ];
  const bestOf = (get: (m: CatModel) => number | undefined, dir: "high" | "low") => { const vs = ms.map(get).filter((v): v is number => v != null); return vs.length > 1 ? (dir === "high" ? Math.max(...vs) : Math.min(...vs)) : undefined; };
  return (
    <div className="oa-stack">
      <div className="oa-cmpbar">
        {ms.map((m) => (
          <span key={m.id} className="oa-cmpchip"><i className="oa-dot" style={{ background: color(m) }} /><Link href={`/models/${m.id}`}><b>{m.name}</b></Link><small>{labName.get(m.labId)}</small>
            <button type="button" onClick={() => setIds(ids.filter((x) => x !== m.id))} disabled={ms.length <= 1} aria-label={`Remove ${m.name}`} title="Remove"><IconX size={13} stroke={2} /></button></span>
        ))}
        <AddModel models={catalog.models} chosen={ids} onAdd={(id) => setIds([...ids, id])} />
        <span className="oa-muted" style={{ fontSize: 12.5 }}>Up to {MAX} models. The link keeps them.</span>
      </div>
      <ChartCard title="Your index" models={false} desc={picks.length ? `${picks.length} benchmarks you picked on the overview, on a 0–100 scale` : "Build your own index on the overview to see it here"}
        extra={<Link href="/#your-index" className="oa-btn sm">{picks.length ? "Change benchmarks" : "Build your index"}</Link>}>
        {loaded && (picks.length ? <HBars bars={yourBars} format={(v) => v.toFixed(1)} max={100} aria="Your index for the compared models" empty="None of these models has results on your benchmarks." />
          : <p className="oa-muted" style={{ padding: "8px 0" }}>Pick the benchmarks you care about and their weights; the compare page then starts with your own score for each model.</p>)}
      </ChartCard>
      <div className="oa-grid2">
        <ChartCard title="Capabilities" models={false} desc="Score on each capability index">
          <div className="oa-cmpradar">
            <Radar axes={axes} series={ms.map((m) => ({ key: m.id, name: m.name, labId: m.labId, values: caps[m.id] ?? {} }))} size={340} />
            <div className="oa-legend">{ms.map((m) => <span key={m.id}><i style={{ background: color(m) }} />{m.name}</span>)}</div>
          </div>
        </ChartCard>
        <ChartCard title="Side by side" models={false} desc="Best value in bold">
          <div className="oa-scroll">
            <table className="oa-table oa-cmptable">
              <thead><tr><th />{ms.map((m) => <th key={m.id} className="num">{m.name}</th>)}</tr></thead>
              <tbody>
                {facts.map(([label, show, get, dir]) => { const best = get && dir ? bestOf(get, dir) : undefined; return (
                  <tr key={label}><td className="oa-muted">{label}</td>{ms.map((m) => <td key={m.id} className="num" style={{ fontWeight: best != null && get!(m) === best ? 600 : undefined }}>{show(m)}</td>)}</tr>); })}
                {axes.map((a) => { const vs = ms.map((m) => caps[m.id]?.[a.id]); const best = vs.filter((v) => v != null).length > 1 ? Math.max(...vs.filter((v): v is number => v != null)) : undefined; return (
                  <tr key={a.id}><td className="oa-muted">{a.name}</td>{ms.map((m, i) => <td key={m.id} className="num" style={{ fontWeight: best != null && vs[i] === best ? 600 : undefined }}>{vs[i] != null ? vs[i]!.toFixed(1) : "–"}</td>)}</tr>); })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
      <ChartCard title="Where they differ most" models={false} desc="Benchmarks sorted by the gap between the best and the worst of these models, on a 0–100 scale"
        extra={<>
          <select className="oa-select" style={{ height: 30 }} aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{cats.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}</select>
          <div className="oa-seg" role="group" aria-label="Which benchmarks"><button type="button" aria-pressed={shared} onClick={() => setShared(true)} title="Only benchmarks every compared model has">All have it</button><button type="button" aria-pressed={!shared} onClick={() => setShared(false)} title="Benchmarks at least two of them have">Any two</button></div>
        </>}>
        <div className="oa-scroll">
          <table className="oa-table">
            <thead><tr><th>Benchmark</th><th>Category</th>{ms.map((m) => <th key={m.id} className="num">{m.name}</th>)}<th className="num" title="Best minus worst, on a 0–100 scale">Gap</th></tr></thead>
            <tbody>
              {diffs.map(({ b, vals, gap }) => {
                const f = unitFormats(b.unit), present = vals.filter(Boolean).map((c) => c![1]);
                const best = b.higher ? Math.max(...present) : Math.min(...present);
                return (
                  <tr key={b.id}>
                    <td><Link href={`/benchmarks/${b.id}`} title={b.description}>{b.name}</Link>{b.access === "closed" && <IconLock size={11} stroke={2} className="oa-lock" aria-label="Closed tasks" />}{b.community && <span className="oa-badge">Community</span>}</td>
                    <td className="oa-muted">{categoryLabel(b.category)}</td>
                    {vals.map((c, i) => <td key={ids[i]} className="num" style={{ fontWeight: c && c[1] === best ? 600 : undefined }} title={c ? effortName(c[2]) : undefined}>{c ? `${f.value(c[1])}${b.unit === "percent" ? "%" : ""}` : "–"}</td>)}
                    <td className="num oa-muted">{gap.toFixed(0)}</td>
                  </tr>
                );
              })}
              {!diffs.length && <tr><td colSpan={ms.length + 3} className="oa-muted">No benchmark has results for these models{shared ? " together. Try “Any two”." : "."}</td></tr>}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
