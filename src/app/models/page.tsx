import type { Metadata } from "next";
import Link from "next/link";
import { labColor, openIndexRows, snapshot } from "@/lib/data";

export const metadata: Metadata = { title: "Models" };

export default function Models() {
  const snap = snapshot();
  const ranked = new Map(openIndexRows().best.map((r) => [r.modelId, r]));
  const labs = new Map(snap.labs.map((l) => [l.id, l.name]));
  const count = new Map<string, number>();
  const variantModel = new Map(snap.variants.map((v) => [v.id, v.modelId]));
  for (const o of snap.observations) { const m = variantModel.get(o.variantId); if (m) count.set(m, (count.get(m) ?? 0) + 1); }
  const models = snap.models.filter((m) => m.kind === "llm" && count.has(m.id))
    .sort((a, b) => (ranked.get(a.id)?.rank ?? 1e9) - (ranked.get(b.id)?.rank ?? 1e9) || (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  return (
    <main>
      <section>
        <h1>Models</h1>
        <p className="lede">{models.length} models with at least one result. Use the id column when you submit community results.</p>
      </section>
      <section className="panel scroll">
        <table className="data">
          <thead><tr><th>Model</th><th>Id</th><th>Lab</th><th className="num">Open Index rank</th><th className="num">Results</th><th>Released</th></tr></thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id}>
                <td><span className="dot" style={{ background: labColor(m.labId) }} /><Link href={`/models/${m.id}`}>{m.name}</Link></td>
                <td><code>{m.id}</code></td>
                <td>{labs.get(m.labId) ?? m.labId}</td>
                <td className="num">{ranked.get(m.id)?.rank ?? "–"}</td>
                <td className="num">{count.get(m.id)}</td>
                <td>{m.releaseDate ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
