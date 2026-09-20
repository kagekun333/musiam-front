import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { mergeWorksCatalog } from "../src/lib/mergeWorksCatalog";
import { loadMergedWorksServer } from "../src/lib/loadMergedWorksServer";

type Document = { items?: unknown[] };
type ManifestEntry = { path: string; sha256: string; itemCount: number };
type Manifest = {
  primaryMaster: ManifestEntry;
  runtimeSidecars: ManifestEntry[];
  knowledgeSidecars: ManifestEntry[];
  r4ClaimsMatrix: string;
  importCoverBundle: { itemCount: number; totalBytes: number; sha256: string };
  productionParity: string;
};

const root = process.cwd();
const readJson = <T>(relativePath: string): T =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8")) as T;
const sha256 = (relativePath: string) =>
  crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
const items = (document: Document): Record<string, unknown>[] =>
  Array.isArray(document.items) ? document.items.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object") : [];

function requireUniqueIds(label: string, rows: Record<string, unknown>[]) {
  const ids = rows.map((row) => String(row.id ?? row.workId ?? ""));
  assert.ok(ids.every(Boolean), `${label}: every row needs a stable id or workId`);
  assert.equal(new Set(ids).size, ids.length, `${label}: duplicate stable IDs are forbidden`);
}

function assertLinksAreTyped(label: string, rows: Record<string, unknown>[]) {
  for (const row of rows) {
    assert.equal(typeof row.id, "string", `${label}: id must be a string`);
    assert.equal(typeof row.title, "string", `${label}: title must be a string`);
    assert.equal(typeof row.type, "string", `${label}: type must be a string`);
    assert.equal(typeof row.cover, "string", `${label}: cover must be a string`);
    assert.equal(typeof row.releasedAt, "string", `${label}: releasedAt must be a string`);
    const links = row.links;
    if (links !== undefined) {
      assert.ok(Array.isArray(links) || (links !== null && typeof links === "object"), `${label}: links must be an object or array`);
    }
  }
}

function assertCoverFiles(rows: Record<string, unknown>[]) {
  for (const row of rows) {
    const cover = String(row.cover ?? "");
    assert.ok(cover.startsWith("/"), `catalog import ${String(row.id)}: cover must be a public-root path`);
    assert.ok(fs.existsSync(path.join(root, "public", cover)), `catalog import ${String(row.id)}: cover is missing`);
  }
}

function importCoverBundle(rows: Record<string, unknown>[]) {
  const entries = rows.map((row) => {
    const publicPath = String(row.cover ?? "");
    const relativePath = `public${publicPath}`;
    return {
      relativePath,
      bytes: fs.statSync(path.join(root, relativePath)).size,
      sha256: sha256(relativePath),
    };
  }).sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return {
    itemCount: entries.length,
    totalBytes: entries.reduce((total, entry) => total + entry.bytes, 0),
    sha256: crypto.createHash("sha256").update(entries.map((entry) => `${entry.relativePath}:${entry.sha256}`).join("\n")).digest("hex"),
  };
}

const manifest = readJson<Manifest>("public/works/catalog-foundation.manifest.json");
const manifestEntries = [manifest.primaryMaster, ...manifest.runtimeSidecars, ...manifest.knowledgeSidecars];
for (const entry of manifestEntries) {
  assert.equal(sha256(entry.path), entry.sha256, `${entry.path}: source hash changed without an explicit manifest update`);
  assert.equal(items(readJson<Document>(entry.path)).length, entry.itemCount, `${entry.path}: unexpected item count`);
}

const masterDocument = readJson<Document>(manifest.primaryMaster.path);
const importsDocument = readJson<Document>(manifest.runtimeSidecars[0].path);
const ssdDocument = readJson<Document>(manifest.runtimeSidecars[1].path);
const readinessDocument = readJson<Document>(manifest.runtimeSidecars[2].path);
const contentEvidenceDocument = readJson<Document>(manifest.knowledgeSidecars[0].path);
const editorialDocument = readJson<Document>(manifest.knowledgeSidecars[1].path);
const droneCandidateDocument = readJson<Document>(manifest.knowledgeSidecars[2].path);
const master = items(masterDocument);
const imports = items(importsDocument);
const ssd = items(ssdDocument);
const readiness = items(readinessDocument);
const contentEvidence = items(contentEvidenceDocument);
const editorial = items(editorialDocument);
const droneCandidates = items(droneCandidateDocument);

requireUniqueIds("primary master", master);
requireUniqueIds("catalog imports", imports);
requireUniqueIds("catalog readiness", readiness);
requireUniqueIds("content evidence", contentEvidence);
requireUniqueIds("editorial knowledge", editorial);
requireUniqueIds("drone candidate source", droneCandidates);
assertLinksAreTyped("catalog imports", imports);
assertCoverFiles(imports);
assert.deepEqual(importCoverBundle(imports), manifest.importCoverBundle, "catalog import cover bundle changed without an explicit manifest update");

const masterIds = new Set(master.map((row) => String(row.id)));
for (const row of ssd) {
  const canonicalMasterId = row.canonicalMasterId;
  if (canonicalMasterId !== undefined) {
    assert.ok(masterIds.has(String(canonicalMasterId)), `SSD canonical mapping targets missing primary ID: ${String(canonicalMasterId)}`);
  }
}

