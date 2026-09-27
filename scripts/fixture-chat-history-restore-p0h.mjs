/* global console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import chatUiContract from "../src/lib/chat-ui-contract.ts";

const { normalizeChatHistory, normalizeChatUiReply } = chatUiContract;

// Exercise the page's actual restore function with injected responses. No server, Redis, or network is used.
const source = readFileSync("src/pages/chat.tsx", "utf8");
const ast = ts.createSourceFile("chat.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let restoreNode;
let beginNode;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "restoreOrBegin") restoreNode = node;
  if (ts.isFunctionDeclaration(node) && node.name?.text === "begin") beginNode = node;
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(restoreNode, "restoreOrBegin must exist in the Chat page");
assert.ok(beginNode, "begin must exist in the Chat page");
const restoreSource = source.slice(restoreNode.getStart(ast), restoreNode.end);
const restoreJs = ts.transpileModule(restoreSource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const beginSource = source.slice(beginNode.getStart(ast), beginNode.end);
const beginJs = ts.transpileModule(beginSource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const dependencyNames = [
  "entryGenerationRef", "historyRestoreAttemptRef", "localStorage", "CHAT_MEMORY_ENABLED_KEY",
  "rememberConversationRef", "setRememberConversation", "historyRestoreBlockedRef", "setHistoryRestoreError",
  "ensureConversationId", "fetch", "SUPPORTED_LANG_VALUES", "normalizeChatHistory", "normalizeChatUiReply",
  "setMessages", "setCards", "setChoices", "setCta", "setLang", "setStarted",
  "setHistoryRestored", "setMemoryStatus", "capture", "begin",
];
const makeRestore = new Function(...dependencyNames, `${restoreJs}\nreturn restoreOrBegin;`);
const id = "11111111-1111-4111-8111-111111111111";
const savedHistory = { version: 1, conversationId: id, lang: "ja", messages: [{ role: "assistant", content: "Saved reply", recommendedWorkId: "stable-work" }] };

function fixture(responses) {
  const calls = { get: [], begin: [], messages: [], status: [], restoreError: [], restored: [] };
  const entryGenerationRef = { current: 1 };
  const historyRestoreAttemptRef = { current: 0 };
  const historyRestoreBlockedRef = { current: false };
  const rememberConversationRef = { current: true };
  const dependencies = {
    entryGenerationRef, historyRestoreAttemptRef,
    localStorage: { getItem: () => null }, CHAT_MEMORY_ENABLED_KEY: "memory",
    rememberConversationRef, setRememberConversation: () => {}, historyRestoreBlockedRef,
    setHistoryRestoreError: (value) => calls.restoreError.push(value),
    ensureConversationId: () => id,
    fetch: async (url) => {
      calls.get.push(url);
      const next = responses.shift();
      if (next instanceof Error) throw next;
      assert.ok(next, "fixture response exhausted");
      return { ok: next.status === 200, json: async () => next.body };
    },
    SUPPORTED_LANG_VALUES: ["ja", "en", "fr", "es", "de", "ar"],
    normalizeChatHistory, normalizeChatUiReply,
    setMessages: (value) => calls.messages.push(value), setCards: () => {}, setChoices: () => {}, setCta: () => {},
    setLang: () => {}, setStarted: () => {}, setHistoryRestored: (value) => calls.restored.push(value),
    setMemoryStatus: (value) => calls.status.push(value), capture: () => {},
    begin: async (...args) => { calls.begin.push(args); },
  };
  const restore = makeRestore(...dependencyNames.map((name) => dependencies[name]));
  return { calls, restore, historyRestoreBlockedRef };
}

const ok = (history) => ({ status: 200, body: { ok: true, history, restoredRecommendation: null } });

for (const history of [null, { ...savedHistory, messages: [] }]) {
  const test = fixture([ok(history)]);
  await test.restore("ja", "night");
  assert.equal(test.calls.begin.length, 1, "valid empty history must initialize opening");
  assert.equal(test.calls.messages.length, 0);
  assert.equal(test.historyRestoreBlockedRef.current, false);
}

const existing = fixture([ok(savedHistory)]);
await existing.restore("ja", "night");
assert.equal(existing.calls.begin.length, 0, "existing history must restore without opening");
assert.equal(existing.calls.messages[0][0].recommendedWorkId, "stable-work");
assert.deepEqual(existing.calls.restored, [true]);

const badResponses = [
  { status: 503, body: { ok: false, error: "history_unavailable" } },
  { status: 200, body: { ok: false, history: null } },
  { status: 200, body: { ok: true } },
  { status: 200, body: { ok: true, history: { ...savedHistory, conversationId: "22222222-2222-4222-8222-222222222222" } } },
  { status: 200, body: { ok: true, history: { ...savedHistory, messages: "invalid" } } },
  { status: 200, body: { ok: true, history: { ...savedHistory, messages: [null] } } },
  new Error("network_failure"),
];
for (const response of badResponses) {
  const test = fixture([response]);
  await test.restore("ja", "night");
  assert.equal(test.calls.begin.length, 0, "unresolved history must never initialize opening");
  assert.equal(test.calls.messages.length, 0);
  assert.equal(test.historyRestoreBlockedRef.current, true);
  assert.equal(test.calls.restoreError.at(-1), true);
  assert.equal(test.calls.status.at(-1), "unavailable");
}

const retry = fixture([{ status: 503, body: { ok: false } }, ok(savedHistory)]);
await retry.restore("ja", "night");
await retry.restore("ja", "night");
assert.equal(retry.calls.get.length, 2);
assert.equal(retry.calls.begin.length, 0);
assert.equal(retry.calls.messages[0][0].content, "Saved reply");
assert.equal(retry.historyRestoreBlockedRef.current, false);

const guardedBegin = new Function("historyRestoreBlockedRef", `${beginJs}\nreturn begin;`)({ current: true });
await guardedBegin("ja", "night");

console.log("CHAT_HISTORY_RESTORE_P0H_FIXTURE=PASS provider_calls=0 cases=12");
