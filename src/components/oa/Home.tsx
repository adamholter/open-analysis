"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconCheck, IconLink, IconLock, IconPlus, IconRotate, IconStack2, IconX } from "@tabler/icons-react";
import type { HomeData } from "@/lib/bars";
import type { BenchmarkChart, ChartModel, ScoreBench } from "@/lib/views";
import { categoryDescription, categoryLabel } from "@/lib/categories";
import { money, moneyAxis, rate, score, secs, unitFormats } from "@/lib/format";
import { blend, decodePicks, encodePicks, type Pick } from "@/lib/blend";
import { useLightDismiss } from "@/lib/useLightDismiss";
import { BarCard, ChartCard, HBars, Info, saveCsv, savePng, type Bar } from "./Bars";
import { Scatter, ScatterCard, type Point } from "./Scatter";
import { useSelection } from "./Selection";
import { SearchBox } from "./SearchBox";

/* ---------- Open Index ---------- */
export function IndexSection({ data }: { data: HomeData["index"] }) {
  return <BarCard id="open-index" title="Open Index" rows={data.bars} better="higher" format={score} max={100} valueName="Open Index"
    desc={<>Average of {data.size} independent benchmarks · higher is better · <Link href="/methodology">How it works</Link></>}
    info={`The ${data.size} benchmarks: ${data.benchmarks.map((b) => b.name).join(", ")}. A model missing some of them still gets a score; hover a bar to see how many are measured.`} />;
}

/* ---------- Build your index ---------- */
const STORE = "oa:your-index";
const STARTER = ["terminalbench-4", "arc-agi-2", "simplebench"];
/** Your benchmarks and weights: from a shared link first, else this browser, else a starter set. */
export function usePicks(scores: ScoreBench[]) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const known = new Set(scores.map((b) => b.id));
    const fromUrl = decodePicks(new URL(window.location.href).searchParams.get("yi"));
    let saved: Pick[] = [];
    try { saved = JSON.parse(localStorage.getItem(STORE) ?? "[]") as Pick[]; } catch { /* ignore */ }
    const start = (fromUrl.length ? fromUrl : saved.length ? saved : STARTER.map((id) => ({ id, w: 1 }))).filter((p) => known.has(p.id));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the link or this browser after hydration
    setPicks(start); setLoaded(true);
  }, [scores]);
  const update = useCallback((next: Pick[]) => { setPicks(next); try { localStorage.setItem(STORE, JSON.stringify(next)); } catch { /* private mode */ } }, []);
  return { picks, setPicks: update, loaded };
}

function BenchmarkChooser({ scores, picks, setPicks }: { scores: ScoreBench[]; picks: Pick[]; setPicks: (p: Pick[]) => void }) {
  const sel = useSelection();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useLightDismiss(root, useCallback(() => setOpen(false), []));
  const on = new Set(picks.map((p) => p.id));
  const s = q.trim().toLowerCase();
  const list = scores.filter((b) => sel.benchOk(b.access) && (!s || `${b.name} ${b.publisher} ${categoryLabel(b.category)}`.toLowerCase().includes(s)));
  const toggle = (id: string) => setPicks(on.has(id) ? picks.filter((p) => p.id !== id) : [...picks, { id, w: 1 }]);
  return (
    <div ref={root} className="oa-pwrap">
      <button type="button" className="oa-pbtn" aria-expanded={open} onClick={() => setOpen(!open)} title="Choose the benchmarks in your index"><IconStack2 size={15} stroke={1.6} aria-hidden="true" /><span>Benchmarks · <b>{picks.length}</b></span></button>
      {open && <div className="oa-picker" data-align="left" role="dialog" aria-label="Choose benchmarks" style={{ maxHeight: 460 }}>
        <div className="oa-ppad"><SearchBox value={q} onChange={setQ} placeholder="Search benchmarks, sources, categories" label="Search benchmarks" autoFocus /></div>
        <div className="oa-pscroll"><div className="oa-plist">
          {list.map((b) => { const ticked = on.has(b.id); return (
            <button key={b.id} type="button" role="checkbox" aria-checked={ticked} className="oa-pmodel" data-state={ticked ? "on" : "off"} onClick={() => toggle(b.id)} title={b.description}>
              <i className="oa-cb" data-state={ticked ? "on" : "off"} aria-hidden="true">{ticked && <IconCheck size={11} stroke={3} />}</i>
              <span>{b.name}{b.access === "closed" && <IconLock size={11} stroke={2} className="oa-lock" aria-label="Closed tasks" />}</span><small>{categoryLabel(b.category)} · {b.cells.length} models</small>
            </button>); })}
          {!list.length && <p className="oa-pnote">No benchmark matches.</p>}
        </div></div>
        <div className="oa-pfoot" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button type="button" onClick={() => setPicks([])} disabled={!picks.length}><IconX size={14} stroke={1.7} aria-hidden="true" />Clear</button>
          <button type="button" onClick={() => setPicks(STARTER.map((id) => ({ id, w: 1 })))}><IconRotate size={14} stroke={1.7} aria-hidden="true" />Starter set</button>
        </div>
      </div>}
    </div>
  );
}

