import { describe, expect, it } from "vitest";
import { loadCommunity } from "./community";
import type { Snapshot } from "./types";

const base: Snapshot = {
  version: 1, date: "2026-10-15", generatedAt: "", labs: [], series: [], sources: [], observations: [],
  benchmarks: [{ id: "taken", name: "Taken", sourceId: "x", url: "https://x.dev", description: "d", unit: "percent", higherIsBetter: true, category: "coding" }],
  models: [{ id: "claude-opus-5.5", name: "Opus 5.5", labId: "anthropic", kind: "llm", reasoning: true, aliases: ["claude opus 5.5"] }],
  variants: [{ id: "claude-opus-5.5@max", modelId: "claude-opus-5.5", effort: "max" }, { id: "claude-opus-5.5@high", modelId: "claude-opus-5.5", effort: "high" }],
};
const spec = { id: "my-bench", name: "My Bench", description: "Models do a thing and get scored on it.", url: "https://my.bench", maintainer: "Me", category: "reasoning", unit: "percent", higherIsBetter: true, lastUpdated: "2026-10-15" };
const run = (rows: Record<string, string>[], s: object = spec, dir = "my-bench") => loadCommunity(base, [{ dir, spec: s, rows }], "2026-10-15T00:00:00Z");

describe("community benchmarks", () => {
  it("matches ids and names, and assumes the highest effort when blank", () => {
    const { snapshot, issues } = run([{ model: "claude-opus-5.5", effort: "high", score: "40" }]);
    expect(issues).toEqual([]);
    expect(snapshot.observations.map((o) => o.variantId)).toEqual(["claude-opus-5.5@high"]);
    const blank = run([{ model: "Claude Opus 5.5", effort: "", score: "50", cost_usd: "0.2" }]);
    expect(blank.snapshot.observations[0]).toMatchObject({ variantId: "claude-opus-5.5@max", value: 50, costUsd: 0.2 });
    expect(blank.snapshot.benchmarks.at(-1)).toMatchObject({ id: "my-bench", community: true, sourceId: "community/my-bench" });
  });

  it("rejects unknown models, duplicates, bad scores and id clashes with line numbers", () => {
    const { issues, snapshot } = run([
      { model: "totally-unknown-model-xyz", score: "1" },
      { model: "claude-opus-5.5", effort: "high", score: "120" },
      { model: "claude-opus-5.5", effort: "high", score: "10" },
      { model: "claude-opus-5.5", effort: "high", score: "11" },
    ]);
    expect(issues.map((i) => i.row)).toEqual([2, 3, 5]);
    expect(snapshot.benchmarks.some((b) => b.id === "my-bench")).toBe(false);
    expect(run([{ model: "claude-opus-5.5", score: "1" }], { ...spec, id: "taken" }, "taken").issues[0].message).toMatch(/already used/);
    expect(run([{ model: "claude-opus-5.5", score: "1" }], { ...spec, unit: "score" }).issues[0].message).toMatch(/scale/);
  });

  it("does not leak models or variants from a rejected benchmark", () => {
    const { snapshot, issues, added } = run([
      { model: "gpt-99-sol high", score: "42" },
      { model: "claude-opus-5.5", score: "not-a-number" },
    ]);

    expect(issues).toHaveLength(1);
    expect(snapshot.models.some((model) => model.id === "gpt-99-sol")).toBe(false);
    expect(snapshot.variants.some((variant) => variant.id === "gpt-99-sol@high")).toBe(false);
    expect(snapshot.benchmarks.some((benchmark) => benchmark.id === "my-bench")).toBe(false);
    expect(snapshot.observations).toEqual(base.observations);
    expect(added).toEqual({ benchmarks: 0, observations: 0, models: 0 });
  });
});
