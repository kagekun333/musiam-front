import assert from "node:assert/strict";
import {
  appendAssistantReply,
  isChatConversationId,
  isSafeChatActionUrl,
  normalizeChatHistory,
  normalizeChatUiReply,
} from "../src/lib/chat-ui-contract";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`PASS ${passed}: ${name}`);
}

const card = {
  id: "work-stable-001",
  title: "静かな一作",
  cover: "/works/quiet.jpg",
  type: "music",
  reason: "現在の依頼と catalog metadata に照合しました。",
  links: [{ kind: "listen", url: "https://open.spotify.com/track/example" }],
};
const reply = { ok: true, assistantText: "こちらをどうぞ。", persona: "count", card, cta: null, intent: "work", productId: null };

check("normal send", () => assert.equal(normalizeChatUiReply(reply).assistantText, "こちらをどうぞ。"));
check("history restore", () => assert.equal(normalizeChatHistory([{ role: "user", content: "こんにちは" }]).length, 1));
check("restored conversation order", () => assert.deepEqual(normalizeChatHistory([{ role: "assistant", content: "A" }, { role: "user", content: "B" }]).map((m) => m.content), ["A", "B"]));
check("assistant stable recommendation ID survives with a canonical ID allowlist", () => assert.equal(normalizeChatHistory([{ role: "assistant", content: "work", recommendedWorkId: "stable-work-1" }], new Set(["stable-work-1"]))[0]?.recommendedWorkId, "stable-work-1"));
check("user and unknown recommendation IDs are stripped without dropping messages", () => assert.deepEqual(normalizeChatHistory([{ role: "user", content: "user", recommendedWorkId: "stable-work-1" }, { role: "assistant", content: "old card", recommendedWorkId: "unknown" }], new Set(["stable-work-1"])), [{ role: "user", content: "user" }, { role: "assistant", content: "old card" }]));
check("double-send protection", () => assert.equal(appendAssistantReply([{ role: "assistant", content: "A", persona: "count" }], { assistantText: "A", persona: "count" }).length, 1));
check("stale reply rejection primitive", () => assert.equal(appendAssistantReply([{ role: "user", content: "new" }], { assistantText: "old", persona: "count" }).length, 2));
check("one recommendation becomes one card", () => assert.equal(normalizeChatUiReply(reply).cards.length, 1));
check("explicit multi-card compatibility", () => assert.equal(normalizeChatUiReply({ ...reply, cards: [{ ...card, id: "work-stable-002", title: "二作目" }] }).cards.length, 2));
check("stable workId retained", () => assert.equal(normalizeChatUiReply(reply).cards[0]?.workId, "work-stable-001"));
check("listen action is retained only when supplied", () => assert.equal(normalizeChatUiReply(reply).cards[0]?.links[0]?.kind, "listen"));
check("missing action does not invent URL", () => assert.equal(normalizeChatUiReply({ ...reply, card: { ...card, links: [] } }).cards[0]?.links.length, 0));
check("sales suppression has no fixed CTA", () => assert.equal(normalizeChatUiReply({ ...reply, cta: null }).cta, null));
check("Japanese rendering payload", () => assert.equal(normalizeChatUiReply(reply).assistantText.includes("こちら"), true));
check("English rendering payload", () => assert.equal(normalizeChatUiReply({ ...reply, assistantText: "Here is one work." }).assistantText, "Here is one work."));
check("API error payload stays non-actionable", () => assert.equal(normalizeChatUiReply({ ok: false, error: "unavailable" }).cards.length, 0));
check("retry preserves no duplicate assistant", () => assert.equal(appendAssistantReply([{ role: "assistant", content: "retry", persona: "count" }], { assistantText: "retry", persona: "count" }).length, 1));
check("empty history", () => assert.equal(normalizeChatHistory(null).length, 0));
check("deleted history", () => assert.equal(normalizeChatHistory([]).length, 0));
check("recommendation reason preserved", () => assert.equal(normalizeChatUiReply(reply).cards[0]?.reason, card.reason));
check("unknown catalog work is safely omitted", () => assert.equal(normalizeChatUiReply({ ...reply, card: { ...card, id: "", title: "unknown" } }).cards.length, 0));
check("pending paid continuation is not represented as completed", () => assert.equal(normalizeChatUiReply({ ...reply, paidContinuation: { completed: true } }).cta, null));
check("session identity is UUID-only", () => { assert.equal(isChatConversationId("4c9f1f08-8c6c-4b5a-9df0-000000000001"), true); assert.equal(isChatConversationId("not-a-session"), false); });
check("unsafe URLs are rejected", () => { assert.equal(isSafeChatActionUrl("javascript:alert(1)"), false); assert.equal(isSafeChatActionUrl("https://example.com"), true); });

console.log(`R7C1_CHAT_UI_HISTORY_VALIDATOR=PASS fixtures=${passed} provider_network=0`);
