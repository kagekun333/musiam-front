import type { CatalogWork } from "@/lib/mergeWorksCatalog";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { getAppleReleaseOverlayStore } from "@/lib/apple-release-overlay-store.server";
import { mergeLiveCatalogWorks, readAppleReleaseOverlay, type OverlayReadStatus } from "@/lib/apple-release-overlay";

export async function loadLiveMergedWorksServer(): Promise<CatalogWork[]> {
  return (await loadLiveMergedWorksServerWithStatus()).works;
}

export async function loadLiveMergedWorksServerWithStatus(input: {
  baseLoader?: () => Promise<CatalogWork[]>;
  store?: Parameters<typeof readAppleReleaseOverlay>[0];
} = {}): Promise<{ works: CatalogWork[]; overlayStatus: OverlayReadStatus }> {
  const baseWorks = await (input.baseLoader ?? loadMergedWorksServer)();
  let store = input.store;
  if (store === undefined) {
    try { store = getAppleReleaseOverlayStore(); }
    catch { return { works: baseWorks.slice(), overlayStatus: "UNAVAILABLE" }; }
  }
  const overlay = await readAppleReleaseOverlay(store);
  return { works: mergeLiveCatalogWorks(baseWorks, overlay.snapshot), overlayStatus: overlay.status };
}
