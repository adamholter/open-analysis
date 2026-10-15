import type { Metadata } from "next";
import Link from "next/link";
import { OPEN_INDEX, benchmarkById, benchmarkRows } from "@/lib/data";
import { REPO } from "@/lib/site";
import { categoryLabel } from "@/lib/categories";

export const metadata: Metadata = { title: "Methodology" };

export default function Methodology() {
  const total = OPEN_INDEX.benchmarks.reduce((s, b) => s + b.weight, 0);
  return (
    <div className="oa-body no-side">
    <main className="oa-main">
      <section className="oa-prose">
        <h1>Methodology</h1>
        <p className="oa-lede">The {OPEN_INDEX.name} is a weighted average of independent benchmarks. The weights live in <a href={`${REPO}/blob/main/open-index.json`}><code>open-index.json</code></a>; changing them takes a pull request and a public discussion.</p>
      </section>
      <section className="chart-panel oa-scroll">
        <div className="flex items-baseline gap-3 mb-3"><h2 className="text-[22px]">Components</h2><span className="cap">v{OPEN_INDEX.version}</span></div>
        <table className="oa-table">
          <thead><tr><th>Benchmark</th><th>Category</th><th className="num">Weight</th><th className="num">Models</th></tr></thead>
          <tbody>
            {OPEN_INDEX.benchmarks.map((x) => {
              const b = benchmarkById(x.id);
              return <tr key={x.id}><td>{b ? <Link href={`/benchmarks/${x.id}`}>{b.name}</Link> : x.id}</td><td>{b ? categoryLabel(b.category) : "–"}</td><td className="num">{Math.round((100 * x.weight) / total)}%</td><td className="num">{benchmarkRows(x.id).length}</td></tr>;
            })}
          </tbody>
        </table>
      </section>
      <section className="oa-prose">
        <h2>How a score is computed</h2>
        <ol>
          <li><b>The ranked unit is a model at one reasoning effort.</b> The leaderboard shows each model&apos;s best effort; model pages show the rest.</li>
          <li><b>Scores are used as published.</b> Percentages stay percentages. Elo ratings become win rate against the median model. Nothing is stretched so the leader reads 100.</li>
          <li><b>Coverage floor.</b> A model is ranked only when measured results cover at least {OPEN_INDEX.strictness}% of the index weight.</li>
          <li><b>Small gaps are estimated.</b> A missing effort is filled from the same model&apos;s other efforts, calibrated on benchmarks where both were measured. Remaining gaps come from peers released around the same time. Estimates never count toward the coverage floor.</li>
          <li><b>Recent models only.</b> The leaderboard covers models released in the last six months.</li>
          <li><b>Cost per task</b> is measured cost to run a task (Artificial Analysis), never token price.</li>
          <li><b>Time per task</b> is the speed measure we lead with: how long a task takes end to end, reasoning included (Artificial Analysis). Output speed (tokens per second) and latency are secondary, since fast tokens can still mean a slow answer. Providers and uptime come from OpenRouter.</li>
          <li><b>Capability indexes</b> average the six best-covered benchmarks in each category, at most two per publisher, with the same rules.</li>
        </ol>
        <h2>Where the data comes from</h2>
        <p>Public benchmarks are collected by the open-source scrapers in <a href="https://github.com/adamholter/priors">Priors</a>, which run every two hours. Open Analysis takes that snapshot, and adds every benchmark in <code>community/</code>. Results link to the page they came from.</p>
        <p>The engine is shared with Priors, which lets anyone build a custom index with their own weights.</p>
      </section>
    </main>
    </div>
  );
}
