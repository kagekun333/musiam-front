import { mergeWorksCatalog, type CatalogWork } from "@/lib/mergeWorksCatalog";
import masterJson from "../../public/works/works.json";
import ssdJson from "../../public/works/works-ssd.json";
import importJson from "../../public/works/catalog-imports.json";
import readinessJson from "../../public/works/catalog-readiness.json";

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
  const catalog = mergeWorksCatalog(mergeWorksCatalog(masterJson, importJson), ssdJson);
  const readinessRows = (readinessJson.items ?? []) as ReadinessRow[];

  return catalog.map((work) => ({
    ...work,
    catalogStatus: statusFor(work, readinessRows),
  }));
}
