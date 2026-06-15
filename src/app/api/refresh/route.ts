import { NextResponse } from "next/server";
import { fetchAllJalur, getStatus } from "@/lib/spmb-browser";

// Puppeteer needs the Node.js runtime, not edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const results = await fetchAllJalur();
    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message, status: getStatus() },
      { status: 500 }
    );
  }
}
