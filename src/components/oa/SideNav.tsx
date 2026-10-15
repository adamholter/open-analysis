"use client";
import { useEffect, useState } from "react";

/** AA-style section index: squares turn solid for the section in view. */
export function SideNav({ items }: { items: { id: string; label: string; tag?: string }[] }) {
  const [on, setOn] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver((entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) setOn(top.target.id);
    }, { rootMargin: "-80px 0px -60% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav className="oa-side" aria-label="Sections">
      {items.map((i) => <a key={i.id} href={`#${i.id}`} className={on === i.id ? "on" : undefined}>{i.label}{i.tag && <small>· {i.tag}</small>}</a>)}
    </nav>
  );
}
