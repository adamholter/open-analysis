/** Display names for benchmark categories. Ids stay Priors' (`creative`, `economics`, `safety`); only the labels differ. */
const LABELS: Record<string, string> = {
  coding: "Coding", agentic: "Agentic", reasoning: "Reasoning", knowledge: "Knowledge", math: "Math", "long-context": "Long Context",
  instruction: "Instruction Following", creative: "3D", economics: "Professional", safety: "Cyber", composite: "Composite",
  speed: "Speed", cost: "Cost", reliability: "Reliability", other: "Other",
};
export const categoryLabel = (id: string) => LABELS[id] ?? id;
