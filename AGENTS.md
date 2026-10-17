# Open Analysis

Simple, fixed-index sibling of Priors (`~/priors`, mypriors.com): "Artificial Analysis, but open source with community benchmarks". No accounts, no custom weights, statically generated.

- Read `README.md` for layout. Copied from **live Priors (`origin/main`, not the local `~/priors` checkout, which can lag)**: data contract + engine (`src/data/`, `src/engine/`), the chart stack (`src/components/chart/`, `src/components/Rankings.tsx`, `src/lib/{metrics,page-presets,url,highlight-link,page-layout,konami,...}.ts`) and its CSS (`src/app/globals.css` above the "Open Analysis layer" marker, `src/components/page/page-themes.css`). To resync: `git -C ~/priors fetch && git -C ~/priors archive origin/main src | tar -x -C /tmp/priors-live`, copy over, then re-apply the divergences below.
- Divergences from Priors (re-apply after a resync): `insideLabelOn` in `theme.ts` (dark text inside light bars, used by `RankingColumns.tsx` and `bars-option.ts`); `escapeHtml` on tooltip HTML in `bars-option.ts`, `MetricBars.tsx`, `RankingColumns.tsx`, `BenchBars.tsx`; `ModelStrengths.tsx` radar SVG scales to its column; `ChartSettings.tsx` `releaseWindow` prop (page-wide months select); `Radar.tsx` side padding 132 (112 clipped long axis names); `Rankings.tsx` (always shows the all-results link, `empty` override for the filter-recovery message), `MetricBars.tsx`/`bars-option.ts` (bar coordinate separate from displayed value, for the uptime nines scale), `types.ts` community fields and loose `withPage` type.
- Model pages (`src/components/model/*`, from Priors) are a server-rendered hero plus `ModelBody`, which fetches one shared static file, `/data/snapshot-lite.json` (`liteSnapshot()` in `src/lib/data.ts`; route `src/app/data/snapshot-lite.json/route.ts`), and runs Priors' engine in the browser against the fixed Open Index. Keep that file lean: it is downloaded once per visit for all ~600 model pages.
- Resync with a 3-way merge, not a copy: `git merge-file ours <old live copy> <new live copy>` for files with Open Analysis changes (`MetricBars.tsx`, `RankingColumns.tsx`, `bars-option.ts`, `globals.css` above the layer marker); copy the rest. Live Priors moves fast: re-fetch `origin/main` before every resync.
- Index and single-benchmark charts use Priors' `Rankings` (columns under the Analysis theme). Metric charts use `MetricBars`/`ScoreScatter` unchanged; `src/components/oa/Charts.tsx` shows every model in bars instead of Priors' frontier+top-3 default.
- Home page filters (`src/components/oa/Filters.tsx`): `FiltersProvider` holds release window (default 3 months), reasoning efforts (default `none` off), pricing basis (default subscription), and per-model on/off; persisted in `localStorage["oa:filters"]`. Server payloads (`views.ts`) cover 12 months and carry `costApi`; charts filter client-side via `useScope()` in `Charts.tsx`. Cost Pareto defaults to all efforts.
- Pages render inside `Shell` (aa / aa-dark preset; system default, header toggle saved in `localStorage["oa:theme"]`; shared highlight via `?hl=`). Server builds plain chart payloads in `src/lib/views.ts`; formatters live client-side in `src/lib/charts.ts`. Benchmark grid points are compact tuples to keep the page ~200 KB gzipped.
- `npm run data` rebuilds `data/snapshot.json.gz` from Priors' latest snapshot on GitHub raw (not the local `~/priors` checkout, which lags). All Priors sources are included (`config/upstream.json` `excludeSources` is empty).
- Dev server: port 48760. Run `npm run validate` before handoff.
- Public repo: github.com/adamholter/open-analysis. No domain or deploy yet; ask Adam before creating either.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
