import { liteSnapshot } from "@/lib/data";

export const dynamic = "force-static";

/** One shared, cacheable copy of the data for the model pages' charts. */
export function GET() {
  return Response.json(liteSnapshot(), { headers: { "Cache-Control": "public, max-age=3600" } });
}
