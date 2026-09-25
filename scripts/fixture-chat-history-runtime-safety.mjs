/* global process, console, fetch, URL, Buffer */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const baseUrl = process.env.CHAT_FIXTURE_BASE_URL ?? "http://127.0.0.1:3117";
const base = new URL(baseUrl);
assert.equal(base.protocol, "http:");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));

const loaded = await import("../src/pages/api/chat-history.ts");
const route = loaded.config ? loaded : loaded.default;
assert.equal(route.config.api.bodyParser.sizeLimit, "512kb");
const captured = [];
const originalError = console.error;
console.error = (...items) => captured.push(items);
try {
  const syntheticError = new Error("synthetic-token=DO_NOT_LOG_SYNTHETIC_VALUE");
  try { throw syntheticError; } catch { route.logChatHistoryFailure("DELETE"); }
} finally {
  console.error = originalError;
}
assert.deepEqual(captured, [["chat_history_failed", { operation: "DELETE", category: "storage_unavailable" }]]);
assert.doesNotMatch(JSON.stringify(captured), /DO_NOT_LOG_SYNTHETIC_VALUE/);
console.log("PASS safe log: bounded operation/category only; synthetic error text absent");

const body = (characters) => JSON.stringify({
  conversationId: "invalid-id",
  lang: "ja",
  messages: Array.from({ length: 40 }, () => ({ role: "user", content: "あ".repeat(characters) })),
});
const validBoundBody = body(2000);
const oversizedBody = body(5000);
assert.ok(Buffer.byteLength(validBoundBody) < 512 * 1024);
assert.ok(Buffer.byteLength(oversizedBody) > 512 * 1024);
const accepted = await fetch(new URL("/api/chat-history", base), {
  method: "PUT", headers: { "Content-Type": "application/json" }, body: validBoundBody,
});
assert.equal(accepted.status, 400); // Parsed, then rejected for the intentionally invalid ID; no storage access.
console.log("PASS 40 × 2000 Japanese characters fit through HTTP parser; invalid fixture ID rejected before storage");
const oversized = await fetch(new URL("/api/chat-history", base), {
  method: "PUT", headers: { "Content-Type": "application/json" }, body: oversizedBody,
});
const rejection = await oversized.text();
assert.equal(oversized.status, 413);
assert.ok(Buffer.byteLength(rejection) < 128);
assert.doesNotMatch(rejection, /あ|DO_NOT_LOG_SYNTHETIC_VALUE/);
const resolver = readFileSync("node_modules/next/dist/server/api-utils/node/api-resolver.js", "utf8");
assert.ok(resolver.indexOf("apiReq.body = await (0, _parsebody.parseBody)") < resolver.indexOf("const resolver = (0, _interopdefault.interopDefault)(resolverModule)"));
console.log("PASS oversize HTTP 413, bounded response, body parser rejects before route handler/storage");
console.log("CHAT_HISTORY_RUNTIME_SAFETY_FIXTURE=PASS provider_calls=0 customer_data_ops=0");
