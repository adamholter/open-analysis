import type { Metadata } from "next";
import Link from "next/link";
import type { Benchmark } from "@/data/types";
import { OPEN_INDEX, benchmarkRows, snapshot } from "@/lib/data";
import { publisherOf } from "@/lib/views";
import { categoryLabel } from "@/lib/categories";

export const metadata: Metadata = { title: "Benchmarks" };

function Table({ list, inIndex }: { list: { b: Benchmark; n: number }[]; inIndex: Set<string> }) {
  return (
    <div className="chart-panel oa-scroll">
      <table className="oa-table">
        <thead><tr><th>Benchmark</th><th>Category</th><th>Publisher</th><th className="num">Models</th><th className="oa-hide-sm">Updated</th></tr></thead>
        <tbody>
          {list.map(({ b, n }) => (
            <tr key={b.id}>
              <td><Link href={`/benchmarks/${b.id}`}>{b.name}</Link>{b.community && <span className="oa-badge">community</span>}{inIndex.has(b.id) && <span className="oa-badge">in index</span>}</td>
              <td>{categoryLabel(b.category)}</td>
              <td>{publisherOf(b)}</td>
              <td className="num">{n}</td>
              <td className="oa-hide-sm">{b.lastUpdated ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Benchmarks() {
  const snap = snapshot();
  const inIndex = new Set(OPEN_INDEX.benchmarks.map((b) => b.id));
  const list = snap.benchmarks.map((b) => ({ b, n: benchmarkRows(b.id).length })).filter((x) => x.n > 0)
    .sort((x, y) => Number(inIndex.has(y.b.id)) - Number(inIndex.has(x.b.id)) || categoryLabel(x.b.category).localeCompare(categoryLabel(y.b.category)) || x.b.name.localeCompare(y.b.name));
  return (
    <div className="oa-body no-side">
      <main className="oa-main">
        <section className="oa-section">
          <h2>Benchmarks</h2>
          <p className="lede">{list.length} benchmarks: public ones collected from their publishers every two hours, and {list.filter((x) => x.b.community).length} submitted by their authors. <Link href="/contribute" className="underline">Add yours</Link>.</p>
          <Table list={list} inIndex={inIndex} />
        </section>
      </main>
    </div>
  );
}
