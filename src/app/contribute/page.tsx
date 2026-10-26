import type { Metadata } from "next";
import Link from "next/link";
import { CopyBlock } from "@/components/oa/CopyBlock";
import { REPO } from "@/lib/site";
import { categoryLabel } from "@/lib/categories";

export const metadata: Metadata = { title: "Add a benchmark" };

const CATEGORIES = ["coding", "agentic", "reasoning", "knowledge", "math", "long-context", "instruction", "creative", "safety", "economics", "other"];

const PROMPT = `Add my benchmark to Open Analysis as a community benchmark.

Repository: ${REPO}
Read CONTRIBUTING.md and look at community/hearing-bench/ as a complete example before you start.

My benchmark:
- Name: <name>
- Public page that explains the tasks and the scoring: <url>
- Maintainer (my name): <name>
- What a model has to do and how it is scored: <one or two sentences>
- Results: <paste a table, attach a file, or give a link>

Do this:
1. Fork and clone the repository, then run \`npm install\`.
2. Pick an id: lowercase letters, digits and dashes (for example "my-bench"). Create the folder community/<id>/.
3. Write community/<id>/benchmark.json:
   {
     "id": "<id>",
     "name": "<display name>",
     "description": "<what a model has to do, and how it is scored>",
     "url": "<public page>",
     "maintainer": "<my name>",
     "category": "<one of: ${CATEGORIES.join(", ")}>",
     "unit": "<percent | score | elo | usd | seconds | count>",
     "higherIsBetter": true,
     "lastUpdated": "<YYYY-MM-DD of the latest results>"
   }
   - "id" must equal the folder name.
   - unit "score" also needs "scale": { "min": <min>, "max": <max> }.
   - Optional "costNote": how cost_usd was priced.
4. Write community/<id>/results.csv with this header:
   model,effort,score,cost_usd,duration_sec,harness,source_url
   - model: a model id as used on the site (a model page's address ends in /models/<id>); common names usually match too.
   - effort: none, minimal, low, medium, high, xhigh or max. Leave it blank if no level was set; the model's highest level is assumed.
   - score: required. cost_usd and duration_sec are per task, optional, never negative. harness and source_url are optional.
   - One row per model and effort. Only complete runs. No copies of other leaderboards.
5. Run \`npm run check:community\`. Fix every error it reports (unknown models, duplicate rows, out-of-range scores) until it passes. If a model is not recognized, keep the row out and list it in the pull request.
6. Open a pull request titled "Add <name> benchmark". In the description: the public page, how the runs were done (harness, dates, settings), and any model you left out.

Do not edit open-index.json; joining the Open Index is a separate pull request.`;

export default function Contribute() {
  return (
    <div className="oa-body no-side">
      <main className="oa-main">
        <section className="oa-bhead">
          <h1>Add a benchmark</h1>
          <p>A community benchmark is one folder with two files: a short description and a CSV of results. The fastest way: paste this prompt into your coding agent (Claude Code, Codex, Cursor…), fill in the five lines at the top, and let it open the pull request.</p>
        </section>
        <CopyBlock text={PROMPT} />
        <article className="oa-prose">
          <h2>What the agent makes</h2>
          <p><code>community/&lt;id&gt;/benchmark.json</code> describes the benchmark; <code>community/&lt;id&gt;/results.csv</code> holds one row per model and reasoning level. The full rules are in <a href={`${REPO}/blob/main/CONTRIBUTING.md`}>CONTRIBUTING.md</a>, and <a href={`${REPO}/tree/main/community/hearing-bench`}>Hearing Bench</a> is a complete example.</p>
          <h3>Categories</h3>
          <p>{CATEGORIES.map((c) => `${c} (${categoryLabel(c)})`).join(", ")}.</p>
          <h2>What gets accepted</h2>
          <ul>
            <li>A public page that explains the tasks and the scoring, linked in <code>url</code>.</li>
            <li>Results you ran yourself or that your benchmark publishes. No copies of other leaderboards.</li>
            <li>The same check runs on every pull request; a maintainer merges it, and it appears with a Community badge.</li>
            <li>Joining the Open Index is a separate pull request to <code>open-index.json</code>, decided on coverage and how much the benchmark adds.</li>
          </ul>
          <p>Prefer to do it by hand? Run <code>npm install</code> and <code>npm run check:community</code> after adding the two files. <Link href="/methodology#community">How community benchmarks are shown</Link>.</p>
        </article>
      </main>
    </div>
  );
}
