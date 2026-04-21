import fs from "node:fs/promises";
import path from "node:path";
import { mergeWorksCatalog, type CatalogWork } from "@/lib/mergeWorksCatalog";

async function readJson(rel: string) {
  const p = path.join(process.cwd(), rel);
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw);
}

export async function loadMergedWorksServer(): Promise<CatalogWork[]> {
  const [masterJson, ssdJson] = await Promise.all([
    readJson("public/works/works.json"),
    readJson("public/works/works-ssd.json").catch(() => ({ items: [] })),
  ]);
  return mergeWorksCatalog(masterJson, ssdJson);
}
