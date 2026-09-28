import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createReleaseInboxServer, releaseInboxRequestRejection } from "../tools/release-inbox/receive.mjs";
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
const popupHtml = await fs.readFile(path.join(root, "tools/distrokid-capture-extension/popup.html"), "utf8");
const transportSource = await fs.readFile(path.join(root, "tools/distrokid-capture-extension/inbox-transport.js"), "utf8");

assert.deepEqual(compareReleaseInboxOrigin(extensionId, origin), { status: "MATCH", expectedOrigin: origin, configuredOrigin: origin });
assert.equal(compareReleaseInboxOrigin(extensionId, "chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba").status, "MISMATCH");
assert.equal(compareReleaseInboxOrigin("invalid", origin).status, "INVALID_EXTENSION_ID");
assert.equal(manifest.manifest_version, 3);
assert.ok(manifest.host_permissions.includes("http://127.0.0.1:43127/*"));
assert.deepEqual(manifest.host_permissions, ["https://distrokid.com/*", "https://www.distrokid.com/*", "http://127.0.0.1:43127/*"]);
assert.match(manifest.content_security_policy.extension_pages, /connect-src 'self' http:\/\/127\.0\.0\.1:43127(?:\s|$)/);
assert.doesNotMatch(manifest.content_security_policy.extension_pages, /localhost|0\.0\.0\.0|https?:\/\/\*/);
assert.match(receiverSource, /LOCAL_EXTENSION_ORIGIN_MISMATCH/);
assert.match(receiverSource, /LOCAL_REMOTE_ADDRESS_REJECTED/);
assert.match(receiverSource, /IPV4_LOOPBACK/);
assert.match(receiverSource, /IPV6_LOOPBACK/);
assert.match(receiverSource, /IPV4_MAPPED_LOOPBACK/);
assert.match(receiverSource, /server\.listen\(PORT, "127\.0\.0\.1"/);
assert.match(receiverSource, /Access-Control-Allow-Methods": "GET, POST, OPTIONS"/);
assert.match(receiverSource, /Access-Control-Allow-Headers": "Content-Type, X-MUSIAM-Session"/);
assert.match(popupSource, /MusiamReleaseInboxTransport\.send/);
assert.match(popupHtml, /id="probe"[^>]*>Test local inbox connection</);
assert.match(popupSource, /MusiamReleaseInboxTransport\.probe\(\)/);
assert.doesNotMatch(popupSource, /catch\s*\{\s*statusNode\.textContent\s*=/);
assert.doesNotMatch(transportSource, /error\.(?:message|stack)|console\.|textContent/);
assert.match(transportSource, /SAFE_RECEIVER_ERRORS/);

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
result = await transport.send(validPayload, async () => mockResponse(403, { error: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: "MISSING", nonce: fakeSecret }));
assert.deepEqual(result, { ok: false, code: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: "MISSING" }, "popup transport forwards allowlisted receiver code and category only");
assert.equal(JSON.stringify(result).includes(fakeSecret), false, "receiver fields and nonce are not exposed");
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: `secret.${fakeSecret}` }) } : mockResponse(200, { accepted: 1 }));
assert.equal(result.code, "LOCAL_INBOX_CHALLENGE_RESPONSE_INVALID");
assert.equal(JSON.stringify(result).includes(fakeSecret), false);
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: "A".repeat(43) }) } : Promise.reject(new Error(fakeSecret)));
assert.equal(result.code, "LOCAL_INBOX_POST_FETCH_FAILED");
assert.equal(JSON.stringify(result).includes(fakeSecret), false);
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: "A".repeat(43) }) } : mockResponse(403, { error: `ORIGIN_REJECTED_${fakeSecret}` }));
assert.equal(result.code, "LOCAL_INBOX_ORIGIN_REJECTED");
assert.equal(JSON.stringify(result).includes(fakeSecret), false);
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: "A".repeat(43) }) } : mockResponse(403, { error: "LOCAL_REMOTE_ADDRESS_REJECTED", remoteAddressCategory: "OTHER" }));
assert.equal(result.code, "LOCAL_REMOTE_ADDRESS_REJECTED", "popup transport forwards the safe remote-address error");
const syntheticNonce = "B".repeat(43);
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge")
  ? mockResponse(200, { nonce: syntheticNonce })
  : mockResponse(201, { accepted: 1 }));
