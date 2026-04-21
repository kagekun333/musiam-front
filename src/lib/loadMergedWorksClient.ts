import { mergeWorksCatalog, type CatalogWork } from "@/lib/mergeWorksCatalog";

async function fetchJson(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return res.json();
}

export async function loadMergedWorksClient(): Promise<CatalogWork[]> {
  const [masterJson, ssdJson] = await Promise.all([
    fetchJson("/works/works.json"),
    fetchJson("/works/works-ssd.json").catch(() => ({ items: [] })),
  ]);
  return mergeWorksCatalog(masterJson, ssdJson);
}
