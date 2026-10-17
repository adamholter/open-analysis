import { z } from "zod";
import { EFFORT_ORDER, type Benchmark, type Effort, type Model, type Observation, type Snapshot, type Variant } from "./types";
import { EFFORT_WORDS, normalizeLabel } from "./normalize";

/** community/<id>/benchmark.json */
export const CommunitySpec = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,48}$/, "lowercase letters, digits and dashes"),
  name: z.string().min(2).max(60),
  description: z.string().min(20).max(400),
  url: z.url(),
  maintainer: z.string().min(2),
  category: z.enum(["coding", "agentic", "reasoning", "knowledge", "math", "long-context", "instruction", "creative", "safety", "economics", "other"]),
  unit: z.enum(["percent", "score", "elo", "usd", "seconds", "count"]),
  higherIsBetter: z.boolean(),
  /** Required for unit "score": the published scale's bounds. */
  scale: z.object({ min: z.number(), max: z.number() }).optional(),
  lastUpdated: z.iso.date(),
  costNote: z.string().optional(),
}).strict().refine((s) => s.unit !== "score" || s.scale, { message: "unit \"score\" needs a scale {min,max}" });
export type CommunitySpec = z.infer<typeof CommunitySpec>;

/** One results.csv row. Only model and score are required. */
const Row = z.object({
  model: z.string().min(1),
  effort: z.string().optional(),
  score: z.coerce.number().refine(Number.isFinite, "score must be a number"),
  cost_usd: z.coerce.number().nonnegative().optional(),
  duration_sec: z.coerce.number().nonnegative().optional(),
  harness: z.string().optional(),
  source_url: z.url().optional(),
});

export interface CommunityIssue { level: "error" | "warning"; dir: string; row?: number; message: string }
export interface CommunityInput { dir: string; spec: unknown; rows: Record<string, string>[] }

const blankToUndefined = (r: Record<string, string>) =>
  Object.fromEntries(Object.entries(r).filter(([, v]) => v !== "" && v != null));

/** Resolve a contributor's model label: exact model id, then known aliases/names, then the shared normalizer. */
function modelResolver(snap: Snapshot) {
  const byId = new Map(snap.models.map((m) => [m.id, m]));
  const byLabel = new Map<string, Model>();
  for (const m of snap.models) for (const a of [m.name, ...m.aliases]) byLabel.set(a.toLowerCase().trim(), m);
  return (label: string, effortHint?: string): { model: Model; effort?: Effort; created: boolean } | null => {
    const exact = byId.get(label) ?? byLabel.get(label.toLowerCase().trim());
    const n = normalizeLabel(label, effortHint);
    if (exact) return { model: exact, effort: n.ok ? n.effort : undefined, created: false };
    if (!n.ok) return null;
    const known = byId.get(n.modelId);
    if (known) return { model: known, effort: n.effort, created: false };
    const model: Model = { id: n.modelId, name: n.modelName, labId: n.labId, kind: "llm", reasoning: n.reasoningFamily, aliases: [label.toLowerCase()] };
    byId.set(model.id, model);
    return { model, effort: n.effort, created: true };
  };
}

/** Highest effort measured anywhere for this model; Priors' rule for sources that omit effort. */
function maxEffort(snap: Snapshot, modelId: string): Effort {
  const efforts = snap.variants.filter((v) => v.modelId === modelId).map((v) => v.effort);
  return [...EFFORT_ORDER].reverse().find((e) => efforts.includes(e)) ?? "default";
}

