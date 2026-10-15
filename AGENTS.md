# Open Analysis

Simple, fixed-index sibling of Priors (`~/priors`, mypriors.com): "Artificial Analysis, but open source with community benchmarks". No accounts, no custom weights, statically generated.

- Read `README.md` for layout. Copied from Priors: data contract + engine (`src/data/`, `src/engine/`), the whole chart stack (`src/components/chart/`, `src/lib/{metrics,page-presets,url,highlight-link}.ts`) and its CSS (`src/app/globals.css` top half, `src/components/page/page-themes.css`). Port fixes from Priors rather than diverging.
- Deliberate divergences from Priors: bars sort best-first and pack single-effort models without spacers, names rotate 45° (`bars-option.ts`); `MetricBars` caps at `limit`; bar charts show every model (no frontier+top-3 default).
- Pages render inside `Shell` (aa / aa-dark preset by system scheme, shared highlight via `?hl=`). Server builds plain chart payloads in `src/lib/views.ts`; formatters live client-side in `src/lib/charts.ts`. Benchmark grid points are compact tuples to keep the page ~200 KB gzipped.
- `npm run data` rebuilds `data/snapshot.json.gz` from the local Priors snapshot when `~/priors` exists, else from GitHub raw. All Priors sources are included (`config/upstream.json` `excludeSources` is empty).
- Dev server: port 48760. Run `npm run validate` before handoff.
- Public repo: github.com/adamholter/open-analysis. No domain or deploy yet; ask Adam before creating either.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
