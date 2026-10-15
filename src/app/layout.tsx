import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import localFont from "next/font/local";
import Link from "next/link";
import { snapshot } from "@/lib/data";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const snap = snapshot();
  return (
    <html lang="en" className={`${switzer.variable} ${sourceSerif.variable}`}>
      <body>
        <header className="site">
          <div className="wrap">
            <Link href="/" className="wordmark">Open<span>/</span>Analysis</Link>
            <nav className="main">
              <Link href="/">Leaderboard</Link>
              <Link href="/models">Models</Link>
              <Link href="/benchmarks">Benchmarks</Link>
              <Link href="/methodology">Methodology</Link>
            </nav>
            <div className="spacer" />
            <Link href="/contribute" className="btn">Add a benchmark</Link>
          </div>
        </header>
        <div className="wrap">{children}</div>
        <footer className="site">
          <div className="wrap">
            <span>Data as of {snap.date}</span>
            <a href={REPO}>Source on GitHub</a>
            <span>MIT licensed. Benchmark results belong to their publishers.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