export function loadCommunity(base: Snapshot, inputs: CommunityInput[], observedAt: string) {
  const issues: CommunityIssue[] = [];
  const snap: Snapshot = { ...base, models: [...base.models], variants: [...base.variants], benchmarks: [...base.benchmarks], observations: [...base.observations] };
  const added = { benchmarks: 0, observations: 0, models: 0 };

  for (const input of inputs) {
    const err = (message: string, row?: number) => issues.push({ level: "error", dir: input.dir, row, message });
    const parsed = CommunitySpec.safeParse(input.spec);
    if (!parsed.success) { for (const i of parsed.error.issues) err(`benchmark.json ${i.path.join(".") || "(root)"}: ${i.message}`); continue; }
    const spec = parsed.data;
    if (spec.id !== input.dir) { err(`id "${spec.id}" must match the folder name`); continue; }
    if (snap.benchmarks.some((b) => b.id === spec.id)) { err(`id "${spec.id}" is already used by an upstream benchmark`); continue; }
    if (!input.rows.length) { err("results.csv is missing or empty"); continue; }

    // Stage model and variant resolution per benchmark. A bad row must not
    // leave records created by otherwise-valid rows in the shared snapshot.
    const staged: Snapshot = {
      ...snap,
      models: snap.models.map((model) => ({ ...model, aliases: [...model.aliases] })),
      variants: [...snap.variants],
    };
    const resolve = modelResolver(staged);
    const variantIds = new Set(staged.variants.map((v) => v.id));
    let addedModels = 0;
    const observations: Observation[] = [];
    const seen = new Map<string, number>();
    input.rows.forEach((raw, i) => {
      const line = i + 2; // header is line 1
      const row = Row.safeParse(blankToUndefined(raw));
      if (!row.success) { err(row.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "), line); return; }
      const r = row.data;
      if (r.effort && !EFFORT_WORDS[r.effort.toLowerCase()]) { err(`unknown effort "${r.effort}" (use ${EFFORT_ORDER.join(", ")})`, line); return; }
      if (spec.unit === "percent" && (r.score < 0 || r.score > 100)) { err(`percent score ${r.score} is outside 0–100`, line); return; }
      const hit = resolve(r.model, r.effort);
      if (!hit) { err(`unknown model "${r.model}". Use a model id from openanalysis /models, or open an issue to add an alias`, line); return; }
      const effort = (r.effort ? EFFORT_WORDS[r.effort.toLowerCase()] : hit.effort) ?? maxEffort(snap, hit.model.id);
      const variantId = `${hit.model.id}@${effort}`;
      if (seen.has(variantId)) { err(`duplicate result for ${variantId} (also row ${seen.get(variantId)})`, line); return; }
      seen.set(variantId, line);
      if (hit.created) { staged.models.push(hit.model); addedModels++; }
      if (!variantIds.has(variantId)) {
        const v: Variant = { id: variantId, modelId: hit.model.id, effort };
        staged.variants.push(v); variantIds.add(variantId);
        if (effort !== "default" && !hit.model.reasoning) hit.model.reasoning = true;
      }
      observations.push({
        benchmarkId: spec.id, variantId, value: r.score, observedAt, sourceUrl: r.source_url ?? spec.url,
        ...(r.cost_usd != null ? { costUsd: r.cost_usd } : {}),
        ...(r.duration_sec != null ? { durationSec: r.duration_sec } : {}),
        ...(r.harness ? { harness: r.harness } : {}),
      });
    });
    if (issues.some((x) => x.dir === input.dir && x.level === "error")) continue;

    snap.models = staged.models;
    snap.variants = staged.variants;
    const benchmark: Benchmark = {
      id: spec.id, name: spec.name, sourceId: `community/${spec.id}`, url: spec.url, description: spec.description,
      unit: spec.unit, higherIsBetter: spec.higherIsBetter, category: spec.category, lastUpdated: spec.lastUpdated,
      maintainer: spec.maintainer, community: true, costNote: spec.costNote,
      ...(spec.scale ? { normalization: { kind: "linear" as const, ...spec.scale } } : {}),
    };
    snap.benchmarks.push(benchmark);
    snap.observations.push(...observations);
    snap.sources = [...snap.sources, { sourceId: benchmark.sourceId, status: "ok", fetchedAt: observedAt, rowCount: observations.length, unknownLabels: [], rawPath: `community/${spec.id}/results.csv` }];
    added.benchmarks++; added.observations += observations.length; added.models += addedModels;
  }
  return { snapshot: snap, issues, added };
}
