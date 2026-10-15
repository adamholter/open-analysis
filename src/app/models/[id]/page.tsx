import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModelBody } from "@/components/model/ModelBody";
import { labColor, modelFacts, modelResults, snapshot } from "@/lib/data";
import { openIndexView } from "@/lib/views";

export function generateStaticParams() {
  return snapshot().models.filter((m) => modelResults(m.id).length).map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = decodeURIComponent((await params).id);
  const m = snapshot().models.find((x) => x.id === id);
  const top = openIndexView().best.find((r) => r.model.id === id);
  return { title: m ? `${m.name} · benchmarks` : "Model", description: m && top ? `${m.name} ranks #${top.rank} on the Open Index with ${top.score.toFixed(1)}. Every benchmark result, by reasoning effort.` : m ? `How ${m.name} scores on every benchmark Open Analysis tracks.` : undefined };
}

const tokens = (n: number) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${n}`);
const price = (n: number) => `$${n < 1 ? n.toFixed(2) : +n.toFixed(2)}`;

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  const snap = snapshot();
  const model = snap.models.find((m) => m.id === id);
  if (!model) notFound();
  const index = openIndexView();
  const ranked = index.best.find((r) => r.model.id === id);
  const efforts = index.all.filter((r) => r.model.id === id).length;
  const results = modelResults(id);
  const measured = new Set(results.filter((r) => !r.benchmark.proxy).map((r) => r.benchmark.id)).size;
  const lab = snap.labs.find((l) => l.id === model.labId)?.name ?? model.labId;
  const facts = modelFacts(id);
  const fact: [string, string][] = [
    ...(facts?.openWeights != null ? [["Weights", facts.openWeights ? `Open${facts.license ? ` · ${facts.license}` : ""}` : "Proprietary"] as [string, string]] : []),
    ...(facts?.paramsB ? [["Parameters", `${facts.paramsB}B${facts.activeParamsB ? ` (${facts.activeParamsB}B active)` : ""}`] as [string, string]] : []),
    ...(facts?.contextTokens ? [["Context window", `${tokens(facts.contextTokens)} tokens`] as [string, string]] : []),
    ...(facts?.priceInPerM != null && facts.priceOutPerM != null ? [["API price", `${price(facts.priceInPerM)} in · ${price(facts.priceOutPerM)} out per 1M tokens`] as [string, string]] : []),
  ];
  return (
    <div className="oa-body no-side">
      <main className="oa-main">
        <section className="oa-hero grid gap-5 sm:grid-cols-[1fr_auto] items-end">
          <div>
            <p className="cap flex items-center gap-2"><Link href="/models" className="hover:text-ink">Models</Link><span aria-hidden="true">/</span><i className="oa-dot" data-lab={model.labId} style={{ background: labColor(model.labId), margin: 0 }} />{lab}{model.releaseDate && ` · released ${model.releaseDate}`}</p>
            <h1 className="mt-2">{model.name}</h1>
            <p className="oa-lede mt-2">Measured on {measured} benchmarks{efforts > 1 ? ` across ${efforts} reasoning efforts` : ""}.</p>
          </div>
          <div className="sm:text-right">
            <p className="cap">{index.name}</p>
            {ranked
              ? <><p className="num text-[52px] leading-none mt-1" style={{ color: "var(--indigo)" }}>{ranked.score.toFixed(1)}</p><p className="text-[13px] mt-1" style={{ color: "var(--ink-2)" }}>#{ranked.rank} of {index.best.length} models{ranked.variant.effort !== "default" ? ` · best at ${ranked.variant.effort}` : ""}</p></>
              : <p className="text-[13px] mt-2 max-w-[30ch]" style={{ color: "var(--ink-2)" }}>Not ranked on the Open Index: too little measured data on its benchmarks, or released more than six months ago.</p>}
          </div>
        </section>
        {fact.length > 0 && <dl className="oa-facts">{fact.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
        <ModelBody modelId={id} />
      </main>
    </div>
  );
}
