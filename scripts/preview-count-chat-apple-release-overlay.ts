import { loadMergedWorksServer } from "../src/lib/loadMergedWorksServer";
import { APPLE_ARTIST_LOOKUP_URL, AppleReleaseSyncError, runAppleReleaseSync, type AppleReleaseOverlaySnapshot, type AppleReleaseOverlayStore } from "../src/lib/apple-release-overlay";

class InMemoryPreviewStore implements AppleReleaseOverlayStore {
  snapshot: AppleReleaseOverlaySnapshot | null = null;
  reads = 0;
  writes = 0;
  async get() { this.reads += 1; return this.snapshot; }
  async set(_key: string, snapshot: AppleReleaseOverlaySnapshot) { this.writes += 1; this.snapshot = snapshot; }
}

async function main() {
  let baseWorks: Awaited<ReturnType<typeof loadMergedWorksServer>> | null = null;
  const previewStore = new InMemoryPreviewStore();
  let lookupAttempted = false;
  try {
    baseWorks = await loadMergedWorksServer();
    lookupAttempted = true;
    const report = await runAppleReleaseSync({ baseWorks, store: previewStore });
    process.stdout.write(`${JSON.stringify({
      result: "APPLE_PUBLIC_DRY_RUN_PASS",
      lookupCategory: "SUCCESS",
      lookupHost: new URL(APPLE_ARTIST_LOOKUP_URL).hostname,
      baseCatalogCount: baseWorks.length,
      musicCount: baseWorks.filter((work) => work.type === "music").length,
      bookCount: baseWorks.filter((work) => work.type === "book").length,
      ...report,
      oneTimeHistoricalBackfillRequired: report.backfillWindowStatus === "BACKFILL_WINDOW_NOT_REACHED"
        ? true
        : report.backfillWindowStatus === "BACKFILL_WINDOW_REACHED" ? false : null,
      newStableIds: report.statuses.filter((item) => item.status === "NEW").map((item) => item.id),
      storage: "in-memory fixture only",
      fakeStoreReads: previewStore.reads,
      fakeStoreWrites: previewStore.writes,
      realRedisOperations: 0,
      providerCalls: 0,
    }, null, 2)}\n`);
  } catch (error) {
    const syncError = error instanceof AppleReleaseSyncError ? error : null;
    process.stdout.write(`${JSON.stringify({
      result: "APPLE_PUBLIC_DRY_RUN_FAILED",
      lookupAttempted,
      failureCode: syncError?.code ?? "DRY_RUN_RUNTIME_FAILURE",
      lookupCategory: syncError?.lookupDiagnostic?.category ?? null,
      lookupHost: syncError?.lookupDiagnostic?.host ?? (lookupAttempted ? new URL(APPLE_ARTIST_LOOKUP_URL).hostname : null),
      failurePhase: syncError?.lookupDiagnostic?.phase ?? null,
      httpStatus: syncError?.lookupDiagnostic?.httpStatus ?? null,
      baseCatalogCount: baseWorks?.length ?? null,
      musicCount: baseWorks?.filter((work) => work.type === "music").length ?? null,
      bookCount: baseWorks?.filter((work) => work.type === "book").length ?? null,
      fakeStoreReads: previewStore.reads,
      fakeStoreWrites: previewStore.writes,
      realRedisOperations: 0,
      providerCalls: 0,
    }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

main().catch(() => {
  process.stderr.write("APPLE_PUBLIC_DRY_RUN_RUNTIME_FAILURE\n");
  process.exitCode = 1;
});
