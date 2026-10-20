import type { Metadata } from "next";
import Link from "next/link";
import { OPEN_INDEX, benchmarkById, snapshot } from "@/lib/data";
import { catalog, publisherOf } from "@/lib/views";
import { categoryDescription, categoryLabel } from "@/lib/categories";

export const metadata: Metadata = { title: "Benchmarks" };

/** Benchmarks without one picked: what is here, and the index benchmarks to start from. */
export default function Benchmarks() {
  const cat = catalog();
  const counts = new Map<string, number>();
  for (const b of cat.benchmarks) counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
  const community = cat.benchmarks.filter((b) => b.community).length;
  return <>
    <section className="oa-bhead">
      <h1>Benchmarks</h1>
      <p>{cat.benchmarks.length} benchmarks with results: collected from their publishers every two hours, and {community} added by their authors. Pick one on the left to see every result, what a run costs, and where it was published. <Link href="/contribute">Add yours</Link>.</p>
    </section>
    <div className="oa-card">
      <div className="oa-chead"><div className="oa-ctitle"><h3>In the Open Index</h3><p>The {OPEN_INDEX.benchmarks.length} benchmarks the index averages</p></div></div>
      <div className="oa-blist">
        {OPEN_INDEX.benchmarks.map((x) => { const b = benchmarkById(x.id); return b && (
          <Link key={b.id} href={`/benchmarks/${b.id}`} className="oa-bitem" title={b.description}><b>{b.name}</b><small>{publisherOf(b)} · {categoryLabel(b.category)}</small><span>{b.description}</span></Link>); })}
      </div>
    </div>
    <div className="oa-card">
      <div className="oa-chead"><div className="oa-ctitle"><h3>By category</h3><p>What each group measures</p></div></div>
      <div className="oa-blist">
        {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => (
          <div key={c} className="oa-bitem"><b>{categoryLabel(c)}</b><small>{n} benchmarks</small><span>{categoryDescription(c)}</span></div>
        ))}
      </div>
    </div>
    <p className="oa-muted">Data as of {snapshot().date}.</p>
  </>;
}
