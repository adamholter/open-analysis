import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconLock } from "@tabler/icons-react";
import { BenchCharts } from "@/components/oa/BenchCharts";
import { Info } from "@/components/oa/Bars";
import { OPEN_INDEX, benchmarkById, benchmarkRows, snapshot } from "@/lib/data";
import { labDot } from "@/lib/lab-colors";
import { accessOf, publisherOf } from "@/lib/views";
import { benchmarkBars } from "@/lib/bars";
import { categoryDescription, categoryLabel } from "@/lib/categories";
import { date, money } from "@/lib/format";

export function generateStaticParams() {
  return snapshot().benchmarks.filter((b) => benchmarkRows(b.id).length).map((b) => ({ id: b.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  const b = benchmarkById(id);
  return { title: b?.name ?? "Benchmark", description: b?.description };
}

const UNIT: Record<string, string> = { percent: "%", usd: " USD", seconds: " s", elo: " Elo", score: "", count: "" };

export default async function BenchmarkPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const b = benchmarkById(id);
  if (!b) notFound();
  const rows = benchmarkRows(id);
  const digits = b.unit === "percent" ? 1 : b.unit === "usd" ? 2 : b.unit === "elo" ? 0 : 1;
  const inIndex = OPEN_INDEX.benchmarks.find((x) => x.id === id);
  const total = OPEN_INDEX.benchmarks.reduce((s, x) => s + x.weight, 0);
  const access = accessOf(id);
  const bars = benchmarkBars(id);
  const facts: [string, React.ReactNode, string?][] = [
    [b.community ? "Maintainer" : "Publisher", <a key="p" href={b.url} rel="noreferrer">{publisherOf(b)}</a>],
    ["Category", categoryLabel(b.category), categoryDescription(b.category)],
    ["Models", rows.length],
    ["Last updated", b.lastUpdated ? date(b.lastUpdated) : "–"],
    ["Tasks", access === "closed" ? "Closed" : access === "public" ? "Public" : "Not recorded", "Public: anyone can read the questions. Closed: the publisher keeps the scored questions private."],
    ["Open Index weight", inIndex ? `${Math.round((100 * inIndex.weight) / total)}%` : "Not in the index"],
  ];
  return <>
    <section className="oa-bhead">
      <p className="oa-crumb"><Link href="/benchmarks">Benchmarks</Link> / {categoryLabel(b.category)}</p>
      <h1>{b.name}{access === "closed" && <IconLock size={16} stroke={2} className="oa-lock" aria-label="Closed tasks" />}{b.community && <span className="oa-badge">Community</span>}</h1>
      <p>{b.description}</p>
    </section>
    <dl className="oa-facts2">{facts.map(([k, v, tip]) => <div key={k}><dt>{k}{tip && <Info text={tip} />}</dt><dd>{v}</dd></div>)}</dl>
    <BenchCharts id={id} name={b.name} unit={b.unit} higher={b.higherIsBetter} score={bars.score} cost={bars.cost} />
    <div className="oa-card">
      <div className="oa-chead"><div className="oa-ctitle"><h3>Every result</h3><p>Best result per model, every model with a result{b.costNote ? ` · ${b.costNote}` : ""}</p></div></div>
      <div className="oa-scroll">
        <table className="oa-table">
          <thead><tr><th>#</th><th>Model</th><th>Level</th><th className="num">Score</th><th className="num">Cost / task</th><th>Harness</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.modelId}>
                <td>{i + 1}</td>
                <td><span className="oa-dot" style={labDot(r.labId)} /><Link href={`/models/${r.modelId}`}>{r.name}</Link></td>
                <td>{r.effort === "default" ? "–" : r.effort}</td>
                <td className="num"><a href={r.sourceUrl} rel="noreferrer" title="Where this result was published">{r.value.toFixed(digits)}{UNIT[b.unit]}</a></td>
                <td className="num">{r.costUsd != null ? money(r.costUsd) : "–"}</td>
                <td>{r.harness ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>;
}
