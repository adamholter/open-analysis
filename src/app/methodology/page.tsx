import type { Metadata } from "next";
import Link from "next/link";
import { Toc } from "@/components/oa/Toc";
import { OPEN_INDEX, benchmarkById, benchmarkRows, snapshot } from "@/lib/data";
import { REPO } from "@/lib/site";
import { categoryLabel } from "@/lib/categories";
import { capabilityIndexes, publisherOf } from "@/lib/views";

export const metadata: Metadata = { title: "Methodology" };

const SECTIONS = [
  { id: "what", label: "What this is" },
  { id: "index", label: "The Open Index" },
  { id: "score", label: "How a score is made" },
  { id: "missing", label: "Missing results" },
  { id: "levels", label: "Reasoning levels" },
  { id: "capabilities", label: "Capability indexes" },
  { id: "your-index", label: "Your index" },
  { id: "cost", label: "Cost per task" },
  { id: "speed", label: "Speed" },
  { id: "tasks", label: "Public and closed tasks" },
  { id: "community", label: "Community benchmarks" },
  { id: "sources", label: "Where the data comes from" },
  { id: "limits", label: "Limits" },
];

export default function Methodology() {
  const snap = snapshot();
  const total = OPEN_INDEX.benchmarks.reduce((s, b) => s + b.weight, 0);
  const caps = capabilityIndexes();
  return (
    <div className="oa-body">
      <Toc items={SECTIONS} />
      <main className="oa-main">
        <article className="oa-prose" style={{ paddingBottom: "45vh" }}>
          <h1 style={{ fontSize: 34, color: "var(--ink)" }}>Methodology</h1>
          <p>How every number on this site is made, and where it comes from. Data as of {snap.date}.</p>

          <h2 id="what">What this is</h2>
          <p>Open Analysis puts the public benchmarks for AI models in one place: Artificial Analysis, labs, independent researchers, and benchmarks the community adds by pull request. It ranks models on a fixed, open index, and lets you mix your own. Every result links to the page it was published on.</p>

          <h2 id="index">The Open Index</h2>
          <p>The {OPEN_INDEX.name} (v{OPEN_INDEX.version}) is a weighted average of {OPEN_INDEX.benchmarks.length} independent benchmarks. The list and weights live in <a href={`${REPO}/blob/main/open-index.json`}><code>open-index.json</code></a>; changing them takes a pull request.</p>
          <div className="oa-scroll">
            <table className="oa-table">
              <thead><tr><th>Benchmark</th><th>Publisher</th><th>Category</th><th className="num">Weight</th><th className="num">Models</th></tr></thead>
              <tbody>{OPEN_INDEX.benchmarks.map((x) => { const b = benchmarkById(x.id); return (
                <tr key={x.id}><td>{b ? <Link href={`/benchmarks/${x.id}`}>{b.name}</Link> : x.id}</td><td>{b ? publisherOf(b) : "–"}</td><td>{b ? categoryLabel(b.category) : "–"}</td><td className="num">{Math.round((100 * x.weight) / total)}%</td><td className="num">{benchmarkRows(x.id).length}</td></tr>); })}</tbody>
            </table>
          </div>

          <h2 id="score">How a score is made</h2>
          <ol>
            <li><b>The ranked unit is a model at one reasoning level.</b> Charts show each model at its best level by default; the model picker can show every level.</li>
            <li><b>Scores are used as published.</b> Percentages stay percentages. Elo ratings become a win rate against the median model. Nothing is stretched so the leader reads 100.</li>
            <li><b>Coverage floor.</b> A model is ranked only when measured results cover at least {OPEN_INDEX.strictness}% of the index weight.</li>
            <li><b>Recent models.</b> Charts start with models released in the last three months. The picker&apos;s Released filter widens that to six months or a year. Scores don&apos;t change with the filter.</li>
          </ol>

          <h2 id="missing">Missing results</h2>
          <p>Few models have a result on every index benchmark. Today the engine fills a missing result from the same model at another reasoning level, calibrated on benchmarks where both were measured, and otherwise from models released around the same time. Filled values never count toward the coverage floor.</p>
          <p>Hover a bar to see how many of the {OPEN_INDEX.benchmarks.length} index results are measured. The model picker&apos;s <b>Coverage</b> filter hides models with fewer measured results than you choose. We are reviewing which benchmarks belong in the index so that most models are fully measured and nothing needs filling.</p>

          <h2 id="levels">Reasoning levels</h2>
          <p>Many models can think longer before they answer: none, minimal, low, medium, high, xhigh and max. Each level is measured separately. Under every bar, the second line names the level. The picker&apos;s <b>Levels allowed</b> filter decides which levels count on every chart (no reasoning is off by default), and <b>Reasoning levels</b> switches between one bar per model and one bar per level.</p>

          <h2 id="capabilities">Capability indexes</h2>
          <p>Each capability index averages the best-covered benchmarks in one category, at most two per publisher, with the same rules as the Open Index. Today there are {caps.length}: {caps.map((c) => c.name.replace(/ Index$/, "")).join(", ")}.</p>

          <h2 id="your-index">Your index</h2>
          <p>On the overview you can pick benchmarks and weights. Percentages count as they are; other units are scaled from the worst to the best model with a result. A model is averaged over the picked benchmarks it has results on, and the tooltip says how many. Your picks stay in your browser; Share copies a link that opens them.</p>

          <h2 id="cost">Cost per task</h2>
          <p>Cost per task is the measured cost to run one Open Index task at API list prices (Artificial Analysis), not the price per token. A model that thinks a lot can cost more per task even with a lower token price. Benchmark pages show the cost each publisher reports for its own runs. Pricing by subscription plans is planned for later.</p>

          <h2 id="speed">Speed</h2>
          <p>Output speed (tokens per second) and time to first token come from Artificial Analysis, measured on each lab&apos;s own API. Time to first token includes thinking time for reasoning models.</p>

          <h2 id="tasks">Public and closed tasks</h2>
          <p>Some benchmarks publish their questions; others keep the scored set private so it can&apos;t leak into training data. The picker&apos;s <b>Tasks</b> filter and the lock icon use <a href={`${REPO}/blob/main/config/task-access.json`}><code>config/task-access.json</code></a>. Benchmarks not listed there show only under All.</p>

          <h2 id="community">Community benchmarks</h2>
          <p>Anyone can add a benchmark with one pull request: a short description and a CSV of results. A check validates model names, levels and values on every pull request, and a maintainer merges it. Community benchmarks carry a badge. Joining the Open Index is a separate pull request. <Link href="/contribute">How to add one</Link>.</p>

          <h2 id="sources">Where the data comes from</h2>
          <p>Public benchmarks are collected by the open-source scrapers in <a href="https://github.com/adamholter/priors">Priors</a>, which run every two hours. Open Analysis takes that snapshot and adds every benchmark in <code>community/</code>. The ranking engine is shared with Priors.</p>

          <h2 id="limits">Limits</h2>
          <ul>
            <li>Publishers run models with different harnesses, prompts and dates; a result is only as comparable as its source says.</li>
            <li>Model names are matched across sources by an alias list; a wrong match is a bug, please report it.</li>
            <li>A benchmark with few models can move a capability index a lot.</li>
          </ul>
        </article>
      </main>
    </div>
  );
}
