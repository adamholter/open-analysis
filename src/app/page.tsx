import Link from "next/link";
import { CostChart, IndexBars, MetricCard } from "@/components/oa/Charts";
import { BenchmarkGrid, CapabilityTabs } from "@/components/oa/Tabs";
import { SideNav } from "@/components/oa/SideNav";
import { Leaderboard } from "@/components/oa/Leaderboard";
import { FilterBar, FiltersProvider } from "@/components/oa/Filters";
import { OPEN_INDEX, snapshot } from "@/lib/data";
import { benchmarkCharts, capabilityIndexes, labs, metricViews, openIndexView, openness, pickerData, providers } from "@/lib/views";

const SECTIONS = [
  { id: "intelligence", label: "Intelligence" },
  { id: "capabilities", label: "Capability Indexes" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "openness", label: "Open Weights" },
  { id: "tokens", label: "Output Tokens" },
  { id: "cost-section", label: "Cost" },
  { id: "speed", label: "Speed & Latency" },
  { id: "providers", label: "Providers" },
  { id: "trends", label: "Trends" },
  { id: "leaderboard", label: "All Models" },
];

export default function Home() {
  const snap = snapshot();
  const L = labs();
  const index = openIndexView();
  const metrics = metricViews();
  const panel = (id: string) => metrics.panels.find((p) => p.id === id);
  const { charts, models: chartModels } = benchmarkCharts();
  const community = charts.filter((c) => c.community);
  const open = openness();
  const prov = providers();
  const tokens = panel("tokens"), latency = panel("latency"), tpt = panel("tpt"), uptime = panel("uptime"), date = panel("date"), usage = panel("usage");
  const taskSeconds = Object.fromEntries((tpt?.points ?? []).map((p) => [p.r.variant.id, p.raw ?? p.x]));
  const picker = pickerData();

  return (
    <FiltersProvider asOf={picker.asOf} models={picker.models} efforts={picker.efforts} dates={picker.dates}>
    <div className="oa-body">
      <SideNav items={SECTIONS} />
      <main className="oa-main">
        <section className="oa-hero">
          <h1>Independent analysis of AI models</h1>
          <p className="oa-lede mt-3">Rankings from {snap.benchmarks.length} public and community benchmarks. Every number links to where it was published, and the index is a JSON file anyone can change by pull request.</p>
          <div className="oa-stats">
            <div><b>{index.best.length}</b><span>models ranked</span></div>
            <div><b>{snap.models.filter((m) => m.kind === "llm").length}</b><span>models tracked</span></div>
            <div><b>{snap.benchmarks.length}</b><span>benchmarks</span></div>
            <div><b>{community.length}</b><span>community benchmarks</span></div>
            <div><b>{snap.observations.length.toLocaleString()}</b><span>results</span></div>
          </div>
          <FilterBar labs={L} />
        </section>

        <section id="intelligence" className="oa-section">
          <h2>Intelligence</h2>
          <div className="chart-panel">
            <IndexBars title={`${OPEN_INDEX.name}`} all={index.all} labs={L} more={{ href: "#leaderboard", label: "all models in the table below" }}
              desc={<>Equal-weight average of {index.benchmarks.length} independent benchmarks: {index.benchmarks.map((b, n) => <span key={b.id}>{n ? ", " : ""}<Link href={`/benchmarks/${b.id}`}>{b.name}</Link></span>)} · Missing results may use peer estimates · Higher is better · <Link href="/methodology">Methodology</Link></>} />
          </div>
          <div className="chart-panel">
            <CostChart title="Intelligence vs. Cost per Task" all={index.all} labs={L} desc="Open Index against measured cost per task, log scale. The shaded area is cheaper and smarter than the median." />
          </div>
          {tpt && <div className="chart-panel">
            <MetricCard chart="tpt" title="Intelligence vs. Time per Task" desc={tpt.desc} pts={tpt.points} labs={L} />
          </div>}
        </section>

        <section id="capabilities" className="oa-section">
          <h2>Capability Indexes</h2>
          <p className="lede">How models perform in specific domains. Each index averages the best-covered benchmarks in its category.</p>
          <CapabilityTabs indexes={capabilityIndexes()} labs={L} />
        </section>

        <section id="benchmarks" className="oa-section">
          <h2>Benchmarks</h2>
          <p className="lede">Every benchmark with results for at least eight models released in the last year, including {community.length} from the community. Follows the filters above. <Link href="/contribute" className="underline">Add yours</Link>.</p>
          <BenchmarkGrid charts={charts} models={chartModels} labs={L} initial={12} />
        </section>

        <section id="openness" className="oa-section">
          <h2>Open Weights</h2>
          <p className="lede">{open.open.length} of the {open.open.length + open.closed.length} ranked models with known licensing publish their weights. The best open model scores {open.open[0] ? `${open.open[0].score.toFixed(0)} (${open.open[0].model.name})` : "–"} against {open.closed[0] ? `${open.closed[0].score.toFixed(0)} (${open.closed[0].model.name})` : "–"} for the best proprietary one.</p>
          <div className="chart-panel">
            <IndexBars title="Open Index: open-weights models" all={open.openAll} labs={L} height={380} desc="Open weights per Artificial Analysis model metadata · best effort per model" />
          </div>
        </section>

        {tokens && <section id="tokens" className="oa-section">
          <h2>Output Tokens</h2>
          <p className="lede">Tokens generated per Intelligence Index task, including reasoning. More tokens means slower and costlier answers.</p>
          <div className="chart-panel"><MetricCard chart="tokens" title="Output Tokens per Task" desc={tokens.desc} pts={tokens.points} labs={L} /></div>
        </section>}

        <section id="cost-section" className="oa-section">
          <h2>Cost</h2>
          <p className="lede">Measured cost to complete a task, not token price. Reasoning-heavy models can cost more per task even at lower list prices.</p>
          <div className="chart-panel"><MetricCard chart="costBars" title="Cost per Task" desc="Measured cost per task in USD · lower is better" pts={metrics.cost} labs={L} /></div>
        </section>

        <section id="speed" className="oa-section">
          <h2>Speed &amp; Latency</h2>
          <p className="lede">How long a task takes is on the leaderboard above (Time per Task). Raw token rates and first-token latency are shown here for reference; a fast token rate does not mean a fast answer once reasoning is counted.</p>
          <div className="oa-grid2">
            <div className="chart-panel"><MetricCard chart="speed" title="Output Speed" desc="Output tokens per second · higher is better" pts={metrics.speed} labs={L} height={380} /></div>
            {latency && <div className="chart-panel"><MetricCard chart="latency" title="Latency" desc="Seconds to first token · lower is better" pts={latency.points} labs={L} height={380} /></div>}
          </div>
        </section>

        <section id="providers" className="oa-section">
          <h2>Providers</h2>
          <p className="lede">How many API providers serve each model on OpenRouter, and how reliably.</p>
          <div className="oa-grid2">
            {prov.length >= 3 && <div className="chart-panel"><MetricCard chart="providers" title="API Providers" desc="Providers on OpenRouter · more is better" pts={prov} labs={L} height={380} /></div>}
            {uptime && <div className="chart-panel"><MetricCard chart="uptime" title="Uptime" desc={uptime.desc} pts={uptime.points} labs={L} height={380} /></div>}
          </div>
          {usage && <div className="chart-panel"><MetricCard chart="usage" title="Usage" desc={usage.desc} pts={usage.points} labs={L} /></div>}
        </section>

        {date && <section id="trends" className="oa-section">
          <h2>Trends</h2>
          <p className="lede">Open Index score by release date, every reasoning effort. Turn on the frontier in the chart settings to trace the best model at each point.</p>
          <div className="chart-panel"><MetricCard chart="date" title="Intelligence over Time" desc="Release date vs. Open Index" pts={date.points} labs={L} /></div>
        </section>}

        <section id="leaderboard" className="oa-section">
          <h2>All Models</h2>
          <p className="lede">Best reasoning effort per model, for the models and window picked above. Measured is the share of index weight backed by real results; the rest is estimated from close peers.</p>
          <Leaderboard all={index.all} labs={L} seconds={taskSeconds} />
        </section>
      </main>
    </div>
    </FiltersProvider>
  );
}
