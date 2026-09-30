import { mergeWorksCatalog, type CatalogWork } from "@/lib/mergeWorksCatalog";
import masterJson from "../../public/works/works.json";
import ssdJson from "../../public/works/works-ssd.json";
import importJson from "../../public/works/catalog-imports.json";
import readinessJson from "../../public/works/catalog-readiness.json";
import distributionReleaseJson from "../../public/works/distrokid-release-metadata.json";
import resolvedDistroKidJson from "../../public/works/distrokid-release-resolutions.json";
import workIntelligenceJson from "../../public/works/work-intelligence.json";
import { projectStoredReleaseMetadata, type CanonicalRelease } from "@/lib/distrokid-release-ingestion";
import { projectResolvedDistroKidRelease, type AppleReleaseResolution } from "@/lib/distrokid-catalog-projection";
import { applyWorkIntelligence, type WorkIntelligenceFile } from "@/lib/catalog-intelligence";

type ReadinessRow = {
  id?: string | number;
  catalogStatus?: CatalogWork["catalogStatus"];
};

function statusFor(work: CatalogWork, rows: ReadinessRow[]): CatalogWork["catalogStatus"] | undefined {
  const stableIds = new Set([String(work.id ?? ""), ...(work.catalogAliases ?? [])]);
  return rows.find((row) => stableIds.has(String(row.id ?? "")))?.catalogStatus;
}

export async function loadMergedWorksServer(): Promise<CatalogWork[]> {
  // Imports are a separate primary-adjacent source. `works.json` remains intact.
  const baseCatalog = mergeWorksCatalog(mergeWorksCatalog(masterJson, importJson), ssdJson);
  const resolvedItems = ((resolvedDistroKidJson.releases ?? []) as AppleReleaseResolution[])
    .map((record) => projectResolvedDistroKidRelease(record))
    .filter((work): work is CatalogWork => work !== null);
  const catalog = mergeWorksCatalog(baseCatalog, { items: resolvedItems });
  const readinessRows = (readinessJson.items ?? []) as ReadinessRow[];

  const projected = projectStoredReleaseMetadata(catalog, loadStoredDistributionReleases());
  const withStatus = projected.map((work) => ({
    ...work,
    catalogStatus: statusFor(work, readinessRows) ?? work.catalogStatus,
  }));
  return applyWorkIntelligence(withStatus, workIntelligenceJson as WorkIntelligenceFile);
}

export function loadStoredDistributionReleases(): CanonicalRelease[] {
  return (distributionReleaseJson.releases ?? []) as CanonicalRelease[];
}
