import type { Metadata } from "next";
import { Compare } from "@/components/oa/Compare";
import { capabilityScores } from "@/lib/bars";
import { scoreTable } from "@/lib/views";

export const metadata: Metadata = { title: "Compare models" };

export default function ComparePage() {
  const { axes, byModel } = capabilityScores();
  return (
    <div className="oa-body no-side">
      <main className="oa-main">
        <section className="oa-bhead">
          <h1>Compare models</h1>
          <p>Pick two to four models: your own index first, then their capabilities, the key numbers side by side, and the benchmarks where they differ most.</p>
        </section>
        <Compare scores={scoreTable()} axes={axes} caps={byModel} />
      </main>
    </div>
  );
}
