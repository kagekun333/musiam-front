import assert from "node:assert/strict";
import { buildOpenRouterRequestHeaders } from "../src/lib/llm-router";

const expectedReferer = "https://www.hakusyaku.xyz";
const headers = buildOpenRouterRequestHeaders("fixture-only-key", expectedReferer);
const constructed = new Headers(headers);
const isAscii = (value: string) => [...value].every((character) => (character.codePointAt(0) ?? 0x100) <= 0x7F);

assert.equal(constructed.get("x-title"), "Hakusyaku MUSIAM");
assert.equal(constructed.get("http-referer"), expectedReferer);
for (const [name, value] of Object.entries(headers)) {
  assert.ok(isAscii(name), `${name}: header name must be ASCII`);
  assert.ok(isAscii(value), `${name}: header value must be ASCII`);
  assert.doesNotThrow(() => new Headers({ [name]: value }), `${name}: Node Headers accepts the production value`);
}

assert.doesNotThrow(() => new Headers({
  "X-Title": "Hakusyaku MUSIAM",
  "HTTP-Referer": expectedReferer,
}));
assert.throws(() => new Headers({
  "X-Title": "伯爵MUSIAM",
  "HTTP-Referer": expectedReferer,
}), TypeError, "the old non-Latin-1 title reproduces the ByteString failure");

console.log("COUNT_CHAT_OPENROUTER_HEADER_COMPATIBILITY_FIXTURE=PASS production_headers=4 repaired_title_ascii=yes old_title_failure_reproduced=yes provider_calls=0");