assert.deepEqual(result, { ok: true, accepted: 1 });
assert.equal(JSON.stringify(result).includes(syntheticNonce), false, "nonce is not exposed by transport results");
const probeRequests = [];
result = await transport.probe(async (url, options = {}) => {
  probeRequests.push({ path: new URL(url).pathname, method: options.method ?? "GET", body: options.body ?? null });
  return mockResponse(200, { nonce: syntheticNonce });
});
assert.deepEqual(result, { ok: true, code: "LOCAL_INBOX_CHALLENGE_PASS" }, "expected extension challenge succeeds without returning its nonce");
assert.deepEqual(probeRequests, [{ path: "/v1/challenge", method: "GET", body: null }], "probe performs only one challenge GET with no body");
assert.equal(JSON.stringify(result).includes(syntheticNonce), false, "probe never exposes challenge nonce");
for (const originCategory of ["MISSING", "NULL", "OTHER_CHROME_EXTENSION", "OTHER_ORIGIN"]) {
  const categoryResult = await transport.probe(async () => mockResponse(403, { error: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory, origin: fakeSecret }));
  assert.deepEqual(categoryResult, { ok: false, code: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory }, `safe origin category ${originCategory} is forwarded`);
  assert.equal(JSON.stringify(categoryResult).includes(fakeSecret), false, "raw Origin is never forwarded");
}
const unknownCategoryResult = await transport.probe(async () => mockResponse(403, { error: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: fakeSecret }));
assert.deepEqual(unknownCategoryResult, { ok: false, code: "LOCAL_EXTENSION_ORIGIN_MISMATCH" }, "unknown category is discarded");
const popupHandlers = new Map();
const popupElements = new Map();
for (const id of ["status", "probe", "capture", "capture-all", "diagnose", "download", "send"]) {
  popupElements.set(id, { addEventListener: (event, handler) => popupHandlers.set(`${id}:${event}`, handler), disabled: false, textContent: "" });
}
let popupProbeCalls = 0;
let popupSendCalls = 0;
const popupContext = {
  document: { getElementById: (id) => popupElements.get(id) },
  MusiamReleaseInboxTransport: {
    probe: async () => { popupProbeCalls++; return { ok: false, code: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: "MISSING" }; },
    send: async () => { popupSendCalls++; return { ok: true, accepted: 1 }; },
  },
};
popupContext.globalThis = popupContext;
vm.runInNewContext(popupSource, popupContext);
await popupHandlers.get("probe:click")();
assert.equal(popupProbeCalls, 1, "probe popup click invokes one bridge probe");
assert.equal(popupSendCalls, 0, "probe popup click never invokes the payload sender");
assert.equal(popupElements.get("status").textContent, "LOCAL_EXTENSION_ORIGIN_MISMATCH; Origin category: MISSING. No payload was sent.");
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: "A".repeat(43) }) } : mockResponse(401, { error: `SESSION_REJECTED_${fakeSecret}` }));
assert.equal(result.code, "LOCAL_INBOX_SESSION_REJECTED");
result = await transport.send(validPayload, async (url) => url.endsWith("/challenge") ? { ok: true, json: async () => ({ nonce: "A".repeat(43) }) } : mockResponse(400, { error: fakeSecret }));
assert.equal(result.code, "LOCAL_INBOX_INVALID_PAYLOAD");
result = await transport.send({ schemaVersion: 1, releases: Array(21).fill({}) }, async () => { calls++; throw new Error(fakeSecret); });
assert.equal(result.code, "LOCAL_INBOX_INVALID_PAYLOAD");
assert.equal(calls, 1, "invalid payload never contacts the local receiver");

