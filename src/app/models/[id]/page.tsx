import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { labColor, modelResults, openIndexRows, snapshot, sourceName } from "@/lib/data";
import { effortLabel, num, usd } from "@/lib/format";

export function generateStaticParams() {
  return snapshot().models.filter((m) => modelResults(m.id).length).map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  const m = snapshot().models.find((x) => x.id === id);
  return { title: m?.name ?? "Model" };
}

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const snap = snapshot();
  const model = snap.models.find((m) => m.id === id);
  if (!model) notFound();
  const rows = openIndexRows();
  const ranked = rows.best.find((r) => r.modelId === id);
  const efforts = rows.all.filter((r) => r.modelId === id);
  const results = modelResults(id).sort((a, b) => a.benchmark.category.localeCompare(b.benchmark.category) || a.benchmark.name.localeCompare(b.benchmark.name) || b.value - a.value);
  const lab = snap.labs.find((l) => l.id === model.labId)?.name ?? model.labId;
  return (
    <main>
      <section>
        <p className="cap"><Link href="/models">Models</Link> / {lab}</p>
        <h1><span className="dot" style={{ background: labColor(model.labId), width: 16, height: 16 }} />{model.name}</h1>
        <div className="stat-row">
          <div className="stat"><b>{ranked ? `#${ranked.rank}` : "–"}</b><span>Open Index rank</span></div>
          <div className="stat"><b>{ranked ? ranked.score.toFixed(1) : "–"}</b><span>Open Index{ranked && effortLabel(ranked.effort) ? ` (${ranked.effort})` : ""}</span></div>
          <div className="stat"><b>{usd(ranked?.costPerTask)}</b><span>cost per task</span></div>
          <div className="stat"><b>{num(ranked?.speed)}</b><span>output tokens/s</span></div>
          <div className="stat"><b>{model.releaseDate ?? "–"}</b><span>released</span></div>
        </div>
        {!ranked && <p className="lede">Not ranked: it lacks enough measured results on the Open Index benchmarks, or was released more than six months ago.</p>}
      </section>
      {efforts.length > 1 && (
        <section className="panel">
          <header><h2 className="mark">By reasoning effort</h2></header>
          <table className="data">
            <thead><tr><th>Effort</th><th className="num">Open Index</th><th className="num">Cost / task</th></tr></thead>
            <tbody>{efforts.map((r) => <tr key={r.variantId}><td>{r.effort}</td><td className="num">{r.score.toFixed(1)}</td><td className="num">{usd(r.costPerTask)}</td></tr>)}</tbody>
          </table>
        </section>
      )}
      <section className="panel scroll">
        <header><h2 className="mark">All results</h2></header>
        <p className="sub">{results.length} measured results, as published.</p>
        <table className="data">
          <thead><tr><th>Benchmark</th><th>Category</th><th>Effort</th><th className="num">Score</th><th className="num">Cost / task</th><th>Source</th></tr></thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td><Link href={`/benchmarks/${r.benchmark.id}`}>{r.benchmark.name}</Link>{r.benchmark.community && <span className="badge">community</span>}</td>
                <td>{r.benchmark.category}</td>
                <td>{effortLabel(r.effort) || "–"}</td>
                <td className="num">{num(r.value, r.benchmark.unit === "percent" ? 1 : 0)}{r.benchmark.unit === "percent" ? "%" : ""}</td>
                <td className="num">{usd(r.costUsd)}</td>
                <td><a href={r.sourceUrl} rel="noreferrer">{sourceName(r.benchmark)}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
