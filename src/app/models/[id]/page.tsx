import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { labColor, modelResults, snapshot } from "@/lib/data";
import { openIndexView, publisherOf } from "@/lib/views";
import { categoryLabel } from "@/lib/categories";

export function generateStaticParams() {
  return snapshot().models.filter((m) => modelResults(m.id).length).map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  return { title: snapshot().models.find((x) => x.id === id)?.name ?? "Model" };
}

const usd = (v?: number) => (v == null ? "–" : `$${v < 0.01 ? v.toFixed(4) : v < 1 ? v.toFixed(3) : v.toFixed(2)}`);

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const snap = snapshot();
  const model = snap.models.find((m) => m.id === id);
  if (!model) notFound();
  const index = openIndexView();
  const ranked = index.best.find((r) => r.model.id === id);
  const efforts = index.all.filter((r) => r.model.id === id);
  const results = modelResults(id).sort((a, b) => a.benchmark.category.localeCompare(b.benchmark.category) || a.benchmark.name.localeCompare(b.benchmark.name) || b.value - a.value);
  const lab = snap.labs.find((l) => l.id === model.labId)?.name ?? model.labId;
  return (
    <div className="oa-body no-side">
      <main className="oa-main">
        <section className="oa-hero">
          <p className="oa-crumb"><Link href="/models">Models</Link> / {lab}</p>
          <h1 className="mt-2"><span className="oa-dot" style={{ background: labColor(model.labId), width: 18, height: 18 }} />{model.name}</h1>
          <div className="oa-stats">
            <div><b>{ranked ? `#${ranked.rank}` : "–"}</b><span>Open Index rank</span></div>
            <div><b>{ranked ? ranked.score.toFixed(1) : "–"}</b><span>Open Index{ranked && ranked.variant.effort !== "default" ? ` (${ranked.variant.effort})` : ""}</span></div>
            <div><b>{usd(ranked?.costUsd)}</b><span>cost per task</span></div>
            <div><b>{ranked?.speed != null ? Math.round(ranked.speed) : "–"}</b><span>output tokens/s</span></div>
            <div><b>{model.releaseDate ?? "–"}</b><span>released</span></div>
            <div><b>{results.length}</b><span>results</span></div>
          </div>
          {ranked ? <p className="mt-5"><Link className="btn-quiet" href={`/?hl=${model.id}#intelligence`}>Highlight on the leaderboards</Link></p>
            : <p className="oa-lede mt-5">Not ranked: it lacks enough measured results on the Open Index benchmarks, or was released more than six months ago.</p>}
        </section>
        {efforts.length > 1 && (
          <section className="oa-section">
            <h2>By Reasoning Effort</h2>
            <div className="chart-panel oa-scroll">
              <table className="oa-table">
                <thead><tr><th>Effort</th><th className="num">Open Index</th><th className="num">Measured</th><th className="num">Cost / task</th></tr></thead>
                <tbody>{efforts.map((r) => <tr key={r.variant.id}><td>{r.variant.effort}</td><td className="num">{r.score.toFixed(1)}</td><td className="num">{Math.round(r.measuredShare * 100)}%</td><td className="num">{usd(r.costUsd)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        )}
        <section className="oa-section">
          <h2>All Results</h2>
          <p className="lede">{results.length} measured results, as published.</p>
          <div className="chart-panel oa-scroll">
            <table className="oa-table">
              <thead><tr><th>Benchmark</th><th>Category</th><th>Effort</th><th className="num">Score</th><th className="num">Cost / task</th><th>Source</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td><Link href={`/benchmarks/${r.benchmark.id}`}>{r.benchmark.name}</Link>{r.benchmark.community && <span className="oa-badge">community</span>}</td>
                    <td>{categoryLabel(r.benchmark.category)}</td>
                    <td>{r.effort === "default" ? "–" : r.effort}</td>
                    <td className="num">{r.benchmark.unit === "percent" ? `${r.value.toFixed(1)}%` : r.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="num">{usd(r.costUsd)}</td>
                    <td><a href={r.sourceUrl} rel="noreferrer">{publisherOf(r.benchmark)}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
