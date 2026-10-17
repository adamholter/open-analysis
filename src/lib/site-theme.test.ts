import { describe, expect, it } from "vitest";
import { savedThemeMode } from "./site-theme";

describe("saved theme mode", () => {
  it("uses the system preference when storage has no valid choice", () => {
    expect(savedThemeMode(null)).toBe("system");
    expect(savedThemeMode("invalid")).toBe("system");
  });

  it("keeps explicit light and dark choices", () => {
    expect(savedThemeMode("light")).toBe("light");
    expect(savedThemeMode("dark")).toBe("dark");
  });
});
