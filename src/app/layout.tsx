import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Shell, THEME_SCRIPT, ThemeToggle } from "@/components/oa/Shell";
import { SelectionProvider } from "@/components/oa/Selection";
import { GlobalSearch } from "@/components/oa/GlobalSearch";
import { Nav } from "@/components/oa/Nav";
import { IconBrandGithub, IconPlus } from "@tabler/icons-react";
import { snapshot } from "@/lib/data";
import { catalog } from "@/lib/views";
import { REPO } from "@/lib/site";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Open Analysis", template: "%s · Open Analysis" },
  description: "Compare AI models on every public benchmark: Artificial Analysis, labs, researchers and the community, in one place.",
};

function Logo() {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2.4" strokeDasharray="33 11" strokeLinecap="round" transform="rotate(-40 10 10)" /><circle cx="10" cy="10" r="2.2" fill="currentColor" /></svg>;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const snap = snapshot();
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Shell>
          <SelectionProvider catalog={catalog()}>
            <header className="oa-header">
              <div className="oa-header-in">
                <Link href="/" className="oa-logo"><Logo />Open Analysis</Link>
                <Nav />
                <div className="oa-header-end">
                  <GlobalSearch />
                  <ThemeToggle />
                  <a href={REPO} className="oa-ibtn" aria-label="Source on GitHub" title="Source on GitHub"><IconBrandGithub size={17} stroke={1.6} /></a>
                  <Link href="/contribute" className="oa-cta"><IconPlus size={15} stroke={2} aria-hidden="true" />Add a benchmark</Link>
                </div>
              </div>
            </header>
            {children}
            <footer className="oa-footer">
              <div>
                <span>Data as of {snap.date}</span>
                <Link href="/methodology">How the numbers are made</Link>
                <a href={REPO}>Source on GitHub</a>
                <span>MIT licensed. Benchmark results belong to their publishers.</span>
              </div>
            </footer>
          </SelectionProvider>
        </Shell>
      </body>
    </html>
  );
}
