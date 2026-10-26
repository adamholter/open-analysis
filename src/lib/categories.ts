/** Display names and one-line descriptions for benchmark categories. Ids stay Priors' (`creative`, `economics`, `safety`); only the labels differ. */
const LABELS: Record<string, string> = {
  coding: "Coding", agentic: "Agents & tools", reasoning: "Reasoning", knowledge: "Knowledge", math: "Math", "long-context": "Long inputs",
  instruction: "Instruction following", creative: "Creative work", economics: "Professional work", safety: "Cyber security", composite: "Combined indexes",
  speed: "Speed", cost: "Cost", reliability: "Reliability", other: "Other",
};

const DESCRIPTIONS: Record<string, string> = {
  coding: "Writing and fixing real code: repositories, tests, competitive problems.",
  agentic: "Doing multi-step tasks with tools: terminals, browsers, apps.",
  reasoning: "Hard questions that need several steps of thinking, without tools.",
  math: "Competition and research maths, checked against exact answers.",
  knowledge: "Expert facts across science and other fields.",
  economics: "Work tasks from jobs: finance, law, office work.",
  "long-context": "Finding and using information in very long inputs.",
  safety: "Security tasks: finding and exploiting vulnerabilities.",
  instruction: "Doing exactly what the prompt asks: format, length, rules.",
  creative: "Open-ended output (writing, images, 3D scenes, websites), usually judged by people who vote between two answers.",
  composite: "Scores that average several benchmarks into one number, like the Artificial Analysis Intelligence Index.",
  speed: "How fast a model answers.", cost: "What a task costs to run.", reliability: "How often a model's API answers at all.",
  other: "Benchmarks that fit no other group yet.",
};

export const categoryLabel = (id: string) => LABELS[id] ?? id;
export const categoryDescription = (id: string) => DESCRIPTIONS[id] ?? "";
