# Open Analysis

Simple, fixed-index sibling of Priors (`~/priors`, mypriors.com): "Artificial Analysis, but open source with community benchmarks". No accounts, no custom weights, statically generated.

- Read `README.md` for layout. Copied from **live Priors (`origin/main`, not the local `~/priors` checkout, which can lag)**: data contract + engine (`src/data/`, `src/engine/`), the chart stack (`src/components/chart/`, `src/components/Rankings.tsx`, `src/lib/{metrics,page-presets,url,highlight-link,page-layout,konami,...}.ts`) and its CSS (`src/app/globals.css` above the "Open Analysis layer" marker, `src/components/page/page-themes.css`). To resync: `git -C ~/priors fetch && git -C ~/priors archive origin/main src | tar -x -C /tmp/priors-live`, copy over, then re-apply the divergences below.
- Divergences from Priors (re-apply after a resync): `insideLabelOn` in `theme.ts` (dark text inside light bars, used by `RankingColumns.tsx` and `bars-option.ts`); `escapeHtml` on tooltip HTML in `bars-option.ts`, `MetricBars.tsx`, `RankingColumns.tsx`, `BenchBars.tsx`; `types.ts` community fields and loose `withPage` type.
- Index and single-benchmark charts use Priors' `Rankings` (columns under the Analysis theme). Metric charts use `MetricBars`/`ScoreScatter` unchanged; `src/components/oa/Charts.tsx` shows every model in bars instead of Priors' frontier+top-3 default.
- Pages render inside `Shell` (aa / aa-dark preset; system default, header toggle saved in `localStorage["oa:theme"]`; shared highlight via `?hl=`). Server builds plain chart payloads in `src/lib/views.ts`; formatters live client-side in `src/lib/charts.ts`. Benchmark grid points are compact tuples to keep the page ~200 KB gzipped.
- `npm run data` rebuilds `data/snapshot.json.gz` from the local Priors snapshot when `~/priors` exists, else from GitHub raw. All Priors sources are included (`config/upstream.json` `excludeSources` is empty).
- Dev server: port 48760. Run `npm run validate` before handoff.
- Public repo: github.com/adamholter/open-analysis. No domain or deploy yet; ask Adam before creating either.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
