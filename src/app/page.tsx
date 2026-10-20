import Link from "next/link";
import { SideNav } from "@/components/oa/SideNav";
import { Benchmarks, BuildIndex, Capabilities, Community, Cost, IndexSection, Speed } from "@/components/oa/Home";
import { homeData } from "@/lib/bars";
import { snapshot } from "@/lib/data";

const SECTIONS = [
  { id: "intelligence", label: "Open Index" },
  { id: "your-index-section", label: "Your index" },
  { id: "capabilities", label: "Capabilities" },
  { id: "cost", label: "Cost" },
  { id: "speed", label: "Speed" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "community", label: "Community" },
];

function Head({ title, desc, end }: { title: string; desc?: React.ReactNode; end?: React.ReactNode }) {
  return <div className="oa-sech"><div><h2>{title}</h2>{desc && <p>{desc}</p>}</div>{end && <div className="oa-sech-end">{end}</div>}</div>;
}

export default function Home() {
  const snap = snapshot();
  const d = homeData();
  return (
    <div className="oa-body">
      <SideNav items={SECTIONS} />
      <main className="oa-main">
        <section className="oa-hero">
          <h1>Compare AI models on every public benchmark</h1>
          <p>{snap.benchmarks.length} benchmarks from Artificial Analysis, labs, researchers and the community, in one place. Every number links to where it was published.</p>
        </section>
        <section id="intelligence" className="oa-section">
          <IndexSection data={d.index} />
        </section>
        <section id="your-index-section" className="oa-section">
          <Head title="Your index" desc="Mix the benchmarks you care about into one score." />
          <BuildIndex scores={d.scores} />
        </section>
        <section id="capabilities" className="oa-section">
          <Head title="Capabilities" desc="How well models do at each kind of task. Each index averages the best-covered benchmarks in its category, at most two per publisher." />
          <Capabilities caps={d.caps} />
        </section>
        <section id="cost" className="oa-section">
          <Head title="Cost" desc="Measured cost to finish a task at API list prices, and the models nothing beats on price and score." />
          <Cost cost={d.cost} />
        </section>
        <section id="speed" className="oa-section">
          <Head title="Speed" desc="Output speed and time to first token, measured by Artificial Analysis." />
          <Speed speed={d.speed} latency={d.latency} />
        </section>
        <section id="benchmarks" className="oa-section">
          <Head title="Benchmarks" desc="Every benchmark, grouped by what it measures." end={<Link href="/benchmarks" className="oa-btn sm">Explore benchmarks</Link>} />
          <Benchmarks data={d.benchmarks} />
        </section>
        <section id="community" className="oa-section">
          <Head title="Community benchmarks" desc="Benchmarks people add with one pull request. They sit next to the published ones, with a badge." end={<Link href="/contribute" className="oa-btn sm">Add a benchmark</Link>} />
          <Community data={d.benchmarks} />
        </section>
      </main>
    </div>
  );
}
