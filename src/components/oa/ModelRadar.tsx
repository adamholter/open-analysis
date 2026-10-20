"use client";
import { Radar } from "./Radar";

/** A model's capability radar (client: it uses the theme's lab colours). */
export function ModelRadar({ axes, id, name, labId, values }: { axes: { id: string; name: string }[]; id: string; name: string; labId: string; values: Record<string, number> }) {
  return <Radar axes={axes} series={[{ key: id, name, labId, values }]} size={300} />;
}
