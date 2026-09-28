import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  createNativeHost,
  encodeNativeMessage,
  MAX_MESSAGE_BYTES,
  runNativeHost,
} from "../tools/release-native-host/host.mjs";
import { PassThrough, Writable } from "node:stream";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
require("../tools/distrokid-capture-extension/inbox-transport.js");
const transport = globalThis.MusiamReleaseInboxTransport;
const extensionId = "okhkdhofjkdogeilbnmmmdpflppeabff";
const extensionOrigin = `chrome-extension://${extensionId}/`;
const validRelease = (id) => ({
  releaseSource: "DistroKid",
  sourceReleaseId: id,
  title: "Fixture Single",
  artist: "ABI Earl",
  releaseDate: "2026-09-26",
  primaryGenre: "Alternative",
  secondaryGenre: null,
  isrc: `USABC260${String(Number(id.slice(-2)) || 1).padStart(4, "0")}`,
  upc: null,
  artworkRef: null,
  publicUrls: ["https://open.spotify.com/album/0123456789abcdef012345"],
  sourceObservedAt: "2026-09-27T09:00:00Z",
});
const payload = (count = 1) => ({ schemaVersion: 1, releases: Array.from({ length: count }, (_, index) => validRelease(`fixture-${String(index).padStart(2, "0")}`)) });
const frameRaw = (body) => {
  const header = Buffer.alloc(4);
  if (os.endianness() === "LE") header.writeUInt32LE(body.length, 0);
  else header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
};
const decodeFrames = (buffer) => {
  const messages = [];
  let offset = 0;
  while (offset < buffer.length) {
    assert.ok(buffer.length - offset >= 4, "response has a complete length header");
    const length = os.endianness() === "LE" ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
    offset += 4;
    assert.ok(buffer.length - offset >= length, "response has a complete body");
    messages.push(JSON.parse(buffer.subarray(offset, offset + length).toString("utf8")));
    offset += length;
  }
  return messages;
};

