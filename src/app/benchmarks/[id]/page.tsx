import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BenchmarkBars } from "@/components/oa/Charts";
import { OPEN_INDEX, benchmarkById, benchmarkRows, labColor, snapshot } from "@/lib/data";
import { benchmarkPoints, labs, publisherOf } from "@/lib/views";
import { categoryLabel } from "@/lib/categories";

export function generateStaticParams() {
  return snapshot().benchmarks.filter((b) => benchmarkRows(b.id).length).map((b) => ({ id: b.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  return { title: benchmarkById(id)?.name ?? "Benchmark" };
}

const UNIT: Record<string, string> = { percent: "%", usd: " USD", seconds: "s", elo: "", score: "", count: "" };
const usd = (v?: number) => (v == null ? "–" : `$${v < 0.01 ? v.toFixed(4) : v < 1 ? v.toFixed(3) : v.toFixed(2)}`);

export default async function BenchmarkPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const b = benchmarkById(id);
  if (!b) notFound();
  const rows = benchmarkRows(id);
  const digits = b.unit === "percent" ? 1 : b.unit === "usd" ? 2 : 0;
  const weight = OPEN_INDEX.benchmarks.find((x) => x.id === id);
  const total = OPEN_INDEX.benchmarks.reduce((s, x) => s + x.weight, 0);
  return (
    <div className="oa-body no-side">
      <main className="oa-main">
        <section className="oa-hero">
          <p className="oa-crumb"><Link href="/benchmarks">Benchmarks</Link> / {categoryLabel(b.category)}</p>
          <h1 className="mt-2">{b.name}{b.community && <span className="oa-badge">community</span>}</h1>
          <p className="oa-lede mt-3">{b.description}</p>
          <div className="oa-stats">
            <div><b>{rows.length}</b><span>models</span></div>
            <div><b>{weight ? `${Math.round((100 * weight.weight) / total)}%` : "–"}</b><span>Open Index weight</span></div>
            <div><b>{b.lastUpdated ?? "–"}</b><span>last updated</span></div>
            <div><b><a href={b.url} rel="noreferrer">{publisherOf(b)}</a></b><span>{b.community ? "maintainer" : "publisher"}</span></div>
          </div>
        </section>
        <section className="oa-section">
          <div className="chart-panel">
            <BenchmarkBars title={b.name} unit={b.unit} higherIsBetter={b.higherIsBetter} pts={benchmarkPoints(id)} labs={labs()} height={440} limit={30}
              desc={`${b.higherIsBetter ? "Higher" : "Lower"} is better · best effort per model${b.costNote ? ` · ${b.costNote}` : ""}`} />
          </div>
          <div className="chart-panel oa-scroll">
            <table className="oa-table">
              <thead><tr><th>#</th><th>Model</th><th>Effort</th><th className="num">Score</th><th className="num">Cost / task</th><th>Harness</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.modelId}>
                    <td>{i + 1}</td>
                    <td><span className="oa-dot" style={{ background: labColor(r.labId) }} /><Link href={`/models/${r.modelId}`}>{r.name}</Link></td>
                    <td>{r.effort === "default" ? "–" : r.effort}</td>
                    <td className="num"><a href={r.sourceUrl} rel="noreferrer">{r.value.toFixed(digits)}{UNIT[b.unit]}</a></td>
                    <td className="num">{usd(r.costUsd)}</td>
                    <td>{r.harness ?? "–"}</td>
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
