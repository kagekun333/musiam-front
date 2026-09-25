import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/chat.tsx", "utf8");
const styles = readFileSync("src/pages/chat.module.css", "utf8");
const navigation = readFileSync("src/components/Nav.tsx", "utf8");
const api = readFileSync("src/pages/api/chat-experience-v3.ts", "utf8");
const core = readFileSync("src/lib/chat-recommendation-core.ts", "utf8");
const contract = readFileSync("src/lib/chat-ui-contract.ts", "utf8");
const productRecord = JSON.parse(readFileSync("ops/product/chat-strengthening-01-20260925.json", "utf8"));

const checks = [
  ["all six supported locales have explicit intro copy", /ja: \{ title:/.test(page) && /en: \{ title:/.test(page) && /fr: \{ title:/.test(page) && /es: \{ title:/.test(page) && /de: \{ title:/.test(page) && /ar: \{ title:/.test(page)],
  ["first visit distinguishes the artist and conversational AI", /ABI伯爵/.test(page) && /separate entities|deux entités distinctes|entidades distintas|zwei verschiedene Personen|شخصيتان منفصلتان/.test(page)],
  ["starter guidance and free text path are present", /promptHint/.test(page) && /starterSection/.test(page) && /promptRow/.test(page)],
  ["opening and failed-message retry controls are both present", /Reload the welcome/.test(page) && /retryLastReply/.test(page)],
  ["reply timing is reduced while reduced-motion support remains", /HUMAN_REPLY_DELAY_MS = 900/.test(page) && /}, 22\)/.test(page) && /prefers-reduced-motion: reduce/.test(page)],
  ["mobile composer retains side-by-side controls", /@media \(max-width: 720px\)[\s\S]*?\.inputRow \{\s*grid-template-columns: minmax\(0, 1fr\) auto;/.test(styles)],
  ["mobile navigation keeps brand visible and scrolls links without wrapping", /shrink-0 font-semibold tracking-wide/.test(navigation) && /flex min-w-0 flex-1 items-center gap-5 overflow-x-auto whitespace-nowrap/.test(navigation) && /shrink-0 \$\{active/.test(navigation)],
  ["input and typing feedback expose accessible labels", /aria-label=\{ui\.inputPlaceholder\}/.test(page) && /role="status" aria-label=\{ui\.typingLabel\}/.test(page)],
  ["recommendation card image uses lazy async decoding", /loading="lazy" decoding="async"/.test(page)],
  ["active API still uses deterministic single-work selection", /selectOneRecommendation/.test(api) && /function selectOneRecommendation/.test(core)],
  ["stable IDs and safe recorded URLs remain enforced by UI contract", /const workId = text\(raw\.id/.test(contract) && /isSafeChatActionUrl\(url\)/.test(contract)],
  ["provider, payment, customer-data mutation, deployment, and push operations remain zero", productRecord.externalOperations.provider === 0 && productRecord.externalOperations.payment === 0 && productRecord.externalOperations.customerDataMutations === 0 && productRecord.externalOperations.deploy === 0 && productRecord.externalOperations.push === 0 && productRecord.localUiProbe.persistenceReached === false],
  ["no API contract or paid-continuation state change is recorded", productRecord.contractChanges === "none" && /BLOCKED_PRODUCT_CONTRACT/.test(productRecord.paymentEntitlement)],
];

for (const [name, passed] of checks) {
  assert.equal(passed, true, name);
  console.log(`PASS: ${name}`);
}

console.log(`PRODUCT_LANE_A_CHAT_STRENGTHENING_01_VALIDATOR=PASS checks=${checks.length} provider_calls=0`);