export function BuildIndex({ scores }: { scores: ScoreBench[] }) {
  const sel = useSelection();
  const { picks, setPicks, loaded } = usePicks(scores);
  const [copied, setCopied] = useState(false);
  const svg = useRef<SVGSVGElement | null>(null);
  const byId = useMemo(() => new Map(scores.map((b) => [b.id, b])), [scores]);
  const models = sel.catalog.models;
  const blended = useMemo(() => blend(scores, picks), [scores, picks]);
  const visible = blended.filter((b) => { const m = models[b.model]; return m && sel.visible(m.id); });
  const bars: Bar[] = visible.map((b) => { const m = models[b.model]; return { key: m.id, modelId: m.id, name: m.name, labId: m.labId, effort: "default", value: +b.score.toFixed(1), releaseDate: m.releaseDate, tip: [`Results on ${b.have} of ${picks.length} benchmarks`] }; })
    .sort((a, b) => b.value - a.value).slice(0, sel.bars === "all" ? undefined : 15);
  const costBars: Bar[] = visible.filter((b) => b.cost != null).map((b) => { const m = models[b.model]; return { key: m.id, modelId: m.id, name: m.name, labId: m.labId, effort: "default", value: b.cost!, releaseDate: m.releaseDate }; })
    .sort((a, b) => a.value - b.value).slice(0, sel.bars === "all" ? undefined : 13);
  const points: Point[] = visible.filter((b) => b.cost != null && b.cost > 0).map((b) => { const m = models[b.model]; return { key: m.id, modelId: m.id, name: m.name, labId: m.labId, effort: "default", x: b.cost!, y: b.score }; });
  const share = () => {
    const url = new URL(window.location.href); url.searchParams.set("yi", encodePicks(picks)); url.hash = "your-index";
    navigator.clipboard?.writeText(url.toString()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }, () => {});
  };
  const setW = (id: string, w: number) => setPicks(picks.map((p) => (p.id === id ? { ...p, w } : p)));
  const total = picks.reduce((s, p) => s + p.w, 0) || 1;
  return (
    <div className="oa-stack">
      <ChartCard id="your-index" title="Your index" models
        desc="Pick benchmarks and weights; every model is scored on a 0–100 scale and averaged. Saved in this browser."
        info="Percent scores count as they are. Other units are scaled between the worst and best model. A model is averaged over the picked benchmarks it has results on."
        extra={<><BenchmarkChooser scores={scores} picks={picks} setPicks={setPicks} /><button type="button" className="oa-btn sm" onClick={share} disabled={!picks.length} title="Copy a link that opens this index"><IconLink size={14} stroke={1.7} aria-hidden="true" />{copied ? "Copied" : "Share"}</button></>}
        onPng={() => savePng(svg.current, "Your index")} onCsv={() => saveCsv("Your index", ["rank", "model", "score"], bars.map((b, i) => [i + 1, b.name, b.value]))}>
        <div className="oa-wchips" aria-label="Benchmarks and weights">
          {picks.map((p) => { const b = byId.get(p.id); return b && (
            <span key={p.id} className="oa-wchip" title={b.description}>
              <b>{b.name}</b><small>{Math.round((100 * p.w) / total)}%</small>
              <select aria-label={`Weight of ${b.name}`} value={p.w} onChange={(e) => setW(p.id, +e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>×{n}</option>)}</select>
              <button type="button" onClick={() => setPicks(picks.filter((x) => x.id !== p.id))} aria-label={`Remove ${b.name}`} title="Remove"><IconX size={12} stroke={2} /></button>
            </span>); })}
          {loaded && !picks.length && <span className="oa-muted">No benchmarks yet. Use “Benchmarks” to pick some.</span>}
        </div>
        <HBars bars={bars} rows={sel.bars === "all" ? 0 : 15} format={score} max={100} aria="Your index by model" svgRef={svg} empty={picks.length ? "No ticked model has results on these benchmarks." : "Pick benchmarks to build your index."} />
      </ChartCard>
      <div className="oa-grid2">
        <ChartCard title="Your index: cost per task" desc="Weighted like your index, from the results that report a cost · lower is better" models={false}>
          <HBars bars={costBars} rows={sel.bars === "all" ? 0 : 13} format={money} aria="Cost per task for your index" empty="None of these results reports a cost." />
        </ChartCard>
        <ChartCard title="Your index vs. cost" desc="Up and to the left is better" models={false}>
          <Scatter points={points} xName="Cost per task" yName="Your index" formatX={moneyAxis} height={350} log />
        </ChartCard>
      </div>
    </div>
  );
}

