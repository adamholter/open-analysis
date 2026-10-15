# Open Analysis

Simple, fixed-index sibling of Priors (`~/priors`, mypriors.com): "Artificial Analysis, but open source with community benchmarks". No accounts, no custom weights, statically generated.

- Read `README.md` for layout. Data contract and engine are copied from Priors (`src/data/types.ts`, `normalize.ts`, `src/engine/`); port fixes from there rather than diverging.
- `npm run data` rebuilds `data/snapshot.json.gz` from the local Priors snapshot when `~/priors` exists, else from GitHub raw. AA, Slopalytics and Real API Pricing are excluded (`config/upstream.json`).
- Theme is Priors' "Analysis" preset: white, black ink, purple `#7F4BF3`, Switzer + Source Serif 4, black square before panel titles, dotted grids.
- Dev server: port 48760. Run `npm run validate` before handoff.
- Not yet published: no GitHub repo, domain or deploy. Ask Adam before creating any of them.
