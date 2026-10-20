"use client";
import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";

/** A block of text with a Copy button. */
export function CopyBlock({ text, label = "Copy prompt" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = () => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1600); }, () => {});
  return (
    <div className="oa-copy">
      <button type="button" className="oa-cta" onClick={copy}>{done ? <IconCheck size={15} stroke={2} aria-hidden="true" /> : <IconCopy size={15} stroke={1.8} aria-hidden="true" />}{done ? "Copied" : label}</button>
      <pre><code>{text}</code></pre>
    </div>
  );
}
