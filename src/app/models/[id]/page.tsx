import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconLock } from "@tabler/icons-react";
import { ModelRadar } from "@/components/oa/ModelRadar";
import { Info } from "@/components/oa/Bars";
import type { Benchmark } from "@/data/types";
import { modelFacts, modelResults, snapshot } from "@/lib/data";
import { accessOf, catalog, openIndexView, publisherOf } from "@/lib/views";
import { benchmarkRanks, capabilityScores } from "@/lib/bars";
import { categoryDescription, categoryLabel } from "@/lib/categories";
import { labDot } from "@/lib/lab-colors";
import { date, money, rate } from "@/lib/format";
import { reasoningEffortChips } from "@/lib/filters";

export function generateStaticParams() {
  return snapshot().models.filter((m) => modelResults(m.id).length).map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  const m = snapshot().models.find((x) => x.id === id);
  const top = openIndexView().best.find((r) => r.model.id === id);
  return { title: m?.name ?? "Model", description: m && top ? `${m.name} ranks #${top.rank} on the Open Index with ${top.score.toFixed(1)}. Every benchmark result, by reasoning level.` : m ? `How ${m.name} scores on every benchmark Open Analysis tracks.` : undefined };
}

const tokens = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${n}`);
function fmt(b: Benchmark, v: number) {
  if (b.unit === "percent") return `${v.toFixed(1)}%`;
  if (b.unit === "usd") return money(v);
  if (b.unit === "seconds") return `${v.toFixed(v >= 10 ? 0 : 1)} s`;
  return v.toFixed(b.unit === "elo" ? 0 : 1);
}
const ORDER = ["composite", "coding", "agentic", "reasoning", "math", "knowledge", "economics", "long-context", "instruction", "safety", "creative", "other", "cost", "speed", "reliability"];

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const snap = snapshot();
  const model = snap.models.find((m) => m.id === id);
  if (!model) notFound();
  const index = openIndexView();
  const ranked = index.best.find((r) => r.model.id === id);
  const cat = catalog().models.find((m) => m.id === id);
  const lab = snap.labs.find((l) => l.id === model.labId)?.name ?? model.labId;
  const facts = modelFacts(id);
  const { axes, byModel, ranks } = capabilityScores();
  const ranksOn = benchmarkRanks();
  // Best result per benchmark, grouped by category.
  const best = new Map<string, ReturnType<typeof modelResults>[number]>();
  for (const r of modelResults(id)) {
    const cur = best.get(r.benchmark.id);
    if (!cur || (r.benchmark.higherIsBetter ? r.value > cur.value : r.value < cur.value)) best.set(r.benchmark.id, r);
  }
  const groups = new Map<string, ReturnType<typeof modelResults>>();
  for (const r of best.values()) (groups.get(r.benchmark.category) ?? groups.set(r.benchmark.category, []).get(r.benchmark.category)!).push(r);
  const cats = [...groups.keys()].sort((a, b) => (ORDER.indexOf(a) + 99 * Number(!ORDER.includes(a))) - (ORDER.indexOf(b) + 99 * Number(!ORDER.includes(b))));
  const levels = reasoningEffortChips([...new Set(snap.variants.filter((v) => v.modelId === id).map((v) => v.effort))]).filter((e) => e !== "default");
  const kpis: [string, React.ReactNode, string?][] = [
    ["Open Index", ranked ? <>{ranked.score.toFixed(1)} <small>#{ranked.rank} of {index.best.length}</small></> : "Not ranked", ranked ? `Best at ${ranked.variant.effort}. Results on ${Math.round(ranked.measuredShare * index.benchmarks.length)} of ${index.benchmarks.length} index benchmarks.` : "Too few results on the index benchmarks, or released more than a year ago."],
    ["Cost per task", cat?.cost != null ? money(cat.cost) : "–", "API cost of one Open Index task at the best level."],
    ["Output speed", cat?.speed != null ? `${rate(cat.speed)} tok/s` : "–"],
    ["Results", `${best.size} benchmarks`],
    ["Weights", facts?.openWeights == null ? "–" : facts.openWeights ? `Open${facts.license ? ` · ${facts.license}` : ""}` : "Proprietary"],
    ["Context window", facts?.contextTokens ? `${tokens(facts.contextTokens)} tokens` : "–"],
    ["API price", facts?.priceInPerM != null && facts.priceOutPerM != null ? `${money(facts.priceInPerM)} in · ${money(facts.priceOutPerM)} out` : "–", "Per million tokens."],
    ...(facts?.paramsB ? [["Parameters", `${facts.paramsB}B${facts.activeParamsB ? ` (${facts.activeParamsB}B active)` : ""}`] as [string, string]] : []),
  ];
  const caps = byModel[id] ?? {};
  return (
    <div className="oa-body no-side">
      <main className="oa-main oa-mpage">
        <section className="oa-bhead">
          <p className="oa-crumb"><Link href="/models">Models</Link> / {lab}</p>
          <h1><span className="oa-dot" style={{ ...labDot(model.labId), width: 14, height: 14 }} />{model.name}</h1>
          <p>{lab}{model.releaseDate ? ` · released ${date(model.releaseDate)}` : ""}{levels.length ? <> · reasoning levels <span className="oa-lchips">{levels.map((e) => <span key={e} data-best={e === ranked?.variant.effort || undefined}>{e}</span>)}</span></> : ""}
            {" · "}<Link href={`/compare?c=${encodeURIComponent(id)}`}>Compare with other models</Link></p>
        </section>
        <dl className="oa-facts2">{kpis.map(([k, v, tip]) => <div key={k}><dt>{k}{tip && <Info text={tip} />}</dt><dd>{v}</dd></div>)}</dl>
        {Object.keys(caps).length > 0 && <div className="oa-card">
          <div className="oa-chead"><div className="oa-ctitle"><h3>Capabilities</h3><p>Score on each capability index, and the model&apos;s place among {index.best.length > 0 ? "the ranked models" : "all models"}</p></div></div>
          <div className="oa-capgrid">
            <ModelRadar axes={axes} id={id} name={model.name} labId={model.labId} values={caps} />
            <div className="oa-caplist">
              {axes.map((a) => { const v = caps[a.id], rk = ranks[id]?.[a.id]; return (
                <div key={a.id} className="oa-caprow" title={categoryDescription(a.id.replace(/^cap-/, ""))}>
                  <span>{a.name}</span>
                  <i><b style={{ width: `${v ?? 0}%`, ...labDot(model.labId) }} className="oa-capfill" /></i>
                  <strong>{v != null ? v.toFixed(1) : "–"}</strong>
                  <small>{rk ? `#${rk[0]} of ${rk[1]}` : "no score"}</small>
                </div>); })}
            </div>
          </div>
        </div>}
        {cats.map((c) => (
          <div key={c} className="oa-card" id={`results-${c}`}>
            <div className="oa-chead"><div className="oa-ctitle"><h3>{categoryLabel(c)} <small className="oa-muted">{groups.get(c)!.length}</small></h3><p>{categoryDescription(c)}</p></div></div>
            <div className="oa-scroll">
              <table className="oa-table">
                <thead><tr><th>Benchmark</th><th>Publisher</th><th>Level</th><th className="num">Score</th><th className="num">Rank</th><th className="num">Cost / task</th></tr></thead>
                <tbody>
                  {groups.get(c)!.sort((a, b) => (ranksOn.get(b.benchmark.id)?.size ?? 0) - (ranksOn.get(a.benchmark.id)?.size ?? 0)).map((r) => { const rk = ranksOn.get(r.benchmark.id)?.get(id); return (
                    <tr key={r.benchmark.id}>
                      <td><Link href={`/benchmarks/${r.benchmark.id}`} title={r.benchmark.description}>{r.benchmark.name}</Link>{accessOf(r.benchmark.id) === "closed" && <IconLock size={11} stroke={2} className="oa-lock" aria-label="Closed tasks" />}{r.benchmark.community && <span className="oa-badge">Community</span>}</td>
                      <td className="oa-muted">{publisherOf(r.benchmark)}</td>
                      <td>{r.effort === "default" ? "–" : r.effort}</td>
                      <td className="num"><a href={r.sourceUrl} rel="noreferrer" title="Where this result was published">{fmt(r.benchmark, r.value)}</a></td>
                      <td className="num">{rk ? <>#{rk[0]} <small className="oa-muted">of {rk[1]}</small></> : "–"}</td>
                      <td className="num">{r.costUsd != null ? money(r.costUsd) : "–"}</td>
                    </tr>); })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
