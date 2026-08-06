import assert from "node:assert/strict";
import fs from "node:fs";

const queue = JSON.parse(fs.readFileSync("ops/audience-engine/abi-hakusyaku-launch-wave-01-maturity-queue.json", "utf8"));
const ledgerLines = fs.readFileSync("ops/audience-engine/abi-hakusyaku-launch-wave-01-ledger.csv", "utf8").trim().split("\n");
const publishedInLedger = ledgerLines.slice(1).filter((line) => line.includes('","PUBLISHED","')).length;

function validateQueue(candidate, expectedPublished) {
  assert.equal(candidate.placements.length, 22);
  assert.equal(candidate.summary.published, expectedPublished);
  assert.equal(candidate.summary.due24h, candidate.placements.filter((item) => item.measurement24h.state === "DUE").length);
  assert.equal(candidate.summary.due72h, candidate.placements.filter((item) => item.measurement72h.state === "DUE").length);
  assert.equal(candidate.summary.resolved24h, candidate.placements.filter((item) => item.measurement24h.state === "RESOLVED").length);
  assert.equal(candidate.summary.resolved72h, candidate.placements.filter((item) => item.measurement72h.state === "RESOLVED").length);
  const expectedDueIds = [...new Set([
    ...candidate.placements.filter((item) => item.measurement24h.state === "DUE"),
    ...candidate.placements.filter((item) => item.measurement72h.state === "DUE"),
  ].map((item) => item.placementId))];
  assert.deepEqual(candidate.duePlacementIds, expectedDueIds);
  if (candidate.summary.nextMaturityAt !== null) assert.ok(Number.isFinite(Date.parse(candidate.summary.nextMaturityAt)));
  for (const placement of candidate.placements) {
    assert.ok(["NOT_PUBLISHED", "WAITING", "DUE", "RESOLVED"].includes(placement.measurement24h.state));
    assert.ok(["NOT_PUBLISHED", "WAITING", "DUE", "RESOLVED"].includes(placement.measurement72h.state));
  }
}

validateQueue(queue, publishedInLedger);

// A future mature/resolved queue must remain valid; validators may not freeze today's counts.
const future = structuredClone(queue);
const futurePlacement = future.placements.find((item) => item.publishedAt);
assert.ok(futurePlacement, "future fixture requires a published placement");
futurePlacement.measurement24h.state = "RESOLVED";
future.summary.resolved24h = future.placements.filter((item) => item.measurement24h.state === "RESOLVED").length;
future.summary.due24h = future.placements.filter((item) => item.measurement24h.state === "DUE").length;
future.duePlacementIds = [...new Set([
  ...future.placements.filter((item) => item.measurement24h.state === "DUE"),
  ...future.placements.filter((item) => item.measurement72h.state === "DUE"),
].map((item) => item.placementId))];
validateQueue(future, publishedInLedger);

assert.match(queue.resolutionContract, /Never use zero to mean unavailable/);
console.log(`ABI Launch Wave maturity queue: PASS — dynamic current/future invariants; published=${queue.summary.published}, due24h=${queue.summary.due24h}, next=${queue.summary.nextMaturityAt}`);
