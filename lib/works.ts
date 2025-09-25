// lib/works.ts
import fs from "node:fs";
import path from "node:path";

let cache: any[] | null = null;
let mtime = 0;

function normalizeWorks(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && Array.isArray(raw.works)) return raw.works;
  return [];
}

export async function loadAllWorksCached(): Promise<any[]> {
  const p = path.resolve(process.cwd(), "public/works/works.json");
  const stat = fs.statSync(p);
  if (!cache || stat.mtimeMs !== mtime) {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    cache = normalizeWorks(raw);
    mtime = stat.mtimeMs;
  }
  return cache!;
}
