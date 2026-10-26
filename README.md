# Open Analysis

Open-source AI model rankings. One fixed index, built from independent public benchmarks plus community benchmarks anyone can add by pull request.

- **Overview**: the Open Index, Build your own index (pick benchmarks and weights), capability indexes, cost per task and the cost Pareto, speed, every benchmark as a card, community benchmarks.
- **Models**, **Benchmarks**, **Compare**: every result, linked to where it was published.
- One model picker for every chart on a page; the selection lives in the URL.
- **Community benchmarks**: a folder in `community/` with `benchmark.json` and `results.csv`. See [CONTRIBUTING.md](CONTRIBUTING.md).

Want your own weights instead of ours? Use [Priors](https://mypriors.com), which shares this engine.

## Run it

```sh
git clone https://github.com/adamholter/open-analysis.git
cd open-analysis
npm ci
npm run dev    # http://localhost:48760
```

The included snapshot lets you run the app without API keys. Refresh it with `npm run data`.

## How the data flows

1. Public benchmarks are scraped by [Priors](https://github.com/adamholter/priors) every two hours (`config/upstream.json` points at its latest snapshot).
2. `scripts/build-data.ts` drops any sources listed in `excludeSources` (none by default), then merges `community/*`.
3. The site is statically generated from `data/snapshot.json.gz`. The index weights are in `open-index.json`.

## Layout

- `open-index.json`: index components and weights. `config/task-access.json`: which benchmarks publish their tasks.
- `community/<id>/`: community benchmarks.
- `src/data/community.ts`: community schema, model matching and merge (tests alongside).
- `src/engine/`, `src/data/{types,normalize,...}.ts`: shared with Priors. Change them there first.
- `src/lib/data.ts`: snapshot, per-model and per-benchmark queries. `src/lib/views.ts`: index views, the model catalog (`catalog()`), benchmark charts and the score table. `src/lib/bars.ts`: those as plain chart rows for the pages.
- `src/components/oa/`: everything on screen. `Shell` (zinc theme, light/dark/system), `Selection` + `ModelPicker` (the shared, URL-backed model selection), `Bars`/`Scatter`/`Radar` (SVG charts with hover, export, settings), `Home`, `BenchList`, `ModelsTable`, `Compare`, `GlobalSearch`.
