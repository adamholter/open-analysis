import type { Metadata } from "next";
import Link from "next/link";
import { labColor, snapshot } from "@/lib/data";
import { openIndexView } from "@/lib/views";

export const metadata: Metadata = { title: "Models" };

export default function Models() {
  const snap = snapshot();
  const ranked = new Map(openIndexView().best.map((r) => [r.model.id, r]));
  const labs = new Map(snap.labs.map((l) => [l.id, l.name]));
  const count = new Map<string, number>();
  const variantModel = new Map(snap.variants.map((v) => [v.id, v.modelId]));
  for (const o of snap.observations) { const m = variantModel.get(o.variantId); if (m) count.set(m, (count.get(m) ?? 0) + 1); }
  const models = snap.models.filter((m) => m.kind === "llm" && count.has(m.id))
    .sort((a, b) => (ranked.get(a.id)?.rank ?? 1e9) - (ranked.get(b.id)?.rank ?? 1e9) || (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  return (
    <div className="oa-body no-side">
      <main className="oa-main">
        <section className="oa-section">
          <h2>Models</h2>
          <p className="lede">{models.length} models with at least one result. Use the id column when you submit community results.</p>
          <div className="chart-panel oa-scroll">
            <table className="oa-table">
              <thead><tr><th>Model</th><th>Id</th><th>Lab</th><th className="num">Open Index rank</th><th className="num">Results</th><th>Released</th></tr></thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id}>
                    <td><span className="oa-dot" data-lab={m.labId} style={{ background: labColor(m.labId) }} /><Link href={`/models/${m.id}`}>{m.name}</Link></td>
                    <td><code>{m.id}</code></td>
                    <td>{labs.get(m.labId) ?? m.labId}</td>
                    <td className="num">{ranked.get(m.id)?.rank ?? "–"}</td>
                    <td className="num">{count.get(m.id)}</td>
                    <td>{m.releaseDate ?? "–"}</td>
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
