"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [["/", "Overview"], ["/models", "Models"], ["/benchmarks", "Benchmarks"], ["/compare", "Compare"], ["/methodology", "Methodology"]] as const;

/** Main navigation; the current section is marked. */
export function Nav() {
  const path = usePathname();
  const on = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="oa-nav" aria-label="Main">
      {ITEMS.map(([href, label]) => <Link key={href} href={href} aria-current={on(href) ? "page" : undefined}>{label}</Link>)}
    </nav>
  );
}
