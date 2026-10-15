import type { IndexConfig } from "@/engine";
import openIndex from "../../open-index.json";

export const OPEN_INDEX = openIndex;

export function openIndexConfig(): IndexConfig {
  return {
    id: "open-index", name: openIndex.name,
    weights: Object.fromEntries(openIndex.benchmarks.map((b) => [b.id, b.weight])),
    required: [], cutoff: 5, strictness: openIndex.strictness, estimateMissing: true,
    variants: "all", rankingVariants: "best", paretoVariants: "all",
  };
}
