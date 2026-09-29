import type { CatalogWork } from "@/lib/mergeWorksCatalog";
import { APPLE_RELEASE_OVERLAY_KEY, AppleReleaseSyncError, runAppleReleaseSync, type AppleReleaseOverlayStore } from "@/lib/apple-release-overlay";
import { isAuthorizedAppleReleaseCronRequest } from "@/lib/apple-release-cron-auth";

export async function handleAppleReleaseCron(request: Request, dependencies: {
  secret: string | undefined;
  getStore: () => AppleReleaseOverlayStore | null;
  loadBaseWorks: () => Promise<CatalogWork[]>;
  fetcher?: typeof fetch;
  now?: Date;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!isAuthorizedAppleReleaseCronRequest(request, dependencies.secret)) return { status: 401, body: { ok: false, error: "unauthorized" } };
  let store: AppleReleaseOverlayStore | null;
  try { store = dependencies.getStore(); }
  catch { return { status: 503, body: { ok: false, error: "overlay_store_unavailable" } }; }
  if (!store) return { status: 503, body: { ok: false, error: "overlay_store_unavailable" } };
  try {
    const baseWorks = await dependencies.loadBaseWorks();
    const report = await runAppleReleaseSync({ baseWorks, store, fetcher: dependencies.fetcher, now: dependencies.now });
    return { status: 200, body: { ok: true, key: APPLE_RELEASE_OVERLAY_KEY, ...report } };
  } catch (error) {
    const code = error instanceof AppleReleaseSyncError ? error.code : "APPLE_RELEASE_SYNC_FAILED";
    return { status: code.startsWith("APPLE_LOOKUP") ? 502 : 503, body: { ok: false, error: code } };
  }
}