const projection = mergeWorksCatalog(
  mergeWorksCatalog(masterDocument, importsDocument),
  ssdDocument,
);
const rerun = mergeWorksCatalog(
  mergeWorksCatalog(masterDocument, importsDocument),
  ssdDocument,
);
assert.deepEqual(rerun, projection, "runtime projection must be deterministic");
requireUniqueIds("runtime projection", projection as Record<string, unknown>[]);
const serverProjectionPromise = loadMergedWorksServer();

const titleOnly = mergeWorksCatalog(
  [{ id: "primary-a", title: "Same title", type: "music" }],
  [{ id: "source-b", title: "Same title", type: "music" }],
);
assert.equal(titleOnly.length, 2, "title equality must not merge works");
const explicitCanonical = mergeWorksCatalog(
  [{ id: "primary-a", title: "Older title", type: "music" }],
  [{ id: "source-b", title: "Newer title", type: "music", canonicalMasterId: "primary-a" }],
);
assert.equal(explicitCanonical.length, 1, "explicit canonical mapping must merge works");
assert.ok(explicitCanonical[0].catalogAliases?.includes("source-b"), "explicit canonical mapping must preserve an alias");
const releaseUuid = "a".repeat(32);
const exactRelease = mergeWorksCatalog(
  [{ id: "primary-a", title: "Edition one", type: "music", ssd: { albumuuid: releaseUuid } }],
  [{ id: "export-b", title: "Edition two", type: "music", ssd: { albumuuid: releaseUuid } }],
);
assert.equal(exactRelease.length, 1, "an exact release UUID may merge works");

for (const row of readiness) {
  const status = row.catalogStatus as Record<string, unknown> | undefined;
  assert.ok(status && typeof status.identityConflict === "boolean", `readiness ${String(row.id)}: identityConflict must be boolean`);
  for (const field of ["recommendationReady", "recommendationEligible"]) {
    assert.ok(status[field] === undefined || typeof status[field] === "boolean", `readiness ${String(row.id)}: ${field} must be boolean when present`);
  }
  assert.equal("evidence" in status, false, `readiness ${String(row.id)}: evidence must not promote readiness`);
}

const internalStrategyPattern = /MV映像イメージ|shorts\s*strategy|promotion\s*notes/i;
for (const [label, rows] of [["content evidence", contentEvidence], ["editorial knowledge", editorial]] as const) {
  assert.equal(internalStrategyPattern.test(JSON.stringify(rows)), false, `${label}: internal strategy text leaked into public knowledge`);
}
assert.equal(String((readJson<Record<string, unknown>>(manifest.knowledgeSidecars[2].path)).status), "CANDIDATE", "drone source must remain a candidate");

const claims = readJson<{ records: Array<{ workId: string; identityStatus: string; ambiguity: string | null }>; supplementalUnresolved: Array<{ workId: string; identityStatus: string; ambiguity: string | null }> }>(manifest.r4ClaimsMatrix);
const projectionIds = new Set(projection.map((work) => String(work.id)));
const publicR4 = claims.records.filter((record) => record.identityStatus === "RUNTIME_BOUND_PUBLIC_TRACK");
assert.equal(publicR4.length, 9, "R4 public evidence count changed unexpectedly");
assert.ok(publicR4.every((record) => projectionIds.has(record.workId)), "R4 public evidence must map by stable work ID");
const localCandidate = claims.records.filter((record) => record.identityStatus === "RUNTIME_BOUND_LOCAL_CANDIDATE");
assert.equal(localCandidate.length, 1, "R4 local candidate count changed unexpectedly");
assert.ok(localCandidate.every((record) => !projectionIds.has(record.workId)), "R4 local candidate must not be promoted into the runtime catalog");
assert.equal(claims.supplementalUnresolved.filter((record) => record.identityStatus === "UNRESOLVED").length, 1, "R4 unresolved identity must remain unresolved");
const ambiguousEvidence = [...claims.records, ...claims.supplementalUnresolved].filter((record) => record.ambiguity).length;
assert.equal(ambiguousEvidence, 5, "R4 ambiguous evidence must remain explicit");
assert.equal(manifest.productionParity, "UNVERIFIED", "production parity cannot be inferred locally");

void serverProjectionPromise.then((serverProjection) => {
  assert.deepEqual(
    serverProjection.map((work) => String(work.id)),
    projection.map((work) => String(work.id)),
    "the server loader must use the canonical projection",
  );
  console.log(JSON.stringify({
    status: "PASS",
    primaryMaster: master.length,
    primaryAdjacentImports: imports.length,
    ssdEnrichment: ssd.length,
    runtimeMerged: projection.length,
    readinessRows: readiness.length,
    readinessMapped: readiness.filter((row) => projectionIds.has(String(row.id))).length,
    contentEvidence: contentEvidence.length,
    editorialKnowledge: editorial.length,
    droneCandidatesDeferred: droneCandidates.length,
    r4EvidenceMapped: publicR4.length,
    r4AmbiguousRetained: ambiguousEvidence,
    productionParity: manifest.productionParity,
    networkRequests: 0,
  }));
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "R7A_SERVER_PROJECTION_FAILED");
  process.exitCode = 1;
});
