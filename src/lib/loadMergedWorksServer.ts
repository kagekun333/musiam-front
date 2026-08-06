import { mergeWorksCatalog, type CatalogWork } from "@/lib/mergeWorksCatalog";
import masterJson from "../../public/works/works.json";
import ssdJson from "../../public/works/works-ssd.json";

export async function loadMergedWorksServer(): Promise<CatalogWork[]> {
  return mergeWorksCatalog(masterJson, ssdJson);
}
