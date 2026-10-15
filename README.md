# Open Analysis

Open-source AI model rankings. One fixed index, built from independent public benchmarks plus community benchmarks anyone can add by pull request.

- **Leaderboards**: the Open Index, capability indexes (coding, agentic, reasoning, math, knowledge, finance, long context, security), intelligence vs. cost and speed, every benchmark as its own chart, open weights, output tokens, cost, speed and latency, providers, trends.
- **Models** and **benchmarks**: every result, linked to where it was published.
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

- `open-index.json`: index components and weights.
- `community/<id>/`: community benchmarks.
- `src/data/community.ts`: community schema, model matching and merge (tests alongside).
- `src/engine/`, `src/data/{types,normalize,...}.ts`: shared with Priors. Change them there first.
- `src/lib/data.ts`: index rows, per-model and per-benchmark queries.
- `src/lib/views.ts`: server-side chart payloads. `src/components/oa/`: page shell and chart cards.
- `src/components/chart/`: Priors' ECharts components (highlight, export, expand, settings).
