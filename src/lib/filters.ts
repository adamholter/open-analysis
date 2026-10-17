import { EFFORT_ORDER } from "../data/types";

export function reasoningEffortChips(efforts: string[]) {
  return [...EFFORT_ORDER.filter((effort) => efforts.includes(effort)), ...(efforts.includes("default") ? ["default"] : [])];
}
