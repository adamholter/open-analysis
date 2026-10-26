import { BenchList } from "@/components/oa/BenchList";

/** Benchmarks: the list stays on the left while you move between benchmarks on the right. */
export default function BenchmarksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="oa-body no-side">
      <main className="oa-main oa-bl">
        <BenchList />
        <div className="oa-bldetail">{children}</div>
      </main>
    </div>
  );
}