const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "musiam-native-host-fixtures-"));
try {
  const inbox = path.join(temporaryRoot, "inbox");
  const handle = createNativeHost({ inboxPath: inbox });
  assert.deepEqual(await handle({ op: "ping" }), { ok: true, bridge: "MUSIAM_RELEASE_NATIVE_HOST" }, "ping contract");
  assert.deepEqual(await handle({ op: "ping", extra: true }), { ok: false, code: "NATIVE_HOST_INVALID_MESSAGE" }, "unknown ping fields are rejected");
  assert.deepEqual(await handle({ op: "saveReleaseBatch", payload: payload(1) }), { ok: true, accepted: 1 }, "one-release canonical save");
  assert.deepEqual(await handle({ op: "saveReleaseBatch", payload: payload(20) }), { ok: true, accepted: 20 }, "20-release canonical save");
  assert.deepEqual(await handle({ op: "saveReleaseBatch", payload: payload(21) }), { ok: false, code: "NATIVE_HOST_INVALID_RELEASE_BATCH" }, "more than 20 releases are rejected");
  assert.deepEqual(await handle({ op: "saveReleaseBatch", payload: { ...payload(), releases: [{ ...validRelease("secret-fixture"), password: "do-not-write" }] } }), { ok: false, code: "NATIVE_HOST_INVALID_RELEASE_BATCH" }, "schema-rejected secret fields are rejected");
  assert.deepEqual(await handle({ op: "saveReleaseBatch", payload: { ...payload(), releases: [{ ...validRelease("html-fixture"), title: "<html><body>raw source</body></html>" }] } }), { ok: false, code: "NATIVE_HOST_INVALID_RELEASE_BATCH" }, "raw HTML is rejected");
  const savedFiles = await fs.readdir(inbox);
  assert.equal(savedFiles.length, 2, "only valid saves create inbox files");
  const inboxMode = (await fs.stat(inbox)).mode & 0o777;
  assert.equal(inboxMode, 0o700, "inbox directory mode is 0700");
  for (const file of savedFiles) {
    assert.equal((await fs.stat(path.join(inbox, file))).mode & 0o777, 0o600, "inbox JSON mode is 0600");
    const saved = JSON.parse(await fs.readFile(path.join(inbox, file), "utf8"));
    assert.equal(saved.schemaVersion, 1);
    assert.ok(Array.isArray(saved.releases));
  }

  const input = new PassThrough();
  const outputChunks = [];
  const output = new Writable({ write(chunk, _encoding, callback) { outputChunks.push(Buffer.from(chunk)); callback(); } });
  const hostRun = runNativeHost({ input, output, handle: async (message) => message.op === "ping" ? { ok: true, bridge: "MUSIAM_RELEASE_NATIVE_HOST" } : { ok: false, code: "NATIVE_HOST_INVALID_MESSAGE" } });
  input.end(Buffer.concat([encodeNativeMessage({ op: "ping" }), encodeNativeMessage({ op: "unknown" })]));
  await hostRun;
  const framedReplies = decodeFrames(Buffer.concat(outputChunks));
  assert.deepEqual(framedReplies, [
    { ok: true, bridge: "MUSIAM_RELEASE_NATIVE_HOST" },
    { ok: false, code: "NATIVE_HOST_INVALID_MESSAGE" },
  ], "length-prefixed input and output framing");

  const malformedInput = new PassThrough();
  const malformedChunks = [];
  const malformedOutput = new Writable({ write(chunk, _encoding, callback) { malformedChunks.push(Buffer.from(chunk)); callback(); } });
  const malformedRun = runNativeHost({ input: malformedInput, output: malformedOutput, handle });
  malformedInput.end(frameRaw(Buffer.from("{not-json", "utf8")));
  await malformedRun;
  assert.deepEqual(decodeFrames(Buffer.concat(malformedChunks)), [{ ok: false, code: "NATIVE_HOST_INVALID_MESSAGE" }], "malformed JSON returns safe framed error");

  const oversizedInput = new PassThrough();
  const oversizedChunks = [];
  const oversizedOutput = new Writable({ write(chunk, _encoding, callback) { oversizedChunks.push(Buffer.from(chunk)); callback(); } });
  const oversizedRun = runNativeHost({ input: oversizedInput, output: oversizedOutput, handle });
  const oversizedHeader = Buffer.alloc(4);
  if (os.endianness() === "LE") oversizedHeader.writeUInt32LE(MAX_MESSAGE_BYTES + 1, 0);
  else oversizedHeader.writeUInt32BE(MAX_MESSAGE_BYTES + 1, 0);
  oversizedInput.end(oversizedHeader);
  await oversizedRun;
  assert.deepEqual(decodeFrames(Buffer.concat(oversizedChunks)), [{ ok: false, code: "NATIVE_HOST_INVALID_MESSAGE" }], "oversized frame is rejected without reading a body");

  const hostManifest = JSON.parse(await fs.readFile(path.join(root, "tools/release-native-host/native-host-manifest.template.json"), "utf8"));
  assert.equal(hostManifest.name, "com.hakusyaku.musiam.release_inbox", "native host name is valid");
  assert.equal(hostManifest.type, "stdio");
  assert.equal(hostManifest.path, "<ABSOLUTE_EXECUTABLE_HOST_PATH>", "template leaves the install path for safe local substitution");
  assert.deepEqual(hostManifest.allowed_origins, [extensionOrigin], "only the exact extension origin is allowed");

  const extensionManifest = JSON.parse(await fs.readFile(path.join(root, "tools/distrokid-capture-extension/manifest.json"), "utf8"));
  assert.ok(extensionManifest.permissions.includes("nativeMessaging"), "extension requests nativeMessaging");
  assert.ok(extensionManifest.host_permissions.includes("https://distrokid.com/*") && extensionManifest.host_permissions.includes("https://www.distrokid.com/*"), "DistroKid host permissions remain");
  assert.ok(!extensionManifest.host_permissions.some((permission) => permission.includes("127.0.0.1")), "localhost permission is removed");
  assert.ok(!extensionManifest.content_security_policy.extension_pages.includes("127.0.0.1"), "localhost CSP source is removed");

  const nativeCalls = [];
  const mockRuntime = { sendNativeMessage(hostName, message, callback) { nativeCalls.push({ hostName, message }); callback({ ok: true, bridge: "MUSIAM_RELEASE_NATIVE_HOST" }); } };
  assert.deepEqual(await transport.probe(mockRuntime), { ok: true, code: "NATIVE_RELEASE_BRIDGE_PASS" }, "extension transport ping");
  mockRuntime.sendNativeMessage = (hostName, message, callback) => { nativeCalls.push({ hostName, message }); callback({ ok: true, accepted: message.payload.releases.length }); };
  assert.deepEqual(await transport.send(payload(1), mockRuntime), { ok: true, accepted: 1 }, "extension transport save");
  assert.equal(nativeCalls[0].hostName, "com.hakusyaku.musiam.release_inbox");
  assert.deepEqual(nativeCalls[0].message, { op: "ping" });
  assert.equal(nativeCalls[1].message.op, "saveReleaseBatch");
  assert.deepEqual(await transport.send(payload(21), mockRuntime), { ok: false, code: "NATIVE_HOST_INVALID_RELEASE_BATCH" }, "extension rejects an oversized batch before IPC");
  const missingRuntime = { lastError: null, sendNativeMessage(_host, _message, callback) { this.lastError = { message: "Specified native messaging host not found." }; callback(undefined); this.lastError = null; } };
  assert.deepEqual(await transport.probe(missingRuntime), { ok: false, code: "NATIVE_HOST_NOT_INSTALLED" }, "missing native host has a safe explicit error");
  const forbiddenRuntime = { lastError: null, sendNativeMessage(_host, _message, callback) { this.lastError = { message: "Access to the specified native messaging host is forbidden." }; callback(undefined); this.lastError = null; } };
  assert.deepEqual(await transport.probe(forbiddenRuntime), { ok: false, code: "NATIVE_HOST_NOT_ALLOWED" }, "origin access denial has a safe explicit error");

  const endToEndHome = path.join(temporaryRoot, "home");
  await fs.mkdir(endToEndHome, { recursive: true });
  const childInput = Buffer.concat([encodeNativeMessage({ op: "ping" }), encodeNativeMessage({ op: "saveReleaseBatch", payload: payload(1) })]);
  const child = spawnSync(process.execPath, ["--import", "tsx", "tools/release-native-host/host.mjs"], {
    cwd: root,
    env: { ...process.env, HOME: endToEndHome },
    input: childInput,
    maxBuffer: 1024 * 1024,
  });
  assert.equal(child.status, 0, "native host exits successfully for valid framed requests");
  assert.equal(child.stderr.toString("utf8"), "", "native host emits no diagnostics for valid requests");
  assert.deepEqual(decodeFrames(child.stdout), [
    { ok: true, bridge: "MUSIAM_RELEASE_NATIVE_HOST" },
    { ok: true, accepted: 1 },
  ], "native host stdout contains only protocol frames");
  const realInbox = path.join(endToEndHome, "Library/Application Support/HakusyakuMUSIAM/release-inbox");
  assert.equal((await fs.readdir(realInbox)).length, 1, "host process saves under the canonical user inbox");
  assert.equal((await fs.stat(realInbox)).mode & 0o777, 0o700);
  assert.equal((await fs.stat(path.join(realInbox, (await fs.readdir(realInbox))[0]))).mode & 0o777, 0o600);

  const wrapperPath = path.join(root, "tools/release-native-host/run-host");
  const strippedPath = "/usr/bin:/bin:/usr/sbin:/sbin";
  const cleanEnv = { HOME: os.homedir(), PATH: strippedPath };
  const emptyWrapperRun = spawnSync(wrapperPath, [], { cwd: root, env: cleanEnv, input: Buffer.alloc(0), maxBuffer: 1024 * 1024 });
  assert.equal(emptyWrapperRun.status, 0, "wrapper resolves Node with the Chrome-like stripped PATH");
  assert.equal(emptyWrapperRun.stderr.toString("utf8"), "", "empty-input native host exits without stderr diagnostics");
  assert.equal(emptyWrapperRun.stdout.length, 0, "empty-input native host leaves stdout completely clean");

  const wrapperPingRun = spawnSync(wrapperPath, [], {
    cwd: root,
    env: cleanEnv,
    input: encodeNativeMessage({ op: "ping" }),
    maxBuffer: 1024 * 1024,
  });
  assert.equal(wrapperPingRun.status, 0, "wrapper processes the real native message with stripped PATH");
  assert.equal(wrapperPingRun.stderr.toString("utf8"), "", "framed ping emits no stderr diagnostics");
  assert.deepEqual(decodeFrames(wrapperPingRun.stdout), [{ ok: true, bridge: "MUSIAM_RELEASE_NATIVE_HOST" }], "actual wrapper returns exactly the framed native ping response");

  const unavailableRun = spawnSync(wrapperPath, [], {
    cwd: root,
    env: { HOME: path.join(temporaryRoot, "missing-node-home"), PATH: strippedPath, MUSIAM_NATIVE_HOST_TEST_FORCE_UNAVAILABLE: "1" },
    input: Buffer.alloc(0),
    maxBuffer: 1024 * 1024,
  });
  assert.notEqual(unavailableRun.status, 0, "missing Node runtime exits nonzero");
  assert.equal(unavailableRun.stderr.toString("utf8"), "MUSIAM native host: Node runtime unavailable.\n", "missing Node uses only the safe diagnostic");
  assert.equal(unavailableRun.stdout.length, 0, "missing Node leaves stdout completely clean");

  const missingOutput = [];
  const missingVm = { chrome: { runtime: missingRuntime }, globalThis: null };
  missingVm.globalThis = missingVm;
  vm.runInNewContext(await fs.readFile(path.join(root, "tools/distrokid-capture-extension/inbox-transport.js"), "utf8"), missingVm);
  assert.deepEqual(JSON.parse(JSON.stringify(await missingVm.MusiamReleaseInboxTransport.probe())), { ok: false, code: "NATIVE_HOST_NOT_INSTALLED" }, "extension context safely maps absent host");
  assert.equal(missingOutput.length, 0);

  process.stdout.write(`${JSON.stringify({ result: "PASS", protocolFraming: "PASS", ping: "PASS", saves: [1, 20], oversizedBatch: "REJECTED", malformedJson: "REJECTED", oversizedMessage: "REJECTED", secretField: "REJECTED", rawHtml: "REJECTED", permissions: "0700/0600", manifestOrigin: "EXACT", extensionPing: "PASS", extensionSave: "PASS", missingHost: "SAFE_ERROR", strippedPathWrapper: "PASS", wrapperPingFrames: "PASS", noNodeFailClosed: "PASS", liveChromeInstall: 0, providerCalls: 0 })}\n`);
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}
