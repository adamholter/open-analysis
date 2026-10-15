import type { Metadata } from "next";
import Link from "next/link";
import { OPEN_INDEX, benchmarkRows, snapshot, sourceName } from "@/lib/data";

export const metadata: Metadata = { title: "Benchmarks" };

export default function Benchmarks() {
  const snap = snapshot();
  const inIndex = new Set(OPEN_INDEX.benchmarks.map((b) => b.id));
  const list = snap.benchmarks.map((b) => ({ b, n: benchmarkRows(b.id).length }))
    .filter((x) => x.n > 0)
    .sort((x, y) => Number(!!y.b.community) - Number(!!x.b.community) || Number(inIndex.has(y.b.id)) - Number(inIndex.has(x.b.id)) || x.b.category.localeCompare(y.b.category) || x.b.name.localeCompare(y.b.name));
  return (
    <main>
      <section>
        <h1>Benchmarks</h1>
        <p className="lede">{list.length} benchmarks. Community benchmarks are submitted by their authors as a folder in the repo. <Link href="/contribute">Add yours</Link>.</p>
      </section>
      <section className="panel scroll">
        <table className="data">
          <thead><tr><th>Benchmark</th><th>Category</th><th>Source</th><th className="num">Models</th><th>Updated</th></tr></thead>
          <tbody>
            {list.map(({ b, n }) => (
              <tr key={b.id}>
                <td><Link href={`/benchmarks/${b.id}`}>{b.name}</Link>{b.community && <span className="badge">community</span>}{inIndex.has(b.id) && <span className="badge">in index</span>}</td>
                <td>{b.category}</td>
                <td>{sourceName(b)}</td>
                <td className="num">{n}</td>
                <td>{b.lastUpdated ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
