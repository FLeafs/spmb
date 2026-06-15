import { NextResponse } from "next/server";
import { ensureBrowser, getStatus } from "@/lib/spmb-browser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Kick off browser startup if it hasn't begun, but don't block the response.
  ensureBrowser().catch(() => {});
  return NextResponse.json({ status: getStatus() });
}
