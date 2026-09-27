import fs from "node:fs";
import path from "node:path";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import {
  classifyReleaseIngestion,
  mergeReleaseState,
  parseCanonicalReleaseDocument,
  type CanonicalRelease,
} from "@/lib/distrokid-release-ingestion";

const statePath = path.resolve("public/works/distrokid-release-metadata.json");

function parseCsv(text: string): unknown[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const [headers, ...data] = rows;
  if (!headers?.length || headers.some((header) => !header.trim()) || new Set(headers).size !== headers.length) throw new Error("CSV header row is missing or duplicated");
  return data.filter((values) => values.some((value) => value.trim())).map((values) => {
    if (values.length !== headers.length) throw new Error("CSV row width does not match header");
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      const key = header.trim();
      const cellValue = values[index].trim();
      record[key] = cellValue || (key === "publicUrls" ? [] : key === "releaseIdentifiers" ? {} : null);
    });
    for (const field of ["publicUrls", "releaseIdentifiers"]) {
      if (typeof record[field] === "string") {
        if (!(record[field] as string).trim()) { record[field] = field === "publicUrls" ? [] : {}; continue; }
        try { record[field] = JSON.parse(record[field] as string); }
        catch { throw new Error(`CSV ${field} cell must contain JSON`); }
      }
    }
    return record;
  });
}

function readInput(file: string): unknown {
  const text = fs.readFileSync(file, "utf8");
  if (path.extname(file).toLowerCase() === ".csv") return parseCsv(text);
  return JSON.parse(text) as unknown;
}

async function main() {
  const inputArg = process.argv.slice(2).find((arg) => arg.startsWith("--input="));
  const inputPath = inputArg?.slice("--input=".length);
  if (!inputPath) throw new Error("usage: node --import tsx scripts/import-distrokid-release-metadata.ts --input=<canonical.csv|json> [--apply]");
  const apply = process.argv.includes("--apply");
  const incoming = parseCanonicalReleaseDocument(readInput(path.resolve(inputPath)));
  const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as { schemaVersion: number; releases?: CanonicalRelease[] };
  if (state.schemaVersion !== 1 || !Array.isArray(state.releases)) throw new Error("stored release state schema is invalid");
  const works = await loadMergedWorksServer();
  const results = classifyReleaseIngestion({ incoming, stored: state.releases, works });
  if (apply) {
    const releases = mergeReleaseState(state.releases, results);
    const temporaryPath = `${statePath}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify({ schemaVersion: 1, releases }, null, 2)}\n`, { flag: "w" });
    fs.renameSync(temporaryPath, statePath);
  }
  const counts = { NEW: 0, CHANGED: 0, UNCHANGED: 0, UNRESOLVED: 0 };
  const affectedStableIds = new Set<string>();
  const pendingCatalogCompletion = new Set<string>();
  for (const result of results) {
    counts[result.status]++;
    if ((result.status === "NEW" || result.status === "CHANGED") && result.workId) affectedStableIds.add(result.workId);
    if ((result.status === "NEW" || result.status === "CHANGED") && !result.workId && result.key) {
      pendingCatalogCompletion.add(result.key);
    }
  }
  process.stdout.write(`${JSON.stringify({
    mode: apply ? "APPLIED_SOURCE_STATE" : "DRY_RUN",
    counts,
    affectedStableIds: [...affectedStableIds].sort(),
    pendingCatalogCompletion: [...pendingCatalogCompletion].sort(),
    unresolvedRows: results.filter((result) => result.status === "UNRESOLVED").length,
    latestReleaseOrdering: "computed dynamically from projected runtime Catalog",
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "release ingestion failed"}\n`);
  process.exitCode = 1;
});
