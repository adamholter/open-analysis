import { themeById, type PagePreset } from "@/lib/page-presets";

/** Open Analysis themes: shadcn zinc, light and dark, Geist type, lab colours from the Analysis theme. */
const FONTS = { sans: "var(--font-geist), Geist, Inter, system-ui, sans-serif", serif: "var(--font-geist), Geist, Inter, system-ui, sans-serif", mono: "var(--font-geist-mono), 'Geist Mono', ui-monospace, Menlo, monospace" };
const chart = { grid: "solid" as const, frontier: "dotted" as const, barLabels: "top" as const, barRadius: 3 };

export const ZINC: PagePreset = {
  id: "oa-zinc", name: "Zinc light", family: "aa", pair: "oa-zinc-dark", dark: false, bg: "#FFFFFF", surface: "#FFFFFF",
  ink: "#09090B", ink2: "#3F3F46", grey: "#71717A", hair: "#E4E4E7", hair2: "#F4F4F5", accent: "#09090B", panelAccent: "#09090B",
  fonts: FONTS, labColors: themeById("aa")!.labColors, chart, radius: 10,
};
export const ZINC_DARK: PagePreset = {
  id: "oa-zinc-dark", name: "Zinc dark", family: "aa", pair: "oa-zinc", dark: true, bg: "#09090B", surface: "#09090B",
  ink: "#FAFAFA", ink2: "#D4D4D8", grey: "#A1A1AA", hair: "#27272A", hair2: "#18181B", accent: "#FAFAFA", panelAccent: "#FAFAFA",
  fonts: FONTS, labColors: themeById("aa-dark")!.labColors, chart, radius: 10,
};
