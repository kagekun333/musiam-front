import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { parseCanonicalReleaseDocument } = require("../../src/lib/distrokid-release-ingestion.ts");

const PORT = 43127;
const MAX_BODY = 1024 * 1024;
const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);

function getArgument(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}
function safeTokenMatch(actual, expected) {
  if (typeof actual !== "string" || !expected) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function reply(response, status, body, origin) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Content-Security-Policy": "default-src 'none'",
  });
  response.end(JSON.stringify(body));
}
function originCategory(origin, expectedOrigin) {
  if (origin === expectedOrigin) return "EXPECTED_EXTENSION";
  if (origin === undefined || origin === null || origin === "") return "MISSING";
  if (origin === "null") return "NULL";
  if (typeof origin === "string" && /^chrome-extension:\/\//i.test(origin)) return "OTHER_CHROME_EXTENSION";
  return "OTHER_ORIGIN";
}
function remoteAddressCategory(remoteAddress) {
  if (typeof remoteAddress !== "string" || !remoteAddress) return "MISSING";
  if (remoteAddress === "127.0.0.1") return "IPV4_LOOPBACK";
  if (remoteAddress === "::1") return "IPV6_LOOPBACK";
  if (remoteAddress === "::ffff:127.0.0.1") return "IPV4_MAPPED_LOOPBACK";
  return "OTHER";
}
export function releaseInboxRequestRejection({ origin, extensionOrigin, remoteAddress }) {
  const observedOriginCategory = originCategory(origin, extensionOrigin);
  if (observedOriginCategory !== "EXPECTED_EXTENSION") {
    return { error: "LOCAL_EXTENSION_ORIGIN_MISMATCH", originCategory: observedOriginCategory };
  }
  const observedRemoteAddressCategory = remoteAddressCategory(remoteAddress);
  if (!["IPV4_LOOPBACK", "IPV6_LOOPBACK", "IPV4_MAPPED_LOOPBACK"].includes(observedRemoteAddressCategory)) {
    return { error: "LOCAL_REMOTE_ADDRESS_REJECTED", remoteAddressCategory: observedRemoteAddressCategory };
  }
  return null;
}
async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY) throw new Error("BODY_TOO_LARGE");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createReleaseInboxServer({ extensionOrigin, inbox: inboxArgument }) {
  if (!inboxArgument || !extensionOrigin || !/^chrome-extension:\/\/[a-p]{32}$/.test(extensionOrigin)) {
    throw new Error("Invalid local release inbox origin or path.");
  }
  const inbox = path.resolve(inboxArgument);
  const relative = path.relative(ROOT, inbox);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Inbox path must be outside the repository.");
  }
  const challenges = new Map();
  const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    const rejection = releaseInboxRequestRejection({ origin, extensionOrigin, remoteAddress: request.socket.remoteAddress });
    if (rejection) {
      reply(response, 403, rejection, extensionOrigin);
      return;
    }
    if (request.method === "OPTIONS" && ["/v1/releases", "/v1/challenge"].includes(request.url)) {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": extensionOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-MUSIAM-Session",
        "Access-Control-Max-Age": "60",
        "Vary": "Origin",
      });
      response.end();
      return;
    }
    if (request.method === "GET" && request.url === "/v1/challenge") {
      const now = Date.now();
      for (const [nonce, expiresAt] of challenges) if (expiresAt <= now) challenges.delete(nonce);
      if (challenges.size >= 128) { reply(response, 429, { error: "CHALLENGE_LIMIT" }, extensionOrigin); return; }
      const nonce = crypto.randomBytes(32).toString("base64url");
      challenges.set(nonce, now + 60_000);
      reply(response, 200, { nonce }, extensionOrigin);
      return;
    }
    if (request.method !== "POST" || request.url !== "/v1/releases") { reply(response, 404, { error: "NOT_FOUND" }, extensionOrigin); return; }
    const nonce = request.headers["x-musiam-session"];
    let acceptedNonce = null;
    let expiresAt = null;
    for (const [candidate, expiry] of challenges) {
      if (safeTokenMatch(nonce, candidate)) { acceptedNonce = candidate; expiresAt = expiry; break; }
    }
    if (acceptedNonce) challenges.delete(acceptedNonce);
    if (!expiresAt || expiresAt <= Date.now()) { reply(response, 401, { error: "SESSION_REJECTED" }, extensionOrigin); return; }
    if (!String(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) { reply(response, 415, { error: "JSON_REQUIRED" }, extensionOrigin); return; }
    try {
      const payload = await readBody(request);
      if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.releases) || payload.releases.length > 20) throw new Error("INVALID_BATCH");
      const releases = parseCanonicalReleaseDocument(payload);
      await fs.mkdir(inbox, { recursive: true, mode: 0o700 });
      const target = path.join(inbox, `release-capture-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID()}.json`);
      const safePayload = `${JSON.stringify({ schemaVersion: 1, releases }, null, 2)}\n`;
      await fs.writeFile(target, safePayload, { flag: "wx", mode: 0o600 });
      reply(response, 201, { accepted: releases.length }, extensionOrigin);
    } catch (error) {
      const code = error instanceof Error && error.message === "BODY_TOO_LARGE" ? "BODY_TOO_LARGE" : "INVALID_RELEASE_BATCH";
      reply(response, code === "BODY_TOO_LARGE" ? 413 : 400, { error: code }, extensionOrigin);
    }
  });
  return server;
}

async function start() {
  const inbox = getArgument("inbox");
  const extensionOrigin = getArgument("extension-origin");
  if (!inbox || !extensionOrigin) throw new Error("Set --inbox outside the repo and --extension-origin=chrome-extension://<32-char-id>.");
  const server = createReleaseInboxServer({ extensionOrigin, inbox });
  server.listen(PORT, "127.0.0.1", () => process.stdout.write(`MUSIAM release inbox listening on 127.0.0.1:${PORT}\n`));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) start().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Release inbox unavailable"}\n`);
  process.exitCode = 1;
});
