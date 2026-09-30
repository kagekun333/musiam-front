import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import editorialJson from "../../public/works/editorial-knowledge.json";
import { buildWorkKnowledgeEnvelope } from "../../src/lib/chat-release-knowledge";
import { loadMergedWorksServer } from "../../src/lib/loadMergedWorksServer";
import { dedupeWorks } from "../../src/lib/dedupeWorks";
import { projectExhibitionWorks } from "../../src/lib/exhibition-projection";
import type { CatalogWork } from "../../src/lib/mergeWorksCatalog";

const REPO = process.cwd();
const LETTER_ROOT = path.join(REPO, "content/letters");

const trancheIds = [
  "spotify-single-5bIfjfVK9QwHfu1NzNc94M",
  "spotify-single-60QCBTuEwNc380r2YtUO0f",
  "spotify-single-7s0xajVHIGgMYdwUuj48Cb",
  "spotify-single-2ti9uIOu2JPOMMzUf41Snl",
  "spotify-single-5Upi5xvmOJeJy5Asmdvimp",
  "spotify-album-1NKoPWYQcHc64FtHt23vm8",
  "spotify-single-0ol0erPK3VG7zT3lgjxU06",
  "spotify-single-7pL3uJQ3s6iNS6dK8JTjtW",
  "spotify-single-76dP6vCO6ZcRdITKr34znQ",
  "spotify-single-3BIOa6bVUntKFbZVC8n4Rs",
  "spotify-single-0fLDjvSsCiMvK7l0Yqb7Pa",
  "spotify-single-18L8cZMCoYylC09TiZAi0z",
  "spotify-single-5esj0yCWW7PnK3YJRpGR4s",
  "spotify-single-2Xb6klIRauA4zxhrddldUn",
  "spotify-single-5JYgZgm324NPTCkiAyFjbb",
  "spotify-single-2PB3rZMx4luyCZUAaRtLMq",
  "spotify-single-6njSivM1klHpaXooqKNwvS",
  "spotify-single-4tJO09k9mjc8y7I7gphaH1",
  "spotify-single-6Hn0j6sf1GdH6vSnoQBEW0",
  "spotify-single-4akPulmmHphQJBEgk96Cx8",
  "spotify-single-2kirIJ0L1WlgdEAlgrhw21",
  "infinite-graves-168",
  "back-me-130",
  "spotify-album-2DMwcXtZzZaeazATCTW5Xx",
] as const;

function sha256(file: string) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function letterMap() {
  const map = new Map<string, string>();
  for (const file of fs.readdirSync(LETTER_ROOT).filter((name) => name.endsWith(".md")).sort()) {
    const full = path.join(LETTER_ROOT, file);
    const text = fs.readFileSync(full, "utf8");
    const slug = text.match(/^slug:\s*(.+)$/m)?.[1]?.trim();
    if (slug) map.set(`/letters/${slug}`, full);
  }
  return map;
}

