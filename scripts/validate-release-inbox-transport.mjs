import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createReleaseInboxServer } from "../tools/release-inbox/receive.mjs";
import { compareReleaseInboxOrigin } from "./check-release-inbox-origin.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
require("../tools/distrokid-capture-extension/inbox-transport.js");
const transport = globalThis.MusiamReleaseInboxTransport;
const extensionId = "abcdefghijklmnopabcdefghijklmnop";
const origin = `chrome-extension://${extensionId}`;
const manifest = JSON.parse(await fs.readFile(path.join(root, "tools/distrokid-capture-extension/manifest.json"), "utf8"));
const receiverSource = await fs.readFile(path.join(root, "tools/release-inbox/receive.mjs"), "utf8");
const popupSource = await fs.readFile(path.join(root, "tools/distrokid-capture-extension/popup.js"), "utf8");
const transportSource = await fs.readFile(path.join(root, "tools/distrokid-capture-extension/inbox-transport.js"), "utf8");

assert.deepEqual(compareReleaseInboxOrigin(extensionId, origin), { status: "MATCH", expectedOrigin: origin, configuredOrigin: origin });
assert.equal(compareReleaseInboxOrigin(extensionId, "chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba").status, "MISMATCH");
assert.equal(compareReleaseInboxOrigin("invalid", origin).status, "INVALID_EXTENSION_ID");
assert.equal(manifest.manifest_version, 3);
assert.ok(manifest.host_permissions.includes("http://127.0.0.1:43127/*"));
assert.deepEqual(manifest.host_permissions, ["https://distrokid.com/*", "https://www.distrokid.com/*", "http://127.0.0.1:43127/*"]);
assert.match(manifest.content_security_policy.extension_pages, /connect-src 'self' http:\/\/127\.0\.0\.1:43127(?:\s|$)/);
assert.doesNotMatch(manifest.content_security_policy.extension_pages, /localhost|0\.0\.0\.0|https?:\/\/\*/);
assert.match(receiverSource, /origin !== extensionOrigin/);
assert.match(receiverSource, /remoteAddress\?\.match/);
assert.match(receiverSource, /127\\\.0\\\.0\\\.1\|::ffff:127\\\.0\\\.0\\\.1\|::1/);
assert.match(receiverSource, /server\.listen\(PORT, "127\.0\.0\.1"/);
assert.match(receiverSource, /Access-Control-Allow-Methods": "GET, POST, OPTIONS"/);
assert.match(receiverSource, /Access-Control-Allow-Headers": "Content-Type, X-MUSIAM-Session"/);
assert.match(popupSource, /MusiamReleaseInboxTransport\.send/);
assert.doesNotMatch(popupSource, /catch\s*\{\s*statusNode\.textContent\s*=/);
assert.doesNotMatch(transportSource, /error\.(?:message|stack)|console\.|textContent/);

const fakeSecret = "synthetic-secret-never-render";
const validPayload = { schemaVersion: 1, releases: [{
  releaseSource: "DistroKid", sourceReleaseId: "synthetic-source-1", title: "Synthetic Release", artist: "Synthetic Artist",
  releaseDate: null, primaryGenre: null, secondaryGenre: null, isrc: "USABC2600001", upc: "123456789012", artworkRef: null,
  publicUrls: [], sourceObservedAt: null, label: "Synthetic Label", albumuuid: "aaaaaaaa-bbbb-cccc-dddddddddddddddd", uploadDate: null,
}] };
const mockResponse = (status, body = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
let calls = 0;
let result = await transport.send(validPayload, async () => { calls++; throw new Error(fakeSecret); });
assert.equal(result.code, "LOCAL_INBOX_CHALLENGE_FETCH_FAILED");
assert.equal(JSON.stringify(result).includes(fakeSecret), false);
result = await transport.send(validPayload, async () => mockResponse(403));
assert.equal(result.code, "LOCAL_INBOX_CHALLENGE_HTTP_403");
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: `secret.${fakeSecret}` }) } : mockResponse(200, { accepted: 1 }));
assert.equal(result.code, "LOCAL_INBOX_CHALLENGE_RESPONSE_INVALID");
assert.equal(JSON.stringify(result).includes(fakeSecret), false);
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: "A".repeat(43) }) } : Promise.reject(new Error(fakeSecret)));
assert.equal(result.code, "LOCAL_INBOX_POST_FETCH_FAILED");
assert.equal(JSON.stringify(result).includes(fakeSecret), false);
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: "A".repeat(43) }) } : mockResponse(403, { error: `ORIGIN_REJECTED_${fakeSecret}` }));
assert.equal(result.code, "LOCAL_INBOX_ORIGIN_REJECTED");
assert.equal(JSON.stringify(result).includes(fakeSecret), false);
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: "A".repeat(43) }) } : mockResponse(401, { error: `SESSION_REJECTED_${fakeSecret}` }));
assert.equal(result.code, "LOCAL_INBOX_SESSION_REJECTED");
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: "A".repeat(43) }) } : mockResponse(400, { error: fakeSecret }));
assert.equal(result.code, "LOCAL_INBOX_INVALID_PAYLOAD");
result = await transport.send({ schemaVersion: 1, releases: Array(21).fill({}) }, async () => { calls++; throw new Error(fakeSecret); });
assert.equal(result.code, "LOCAL_INBOX_INVALID_PAYLOAD");
assert.equal(calls, 1, "invalid payload never contacts the local receiver");

const temporaryInbox = await fs.mkdtemp(path.join(os.tmpdir(), "musiam-release-inbox-validation-"));
const server = createReleaseInboxServer({ extensionOrigin: origin, inbox: temporaryInbox });
try {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  assert.equal(address.address, "127.0.0.1", "test receiver binds loopback only");
  const base = `http://127.0.0.1:${address.port}/v1`;
  const preflight = await fetch(`${base}/releases`, { method: "OPTIONS", headers: {
    Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-musiam-session",
  } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
  assert.equal(preflight.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
  assert.equal(preflight.headers.get("access-control-allow-headers"), "Content-Type, X-MUSIAM-Session");
  const wrongOrigin = await fetch(`${base}/challenge`, { headers: { Origin: "chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba" } });
  assert.equal(wrongOrigin.status, 403);
  assert.equal((await wrongOrigin.json()).error, "LOCAL_ORIGIN_REJECTED");

  const localFetch = (url, options = {}) => fetch(url.replace("127.0.0.1:43127", `127.0.0.1:${address.port}`), { ...options, headers: { ...(options.headers ?? {}), Origin: origin } });
  result = await transport.send(validPayload, localFetch);
  assert.deepEqual(result, { ok: true, accepted: 1 }, "synthetic extension transport completes challenge and local inbox POST");
  const received = await fs.readdir(temporaryInbox);
  assert.equal(received.length, 1, "one synthetic payload is accepted into the temporary test inbox");
  assert.match(received[0], /^release-capture-.*\.json$/);
} finally {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(temporaryInbox, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({ result: "PASS", originContract: "PASS", manifestLoopbackContract: "PASS", mockedSafeErrors: "PASS", receiverPreflight: "PASS", receiverOriginGate: "PASS", syntheticLoopbackSends: 1, remoteSends: 0 })}\n`);
