"use client";
import { money, moneyAxis, unitFormats } from "@/lib/format";
import { BarCard, type Bar } from "./Bars";

/** The benchmark page's charts: results under the model selection, and cost per task when runs report one. */
export function BenchCharts({ id, name, unit, higher, score, cost }: { id: string; name: string; unit: string; higher: boolean; score: Bar[]; cost: Bar[] }) {
  const f = unitFormats(unit);
  return <>
    <BarCard id={`results-${id}`} title="Results" rows={score} better={higher ? "higher" : "lower"} format={f.value} axis={f.axis} max={f.max} valueName={name} canLog={unit !== "percent"}
      desc={`Best reasoning level per model · ${higher ? "higher" : "lower"} is better`} info="Follows the model picker. The table below lists every model with a result." />
    {cost.length > 0 && <BarCard id={`cost-${id}`} title="Cost per task" rows={cost} better="lower" format={money} axis={moneyAxis} canLog valueName="Cost per task (USD)"
      desc="What one task of this benchmark cost to run · lower is better" info="As reported with each result. Runs without a cost are left out." />}
  </>;
}
