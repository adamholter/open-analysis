import { ZINC, ZINC_DARK } from "@/lib/oa-theme";

/** A lab's colour in light and dark mode, for server-rendered dots (CSS picks one by theme). */
export function labDot(labId: string): React.CSSProperties {
  const light = ZINC.labColors?.[labId] ?? ZINC.labColors?.other ?? "#909090", dark = ZINC_DARK.labColors?.[labId] ?? ZINC_DARK.labColors?.other ?? "#909090";
  return { "--l": light, "--d": dark } as React.CSSProperties;
}