assert.equal(releaseInboxRequestRejection({ origin, extensionOrigin: origin, remoteAddress: "127.0.0.1" }), null, "IPv4 loopback is allowed");
assert.equal(releaseInboxRequestRejection({ origin, extensionOrigin: origin, remoteAddress: "::1" }), null, "IPv6 loopback is allowed");
assert.equal(releaseInboxRequestRejection({ origin, extensionOrigin: origin, remoteAddress: "::ffff:127.0.0.1" }), null, "IPv4-mapped loopback is allowed");
assert.deepEqual(releaseInboxRequestRejection({ origin: "chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba", extensionOrigin: origin, remoteAddress: "127.0.0.1" }), { error: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: "OTHER_CHROME_EXTENSION" });
assert.deepEqual(releaseInboxRequestRejection({ origin: undefined, extensionOrigin: origin, remoteAddress: "127.0.0.1" }), { error: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: "MISSING" });
assert.deepEqual(releaseInboxRequestRejection({ origin: "null", extensionOrigin: origin, remoteAddress: "127.0.0.1" }), { error: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: "NULL" });
assert.deepEqual(releaseInboxRequestRejection({ origin: "https://example.invalid", extensionOrigin: origin, remoteAddress: "127.0.0.1" }), { error: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: "OTHER_ORIGIN" });
assert.deepEqual(releaseInboxRequestRejection({ origin, extensionOrigin: origin, remoteAddress: "192.0.2.10" }), { error: "LOCAL_REMOTE_ADDRESS_REJECTED", remoteAddressCategory: "OTHER" });
assert.deepEqual(releaseInboxRequestRejection({ origin, extensionOrigin: origin, remoteAddress: undefined }), { error: "LOCAL_REMOTE_ADDRESS_REJECTED", remoteAddressCategory: "MISSING" });

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
  const probeRequestsLive = [];
  const probeFetch = (url, options = {}) => {
    probeRequestsLive.push({ path: new URL(url).pathname, method: options.method ?? "GET", body: options.body ?? null });
    return fetch(url.replace("127.0.0.1:43127", `127.0.0.1:${address.port}`), { ...options, headers: { ...(options.headers ?? {}), Origin: origin } });
  };
  result = await transport.probe(probeFetch);
  assert.deepEqual(result, { ok: true, code: "LOCAL_INBOX_CHALLENGE_PASS" }, "exact expected extension origin passes live challenge probe");
  assert.deepEqual(probeRequestsLive, [{ path: "/v1/challenge", method: "GET", body: null }]);
  assert.deepEqual(await fs.readdir(temporaryInbox), [], "successful probe writes no payload");
  const wrongOrigin = await fetch(`${base}/challenge`, { headers: { Origin: "chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba" } });
  assert.equal(wrongOrigin.status, 403);
  assert.deepEqual(await wrongOrigin.json(), { error: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: "OTHER_CHROME_EXTENSION" });
  const missingOrigin = await fetch(`${base}/challenge`);
  assert.equal(missingOrigin.status, 403);
  assert.deepEqual(await missingOrigin.json(), { error: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: "MISSING" });

  const rejectedPaths = [];
  const wrongOriginFetch = (url, options = {}) => {
    rejectedPaths.push(new URL(url).pathname);
    return fetch(url.replace("127.0.0.1:43127", `127.0.0.1:${address.port}`), { ...options, headers: { ...(options.headers ?? {}), Origin: "chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba" } });
  };
  result = await transport.send(validPayload, wrongOriginFetch);
  assert.deepEqual(result, { ok: false, code: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: "OTHER_CHROME_EXTENSION" });
  assert.deepEqual(rejectedPaths, ["/v1/challenge"], "challenge rejection stops before POST");
  assert.deepEqual(await fs.readdir(temporaryInbox), [], "challenge rejection writes no payload");

  const ipv4Challenge = await fetch(`${base}/challenge`, { headers: { Origin: origin } });
  assert.equal(ipv4Challenge.status, 200, "exact origin plus IPv4 loopback receives a challenge");

  const localFetch = (url, options = {}) => fetch(url.replace("127.0.0.1:43127", `127.0.0.1:${address.port}`), { ...options, headers: { ...(options.headers ?? {}), Origin: origin } });
  result = await transport.send(validPayload, localFetch);
  assert.deepEqual(result, { ok: true, accepted: 1 }, "synthetic extension transport completes challenge and local inbox POST");
  const received = await fs.readdir(temporaryInbox);
  assert.equal(received.length, 1, "one synthetic payload is accepted into the temporary test inbox");
  assert.match(received[0], /^release-capture-.*\.json$/);

  const ipv6Server = createReleaseInboxServer({ extensionOrigin: origin, inbox: temporaryInbox });
  try {
    await new Promise((resolve, reject) => { ipv6Server.once("error", reject); ipv6Server.listen(0, "::1", resolve); });
    const ipv6Address = ipv6Server.address();
    assert.ok(ipv6Address && typeof ipv6Address === "object");
    const ipv6Challenge = await fetch(`http://[::1]:${ipv6Address.port}/v1/challenge`, { headers: { Origin: origin } });
    assert.equal(ipv6Challenge.status, 200, "exact origin plus ::1 loopback receives a challenge");
  } finally {
    await new Promise((resolve) => ipv6Server.close(resolve));
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(temporaryInbox, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({ result: "PASS", originContract: "PASS", manifestLoopbackContract: "PASS", mockedSafeErrors: "PASS", popupProbe: "PASS", probeRequests: 1, probePosts: 0, probePayloadWrites: 0, receiverPreflight: "PASS", receiverOriginGate: "PASS", ipv4Loopback: "PASS", ipv6Loopback: "PASS", originCategories: "PASS", remoteCategories: "PASS", challengeRejectsBeforePost: "PASS", rejectedPayloadWrites: 0, syntheticLoopbackSends: 1, remoteSends: 0 })}\n`);
