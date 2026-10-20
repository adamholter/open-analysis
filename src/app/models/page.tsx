import type { Metadata } from "next";
import { ModelsTable } from "@/components/oa/ModelsTable";
import { modelsTable } from "@/lib/bars";

export const metadata: Metadata = { title: "Models" };

export default function Models() {
  const data = modelsTable();
  return (
    <div className="oa-body no-side">
      <main className="oa-main">
        <section className="oa-bhead">
          <h1>Models</h1>
          <p>Every model on the Open Index, plus recent models with results on at least 30 benchmarks. Sort by any column; open a model for every result. Search in the header finds the rest.</p>
        </section>
        <ModelsTable {...data} />
      </main>
    </div>
  );
}