(async () => {
  const data = editorialJson as {
    schemaVersion?: number;
    evidenceKind?: string;
    items?: Array<Record<string, unknown>>;
  };
  const items = data.items ?? [];
  assert.equal(data.schemaVersion, 1);
  assert.equal(items.length, 52);

  const byId = new Map<string, any>();
  for (const item of items) {
    const ids = Array.from(new Set([
      String(item.workId ?? "").trim(),
      ...((item.workIds as unknown[] | undefined) ?? []).map((value) => String(value ?? "").trim()),
    ].filter(Boolean)));
    for (const id of ids) {
      assert.ok(!byId.has(id), `Editorial stable ID appears in more than one row: ${id}`);
      byId.set(id, item);
    }
  }

  const letters = letterMap();
  const rawCatalog = await loadMergedWorksServer();
  const catalog = dedupeWorks(rawCatalog);
  const rawCatalogById = new Map(rawCatalog.filter((work) => work.id).map((work) => [String(work.id), work] as const));
  const catalogIds = new Set<string>();
  for (const work of catalog) {
    if (work.id) catalogIds.add(String(work.id));
    for (const alias of work.catalogAliases ?? []) catalogIds.add(String(alias));
  }

  let explicit = 0;
  let notExplicit = 0;
  const usedLetters = new Set<string>();

  for (const id of trancheIds) {
    const row = byId.get(id);
    assert.ok(row, `Missing tranche editorial row: ${id}`);
    assert.equal(row.sourceClass, "OWNER_PUBLISHED_MEDIA", id);
    assert.ok(String(row.summaryJa ?? "").trim().length >= 12, `Missing useful summary: ${id}`);
    assert.ok(/^[a-f0-9]{64}$/.test(String(row.sourceFileHash ?? "")), `Bad source hash: ${id}`);
    assert.ok(catalogIds.has(id), `Stable ID not found in canonical catalog/aliases: ${id}`);

    const sourceHref = String(row.sourceHref ?? "");
    const sourceFile = letters.get(sourceHref);
    assert.ok(sourceFile, `Letter slug not found for ${id}: ${sourceHref}`);
    assert.equal(sha256(sourceFile!), row.sourceFileHash, `Letter hash mismatch: ${id}`);
    usedLetters.add(sourceFile!);

    if (row.ownerIntentStatus === "EXPLICIT") {
      explicit += 1;
      assert.ok(String(row.ownerIntentSummaryJa ?? "").trim().length >= 12, `Explicit owner intent requires a summary: ${id}`);
    } else if (row.ownerIntentStatus === "NOT_EXPLICIT") {
      notExplicit += 1;
      assert.ok(!String(row.ownerIntentSummaryJa ?? "").trim(), `NOT_EXPLICIT must not carry owner intent prose: ${id}`);
    } else {
      assert.fail(`Unexpected ownerIntentStatus for tranche row ${id}: ${row.ownerIntentStatus}`);
    }
  }

  assert.equal(explicit, 21);
  assert.equal(notExplicit, 3);
  assert.equal(usedLetters.size, 12);

  const workById = new Map<string, CatalogWork>();
  for (const work of catalog) {
    if (work.id) workById.set(String(work.id), work);
  }

  for (const id of [
    "back-me-130",
    "spotify-single-60QCBTuEwNc380r2YtUO0f",
    "spotify-single-2kirIJ0L1WlgdEAlgrhw21",
    "spotify-single-6njSivM1klHpaXooqKNwvS",
  ]) {
    const work = workById.get(id);
    assert.ok(work, `Missing representative catalog work: ${id}`);
    const envelope = buildWorkKnowledgeEnvelope(work!);
    assert.equal(envelope?.editorial?.ownerIntentStatus, "EXPLICIT", id);
    assert.ok(!envelope?.unknowns.includes("ownerProductionIntent"), id);
  }

  for (const id of [
    "spotify-single-5Upi5xvmOJeJy5Asmdvimp",
    "spotify-album-1NKoPWYQcHc64FtHt23vm8",
    "spotify-single-2PB3rZMx4luyCZUAaRtLMq",
  ]) {
    const work = workById.get(id);
    assert.ok(work, `Missing representative NOT_EXPLICIT work: ${id}`);
    const envelope = buildWorkKnowledgeEnvelope(work!);
    assert.equal(envelope?.editorial?.ownerIntentStatus, "NOT_EXPLICIT", id);
    assert.ok(envelope?.unknowns.includes("ownerProductionIntent"), id);
  }

  const providerDuplicateBindings = [
    { id: "spotify-single-5e8xTCcPJWfd2SUHsjd1BW", expectedWorkId: "back-me-130", title: "Back Me" },
    { id: "spotify-single-022wqGt3TzfjInPuDgHGXf", expectedWorkId: "infinite-graves-168", title: "Infinite Graves" },
    { id: "house-in-the-world-131", expectedWorkId: "spotify-album-2DMwcXtZzZaeazATCTW5Xx", title: "House in the World" },
  ] as const;

  for (const binding of providerDuplicateBindings) {
    const row = byId.get(binding.id);
    assert.ok(row, `Missing reviewed provider duplicate binding: ${binding.id}`);
    assert.equal(row.workId, binding.expectedWorkId, `Provider duplicate mapped to wrong editorial row: ${binding.id}`);
    const rawWork = rawCatalogById.get(binding.id);
    assert.ok(rawWork, `Provider duplicate not found in raw catalog: ${binding.id}`);
    const envelope = buildWorkKnowledgeEnvelope(rawWork!);
    assert.ok(envelope?.editorial?.summaryJa, `Provider duplicate must receive editorial knowledge: ${binding.id}`);
  }

  const projectedDuplicates = projectExhibitionWorks(
    providerDuplicateBindings.map((binding) => rawCatalogById.get(binding.id)!).filter(Boolean),
    undefined,
    "2026-09-30",
  ).works;
  for (const binding of providerDuplicateBindings) {
    const projected = projectedDuplicates.find((work) => work.id === binding.id);
    assert.ok(String(projected?.description ?? "").trim(), `Provider duplicate must receive Exhibition description: ${binding.id}`);
  }

  const fake: CatalogWork = {
    id: "fake-back-me-id",
    title: "Back Me",
    type: "music",
    releasedAt: "2025-04-30",
  };
  const fakeEnvelope = buildWorkKnowledgeEnvelope(fake);
  assert.equal(fakeEnvelope?.editorial, null, "Same-title fake ID must not inherit Back Me owner source");

  console.log(JSON.stringify({
    verdict: "OWNER_SOURCE_KNOWLEDGE_COVERAGE_V1=PASS_LOCAL",
    editorialItems: items.length,
    trancheAdded: trancheIds.length,
    explicitOwnerIntent: explicit,
    nonExplicitOwnerIntent: notExplicit,
    sourceLettersVerified: usedLetters.size,
    providerDuplicateBindings: providerDuplicateBindings.length,
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
