import Link from "next/link";
import { Bars, Scatter, type Point } from "@/components/Chart";
import { OPEN_INDEX, benchmarkById, openIndexRows, snapshot, type IndexRow } from "@/lib/data";
import { effortLabel, num, pct, usd } from "@/lib/format";

const label = (r: IndexRow) => `${r.name}${effortLabel(r.effort) ? ` (${r.effort})` : ""}`;
const point = (r: IndexRow, x: number | undefined, y: number): Point => ({ id: r.variantId, name: r.name, label: label(r), color: r.color, x, y, href: `/models/${r.modelId}` });

export default function Home() {
  const snap = snapshot();
  const { best } = openIndexRows();
  const top = best.slice(0, 20);
  const cost = best.filter((r) => r.costPerTask != null).slice(0, 30);
  const speed = best.filter((r) => r.speed != null).slice(0, 30);
  const fastest = [...speed].sort((a, b) => b.speed! - a.speed!).slice(0, 20);
  const community = snap.benchmarks.filter((b) => b.community);
  const parts = OPEN_INDEX.benchmarks.map((b) => benchmarkById(b.id)).filter((b) => b != null);

  return (
    <main>
      <section>
        <h1>AI model leaderboard</h1>
        <p className="lede">Independent rankings from public and community benchmarks. Every number links to its source, and the index is a JSON file anyone can change by pull request.</p>
        <div className="stat-row">
          <div className="stat"><b>{best.length}</b><span>models ranked</span></div>
          <div className="stat"><b>{snap.benchmarks.length}</b><span>benchmarks</span></div>
          <div className="stat"><b>{community.length}</b><span>community benchmarks</span></div>
          <div className="stat"><b>{snap.observations.length.toLocaleString()}</b><span>results</span></div>
        </div>
      </section>

      <section className="panel">
        <header><h2 className="mark">{OPEN_INDEX.name}</h2><span className="cap">v{OPEN_INDEX.version}</span></header>
        <p className="sub">Equal-weight average of {parts.length} benchmarks: {parts.map((b) => b.name).join(", ")}. <Link href="/methodology">Methodology</Link></p>
        <Bars points={top.map((r) => point(r, undefined, r.score))} />
      </section>

      <div className="grid2">
        <section className="panel">
          <header><h2 className="mark">Intelligence vs. cost</h2></header>
          <p className="sub">Open Index against measured cost per task, averaged across index benchmarks that publish run costs.</p>
          <Scatter points={cost.map((r) => point(r, r.costPerTask, r.score))} xName="Cost per task (log)" yName="Open Index" logX xUnit="$" />
        </section>
        <section className="panel">
          <header><h2 className="mark">Intelligence vs. speed</h2></header>
          <p className="sub">Output tokens per second, median across OpenRouter providers.</p>
          <Scatter points={speed.map((r) => point(r, r.speed, r.score))} xName="Output tokens/s" yName="Open Index" higherXIsBetter />
        </section>
      </div>

      <section className="panel">
        <header><h2 className="mark">Output speed</h2></header>
        <p className="sub">Tokens per second from OpenRouter, for the top-ranked models.</p>
        <Bars points={fastest.map((r) => point(r, undefined, r.speed!))} />
      </section>

      <section className="panel">
        <header><h2 className="mark">Leaderboard</h2></header>
        <p className="sub">Best reasoning effort per model. Measured share is how much of the index weight has real results; the rest is estimated from close peers.</p>
        <div className="scroll">
          <table className="data">
            <thead><tr><th>#</th><th>Model</th><th>Lab</th><th className="num">Open Index</th><th className="num">Measured</th><th className="num">Cost / task</th><th className="num">Tokens/s</th><th className="num">Latency</th><th>Released</th></tr></thead>
            <tbody>
              {best.map((r) => (
                <tr key={r.variantId}>
                  <td>{r.rank}</td>
                  <td><span className="dot" style={{ background: r.color }} /><Link href={`/models/${r.modelId}`}>{r.name}</Link><span className="effort">{effortLabel(r.effort)}</span></td>
                  <td>{r.labName}</td>
                  <td className="num"><b>{r.score.toFixed(1)}</b></td>
                  <td className="num">{pct(r.coverage)}</td>
                  <td className="num">{usd(r.costPerTask)}</td>
                  <td className="num">{num(r.speed)}</td>
                  <td className="num">{r.latency != null ? `${r.latency.toFixed(1)}s` : "–"}</td>
                  <td>{r.releaseDate ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
