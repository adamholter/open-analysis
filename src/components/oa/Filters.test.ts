import { describe, expect, it } from "vitest";
import { reasoningEffortChips } from "../../lib/filters";

describe("reasoning effort filter chips", () => {
  it("includes default-effort results as a selectable chip", () => {
    expect(reasoningEffortChips(["none", "default", "high"])).toEqual(["none", "high", "default"]);
  });
});
