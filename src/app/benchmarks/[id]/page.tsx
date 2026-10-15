import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bars } from "@/components/Chart";
import { OPEN_INDEX, benchmarkById, benchmarkRows, snapshot, sourceName } from "@/lib/data";
import { effortLabel, usd } from "@/lib/format";

export function generateStaticParams() {
  return snapshot().benchmarks.filter((b) => benchmarkRows(b.id).length).map((b) => ({ id: b.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  return { title: benchmarkById(id)?.name ?? "Benchmark" };
}

const UNIT: Record<string, string> = { percent: "%", usd: " USD", seconds: "s", elo: " Elo", score: "", count: "" };

export default async function BenchmarkPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const b = benchmarkById(id);
  if (!b) notFound();
  const rows = benchmarkRows(id);
  const digits = b.unit === "percent" ? 1 : b.unit === "usd" ? 2 : 0;
  const weight = OPEN_INDEX.benchmarks.find((x) => x.id === id);
  const total = OPEN_INDEX.benchmarks.reduce((s, x) => s + x.weight, 0);
  return (
    <main>
      <section>
        <p className="cap"><Link href="/benchmarks">Benchmarks</Link> / {b.category}</p>
        <h1>{b.name}{b.community && <span className="badge">community</span>}</h1>
        <p className="lede">{b.description}</p>
        <div className="stat-row">
          <div className="stat"><b>{rows.length}</b><span>models</span></div>
          <div className="stat"><b>{weight ? `${Math.round((100 * weight.weight) / total)}%` : "–"}</b><span>Open Index weight</span></div>
          <div className="stat"><b>{b.lastUpdated ?? "–"}</b><span>last updated</span></div>
          <div className="stat"><b><a href={b.url} rel="noreferrer">{sourceName(b)}</a></b><span>{b.community ? "maintainer" : "source"}</span></div>
        </div>
      </section>
      <section className="panel">
        <header><h2 className="mark">{b.name}</h2></header>
        <p className="sub">{b.higherIsBetter ? "Higher is better" : "Lower is better"}. Best effort per model, top 25.{b.costNote ? ` ${b.costNote}` : ""}</p>
        <Bars points={rows.slice(0, 25).map((r) => ({ id: r.modelId, name: r.name, label: `${r.name}${effortLabel(r.effort) ? ` (${r.effort})` : ""}`, color: r.color, y: r.value, href: `/models/${r.modelId}` }))} digits={digits} unit={UNIT[b.unit]} lowerIsBetter={!b.higherIsBetter} />
      </section>
      <section className="panel scroll">
        <table className="data">
          <thead><tr><th>#</th><th>Model</th><th>Effort</th><th className="num">Score</th><th className="num">Cost / task</th><th>Harness</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.modelId}>
                <td>{i + 1}</td>
                <td><span className="dot" style={{ background: r.color }} /><Link href={`/models/${r.modelId}`}>{r.name}</Link></td>
                <td>{effortLabel(r.effort) || "–"}</td>
                <td className="num"><a href={r.sourceUrl} rel="noreferrer">{r.value.toFixed(digits)}{UNIT[b.unit]}</a></td>
                <td className="num">{usd(r.costUsd)}</td>
                <td>{r.harness ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
