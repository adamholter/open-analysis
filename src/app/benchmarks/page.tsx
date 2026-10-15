import type { Metadata } from "next";
import Link from "next/link";
import type { Benchmark } from "@/data/types";
import { OPEN_INDEX, benchmarkRows, snapshot } from "@/lib/data";
import { publisherOf } from "@/lib/views";

export const metadata: Metadata = { title: "Benchmarks" };

function Table({ list, inIndex }: { list: { b: Benchmark; n: number }[]; inIndex: Set<string> }) {
  return (
    <div className="chart-panel oa-scroll">
      <table className="oa-table">
        <thead><tr><th>Benchmark</th><th>Category</th><th>Publisher</th><th className="num">Models</th><th>Updated</th></tr></thead>
        <tbody>
          {list.map(({ b, n }) => (
            <tr key={b.id}>
              <td><Link href={`/benchmarks/${b.id}`}>{b.name}</Link>{inIndex.has(b.id) && <span className="oa-badge">in index</span>}</td>
              <td>{b.category}</td>
              <td>{publisherOf(b)}</td>
              <td className="num">{n}</td>
              <td>{b.lastUpdated ?? "–"}</td>
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
    .sort((x, y) => Number(inIndex.has(y.b.id)) - Number(inIndex.has(x.b.id)) || x.b.category.localeCompare(y.b.category) || x.b.name.localeCompare(y.b.name));
  const community = list.filter((x) => x.b.community), upstream = list.filter((x) => !x.b.community);
  return (
    <div className="oa-body no-side">
      <main className="oa-main">
        <section id="community" className="oa-section">
          <h2>Community Benchmarks</h2>
          <p className="lede">Submitted by their authors as a folder in the repo. <Link href="/contribute" className="underline">Add yours</Link>.</p>
          <Table list={community} inIndex={inIndex} />
        </section>
        <section className="oa-section">
          <h2>Public Benchmarks</h2>
          <p className="lede">{upstream.length} benchmarks collected from their publishers every two hours.</p>
          <Table list={upstream} inIndex={inIndex} />
        </section>
      </main>
    </div>
  );
}