/* ---------- Capabilities ---------- */
export function Capabilities({ caps }: { caps: HomeData["caps"] }) {
  const [active, setActive] = useState(caps[0]?.id);
  const cap = caps.find((c) => c.id === active) ?? caps[0];
  if (!cap) return null;
  return (
    <div className="oa-stack">
      <div className="oa-tabs" role="tablist" aria-label="Capabilities">
        {caps.map((c) => <button key={c.id} type="button" role="tab" aria-selected={c.id === cap.id} title={c.description} onClick={() => setActive(c.id)}>{c.name}</button>)}
      </div>
      <BarCard key={cap.id} id={`cap-${cap.id}`} title={`${cap.name} index`} rows={cap.bars} better="higher" format={score} max={100} valueName={`${cap.name} index`}
        desc={<>{cap.description} Average of {cap.benchmarks.length} benchmarks.</>} />
      <div className="oa-blist">
        {cap.benchmarks.map((b) => (
          <Link key={b.id} href={`/benchmarks/${b.id}`} className="oa-bitem" title={b.description}>
            <b>{b.name}{b.access === "closed" && <IconLock size={11} stroke={2} className="oa-lock" aria-label="Closed tasks" />}</b>
            <small>{b.publisher} · {Math.round(b.share)}% of the index</small>
            <span>{b.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ---------- Cost and speed ---------- */
export function Cost({ cost }: { cost: HomeData["cost"] }) {
  return (
    <div className="oa-stack">
      <BarCard id="cost-per-task" title="Cost per task" rows={cost.bars} better="lower" format={money} axis={moneyAxis} canLog valueName="Cost per task (USD)"
        desc="What one Open Index task costs at API list prices · lower is better" info="Measured cost to finish a task, not token price: a model that thinks a lot can cost more per task even with a lower price per token." />
      <ScatterCard id="cost-vs-intelligence" title="Open Index vs. cost per task" points={cost.points} xName="Cost per task" yName="Open Index" formatX={moneyAxis} height={440}
        desc="Up and to the left is better" info="The dotted line joins the models nothing beats: no other model is both cheaper and better." />
    </div>
  );
}

export function Speed({ speed, latency }: { speed: Bar[]; latency: Bar[] }) {
  return (
    <div className="oa-grid2">
      <BarCard id="output-speed" title="Output speed" rows={speed} better="higher" format={rate} valueName="Tokens per second" desc="Tokens per second while answering · higher is better" info="Measured by Artificial Analysis on the model's own API." />
      {!!latency.length && <BarCard id="time-to-first-token" title="Time to first token" rows={latency} better="lower" format={secs} axis={secs} canLog valueName="Seconds"
        desc="Seconds until the first answer token · lower is better" info="Reasoning models think before they answer, so this includes thinking time." />}
    </div>
  );
}

/* ---------- Benchmarks ---------- */
export function decode(models: ChartModel[], c: BenchmarkChart): Bar[] {
  return c.points.map(([i, effort, value]) => { const m = models[i]; return { key: `${m.id}@${effort}`, modelId: m.id, name: m.name, labId: m.labId, effort, value, ...(m.releaseDate ? { releaseDate: m.releaseDate } : {}) }; });
}

function BenchCard({ c, bars }: { c: BenchmarkChart; bars: Bar[] }) {
  const sel = useSelection();
  const f = unitFormats(c.unit);
  const n = new Set(sel.rows(bars).map((b) => b.modelId)).size;
  return <BarCard small models={false} id={`b-${c.id}`} limit={8} rows={bars} better={c.higherIsBetter ? "higher" : "lower"} format={f.value} axis={f.axis} max={f.max} title={c.name} valueName={c.name}
    extra={<span className="oa-cnote" title="Models from your selection with a result here">{n} of {sel.shown.length}</span>}
    desc={<><Link href={`/benchmarks/${c.id}`}>{c.publisher}</Link> · {categoryLabel(c.category)}{c.access === "closed" && <> · <IconLock size={11} stroke={2} className="oa-lock" aria-label="Closed tasks" /> closed</>}{c.community && <span className="oa-badge">Community</span>}</>}
    info={c.description} />;
}

export function Benchmarks({ data, initial = 12 }: { data: HomeData["benchmarks"]; initial?: number }) {
  const sel = useSelection();
  const [cat, setCat] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const all = useMemo(() => data.charts.filter((c) => !c.community).map((c) => ({ c, bars: decode(data.models, c) })), [data]);
  // Cards stay put when the model selection changes (an empty card says so); only the Tasks filter removes them.
  const live = all.filter((x) => sel.benchOk(x.c.access));
  const cats = [...new Set(live.map((x) => x.c.category))].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  const shown = live.filter((x) => !cat || x.c.category === cat);
  return (
    <div className="oa-stack">
      <div className="oa-tabs" role="tablist" aria-label="Categories">
        <button type="button" role="tab" aria-selected={!cat} onClick={() => setCat(null)}>All <small>{live.length}</small></button>
        {cats.map((c) => <button key={c} type="button" role="tab" aria-selected={cat === c} title={categoryDescription(c)} onClick={() => setCat(c)}>{categoryLabel(c)}</button>)}
      </div>
      <p className="oa-muted oa-catdesc">{cat ? categoryDescription(cat) : "Every benchmark with results for at least eight recent models. Cards show the top 8 of your selection; open one for all results."}</p>
      {!live.length && <p className="oa-muted">No benchmark has results for the selected models. <button type="button" className="oa-link" onClick={sel.reset}>Reset the models</button></p>}
      <div className="oa-grid2">{(more ? shown : shown.slice(0, initial)).map((x) => <BenchCard key={x.c.id} {...x} />)}</div>
      {shown.length > initial && <div className="oa-center"><button type="button" className="oa-btn" onClick={() => setMore(!more)}>{more ? "Show fewer" : `Show all ${shown.length} benchmarks`}</button></div>}
    </div>
  );
}

/* ---------- Community ---------- */
export function Community({ data }: { data: HomeData["benchmarks"] }) {
  const list = useMemo(() => data.charts.filter((c) => c.community), [data]);
  const [at, setAt] = useState(list[0]?.id);
  const [q, setQ] = useState("");
  const c = list.find((x) => x.id === at) ?? list[0];
  const bars = useMemo(() => (c ? decode(data.models, c) : []), [c, data.models]);
  if (!c) return <div className="oa-card"><p className="oa-muted">No community benchmarks yet. <Link href="/contribute">Add the first one</Link>.</p></div>;
  const f = unitFormats(c.unit);
  const s = q.trim().toLowerCase();
  return (
    <div className="oa-comm">
      <BarCard key={c.id} id={`community-${c.id}`} title={c.name} rows={bars} better={c.higherIsBetter ? "higher" : "lower"} format={f.value} axis={f.axis} max={f.max} valueName={c.name}
        desc={<>By {c.publisher} · {categoryLabel(c.category)} · <Link href={`/benchmarks/${c.id}`}>All results</Link></>} info={c.description} />
      <aside className="oa-card oa-crail" aria-label="Community benchmarks">
        <h3>Community benchmarks <small>{list.length}</small></h3>
        <SearchBox value={q} onChange={setQ} placeholder="Search community benchmarks" label="Search community benchmarks" />
        <div className="oa-crlist">
          {list.filter((x) => !s || `${x.name} ${x.publisher}`.toLowerCase().includes(s)).map((x) => (
            <button key={x.id} type="button" aria-current={x.id === c.id || undefined} onClick={() => setAt(x.id)} title={x.description}>
              <b>{x.name}</b><small>{x.publisher} · {x.models} models</small>
            </button>
          ))}
        </div>
        <Link href="/contribute" className="oa-btn sm"><IconPlus size={14} stroke={1.8} aria-hidden="true" />Add a benchmark</Link>
      </aside>
    </div>
  );
}

export { Info };
