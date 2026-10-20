"use client";
import { createContext, useCallback, useContext } from "react";

/** Lab colours for the current theme. */
export const LabColors = createContext<Record<string, string>>({});
/** A lab's mark colour under the current theme (unknown labs get the "other" grey). */
export function useLabColor() {
  const labs = useContext(LabColors);
  return useCallback((labId: string | undefined) => (labId && labs[labId]) || labs.other || "#909090", [labs]);
}
