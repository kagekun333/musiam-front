import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative: string) => fs.existsSync(path.join(root, relative));
let checks = 0;

function check(name: string, predicate: () => void) {
  predicate();
  checks += 1;
  console.log(`PASS ${checks}: ${name}`);
}

function main() {
  const route = read("src/pages/api/chat-experience-v3.ts");
  const page = read("src/pages/chat.tsx");
  const historyApi = read("src/pages/api/chat-history.ts");
  const historyServer = read("src/lib/chat-history.server.ts");
  const plan = read("docs/AI/RECOVERY_PLAN.md");
  const recovery = read("docs/AI/R7C2_PAID_CONTINUATION_RECOVERY.md");

  // These fail-closed fixtures prove the active path cannot turn a missing
  // product contract into a dead-end paywall.
  check("active hard cap remains the 20-turn abuse/cost guard", () => assert.match(route, /const HARD_MAX_USER_TURNS = 20;/));
  check("hard-cap response is a close, not an access purchase state", () => assert.match(route, /assistantText = timeCopy\.longClose/));
  check("active route has no historical count-access import", () => assert.doesNotMatch(route, /count-access\.server/));
  check("active route has no server access reservation", () => assert.doesNotMatch(route, /reserveCountAccess/));
  check("active route has no paid-continuation checkout call", () => assert.doesNotMatch(route, /checkout\.sessions/));
  check("active route has no payment-intent verification", () => assert.doesNotMatch(route, /paymentIntent/i));
  check("active route has no Redis entitlement state", () => assert.doesNotMatch(route, /@upstash\/redis|new Redis\(/));
  check("active UI has no paid-continuation checkout state", () => assert.doesNotMatch(page, /paidContinuation|purchase_required/));
  check("history API remains a separately scoped endpoint", () => assert.match(historyApi, /conversationId/));
  check("history server has no entitlement vocabulary", () => assert.doesNotMatch(historyServer, /entitlement|credit|checkout/i));
  check("history deletion remains available", () => assert.match(page, /api\/chat-history\?conversationId=/));
  check("historical count-access candidate was not copied into clean source", () => assert.equal(exists("src/lib/count-access.server.ts"), false));
  check("no chat paid-continuation checkout API was recovered", () => assert.equal(exists("src/pages/api/chat-continuation-checkout.ts"), false));
  check("no chat paid-continuation entitlement API was recovered", () => assert.equal(exists("src/pages/api/chat-entitlement.ts"), false));
  check("recovery plan records the product-contract block", () => assert.match(plan, /R7-C2\|15-turn \/ paid continuation\|`BLOCKED_PRODUCT_CONTRACT`/));
  check("recovery record marks the historical 500-yen proposal non-canonical", () => assert.match(recovery, /Historical 500円.*not a canonical price/i));
  check("recovery record prohibits active 15-turn gating", () => assert.match(recovery, /PAID_CONTINUATION_NOT_ACTIVATED/));
  check("recovery record separates history from entitlement", () => assert.match(recovery, /history != entitlement/));
  check("recovery record separates redirect from verification", () => assert.match(recovery, /success redirect != payment verification/));
  check("recovery record keeps production parity unverified", () => assert.match(recovery, /PRODUCTION_PARITY = UNVERIFIED/));

  assert.equal(checks, 20);
  console.log(`R7-C2 fail-closed fixtures: PASS (${checks}/20), provider/network 0`);
}

main();
