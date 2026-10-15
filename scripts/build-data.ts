/**
 * Builds data/snapshot.json.gz: the upstream public-benchmark snapshot (Priors scrapers) minus
 * excluded sources, plus every benchmark in community/. `--check` validates community/ only and
 * exits non-zero on any problem (CI runs this on pull requests).
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { parse } from "csv-parse/sync";
import { canonicalizeSnapshot } from "../src/data/canonical-snapshot";
import { loadCommunity, type CommunityIssue } from "../src/data/community";
import type { Snapshot } from "../src/data/types";

const ROOT = path.resolve(import.meta.dirname, "..");
const check = process.argv.includes("--check");

interface Upstream { snapshotUrl: string; localSnapshot?: string; excludeSources: string[] }

async function upstreamSnapshot(cfg: Upstream): Promise<Snapshot> {
  const local = cfg.localSnapshot && path.resolve(ROOT, cfg.localSnapshot);
  const buf = local && existsSync(local) ? await readFile(local)
    : Buffer.from(await (await fetch(cfg.snapshotUrl)).arrayBuffer());
  return canonicalizeSnapshot(JSON.parse(gunzipSync(buf).toString("utf8")) as Snapshot);
}

/** Drop excluded sources entirely, then models and variants left without any observation. */
export function withoutSources(snap: Snapshot, exclude: string[]): Snapshot {
  const drop = new Set(exclude);
  const benchmarks = snap.benchmarks.filter((b) => !drop.has(b.sourceId));
  const keep = new Set(benchmarks.map((b) => b.id));
  const observations = snap.observations.filter((o) => keep.has(o.benchmarkId));
  const usedVariants = new Set(observations.map((o) => o.variantId));
  const variants = snap.variants.filter((v) => usedVariants.has(v.id)).map((v) => {
    const lineage = (v.sourceModels ?? []).filter((s) => !s.url.includes("artificialanalysis.ai"));
    const source = v.sourceModel && !v.sourceModel.url.includes("artificialanalysis.ai") ? v.sourceModel : lineage[0];
    return { ...v, sourceModel: source, sourceModels: lineage.length ? lineage : undefined };
  });
  const usedModels = new Set(variants.map((v) => v.modelId));
  return {
    ...snap,
    benchmarks, observations, variants,
    models: snap.models.filter((m) => usedModels.has(m.id)),
    estimates: snap.estimates?.filter((e) => keep.has(e.benchmarkId) && usedVariants.has(e.variantId)),
    series: snap.series.filter((s) => keep.has(s.benchmarkId)),
    sources: snap.sources.filter((s) => !drop.has(s.sourceId)),
  };
}

async function readCommunityDirs() {
  const dir = path.join(ROOT, "community");
  const out: { dir: string; spec: unknown; rows: Record<string, string>[] }[] = [];
  for (const name of (await readdir(dir)).sort()) {
    const specPath = path.join(dir, name, "benchmark.json");
    const csvPath = path.join(dir, name, "results.csv");
    if (!existsSync(specPath)) continue;
    const spec = JSON.parse(await readFile(specPath, "utf8"));
    const rows = existsSync(csvPath) ? parse(await readFile(csvPath, "utf8"), { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[] : [];
    out.push({ dir: name, spec, rows });
  }
  return out;
}

function report(issues: CommunityIssue[]) {
  for (const i of issues) console.log(`${i.level === "error" ? "✗" : "!"} community/${i.dir}${i.row ? ` row ${i.row}` : ""}: ${i.message}`);
}

async function main() {
  const cfg = JSON.parse(await readFile(path.join(ROOT, "config/upstream.json"), "utf8")) as Upstream;
  const base = withoutSources(await upstreamSnapshot(cfg), cfg.excludeSources);
  const { snapshot, issues, added } = loadCommunity(base, await readCommunityDirs(), new Date().toISOString());
  report(issues);
  const errors = issues.filter((i) => i.level === "error").length;
  console.log(`community: ${added.benchmarks} benchmarks, ${added.observations} results, ${added.models} new models, ${errors} errors`);
  if (check) process.exit(errors ? 1 : 0);
  if (errors) { console.error("Fix community errors before building."); process.exit(1); }
  await mkdir(path.join(ROOT, "data"), { recursive: true });
  await writeFile(path.join(ROOT, "data/snapshot.json.gz"), gzipSync(JSON.stringify(snapshot)));
  console.log(`wrote data/snapshot.json.gz · ${snapshot.date} · ${snapshot.models.length} models · ${snapshot.benchmarks.length} benchmarks · ${snapshot.observations.length} results`);
}

main().catch((e) => { console.error(e); process.exit(1); });
