import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import localFont from "next/font/local";
import Link from "next/link";
import { Shell, THEME_SCRIPT, ThemeToggle } from "@/components/oa/Shell";
import { snapshot } from "@/lib/data";
import { openIndexView } from "@/lib/views";
import { REPO } from "@/lib/site";
import "./globals.css";

const switzer = localFont({ variable: "--font-switzer", display: "swap", src: [
  { path: "./fonts/switzer-400.woff2", weight: "400", style: "normal" },
  { path: "./fonts/switzer-500.woff2", weight: "500", style: "normal" },
  { path: "./fonts/switzer-600.woff2", weight: "600", style: "normal" },
] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Open Analysis", template: "%s · Open Analysis" },
  description: "Open-source AI model rankings built from public and community benchmarks.",
};

function Logo() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2.4" strokeDasharray="33 11" strokeLinecap="round" transform="rotate(-40 10 10)" /><circle cx="10" cy="10" r="2.2" fill="currentColor" /></svg>;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const snap = snapshot();
  const colors = new Map(snap.labs.map((l) => [l.id, l.color]));
  const models = openIndexView().best.map((r) => ({ id: r.model.id, name: r.model.name, color: colors.get(r.model.labId) }));
  return (
    <html lang="en" className={`${switzer.variable} ${sourceSerif.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Shell models={models}>
          <header className="oa-header">
            <div className="oa-header-in">
              <Link href="/" className="oa-logo"><Logo />Open Analysis</Link>
              <nav className="oa-nav" aria-label="Main">
                <Link href="/">Leaderboards</Link>
                <Link href="/models">Models</Link>
                <Link href="/benchmarks">Benchmarks</Link>
                <Link href="/benchmarks#community">Community</Link>
                <Link href="/methodology">Methodology</Link>
                <a href={REPO}>GitHub</a>
              </nav>
              <div className="oa-header-end"><ThemeToggle /><Link href="/contribute" className="oa-cta">Add a benchmark</Link></div>
            </div>
          </header>
          {children}
          <footer className="oa-footer">
            <div>
              <span>Data as of {snap.date}</span>
              <a href={REPO}>Source on GitHub</a>
              <a href="https://mypriors.com">Build your own index on Priors</a>
              <span>MIT licensed. Benchmark results belong to their publishers.</span>
            </div>
          </footer>
        </Shell>
      </body>
    </html>
  );
}
