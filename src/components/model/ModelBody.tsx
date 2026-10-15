"use client";
import { useEffect, useState } from "react";
import type { Snapshot } from "@/data/types";
import { openIndexConfig } from "@/lib/open-index";
import { ModelPage } from "./ModelPage";

let pending: Promise<Snapshot> | undefined;
/** One fetch of the shared data file per visit, however many model pages are opened. */
const load = () => (pending ??= fetch("/data/snapshot-lite.json").then((r) => { if (!r.ok) throw new Error(`snapshot ${r.status}`); return r.json() as Promise<Snapshot>; }).catch((e) => { pending = undefined; throw e; }));

/** The interactive part of a model page; the hero above it is rendered on the server. */
export function ModelBody({ modelId }: { modelId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    load().then((s) => live && setSnapshot(s), () => live && setFailed(true));
    return () => { live = false; };
  }, []);
  if (failed) return <div className="chart-panel"><p className="cap">The charts could not be loaded. Reload the page to try again.</p></div>;
  if (!snapshot) return <div className="chart-panel oa-model-loading" aria-busy="true"><p className="cap">Loading charts…</p></div>;
  return <ModelPage snapshot={snapshot} modelId={modelId} mix={openIndexConfig()} />;
}
