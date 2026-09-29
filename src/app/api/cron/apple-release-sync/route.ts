import { NextResponse, type NextRequest } from "next/server";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { getAppleReleaseOverlayStore } from "@/lib/apple-release-overlay-store.server";
import { handleAppleReleaseCron } from "@/lib/apple-release-cron-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const result = await handleAppleReleaseCron(request, {
    secret: process.env.CRON_SECRET,
    getStore: getAppleReleaseOverlayStore,
    loadBaseWorks: loadMergedWorksServer,
  });
  return NextResponse.json(result.body, { status: result.status });
}
