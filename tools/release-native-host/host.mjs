import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { parseCanonicalReleaseDocument } = require("../../src/lib/distrokid-release-ingestion.ts");
export const MAX_MESSAGE_BYTES = 1024 * 1024;
export const HOST_NAME = "com.hakusyaku.musiam.release_inbox";
const useLittleEndian = os.endianness() === "LE";

function readLength(buffer) {
  return useLittleEndian ? buffer.readUInt32LE(0) : buffer.readUInt32BE(0);
}

export function encodeNativeMessage(value) {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  if (body.length > MAX_MESSAGE_BYTES) throw new Error("MESSAGE_TOO_LARGE");
  const header = Buffer.alloc(4);
  if (useLittleEndian) header.writeUInt32LE(body.length, 0);
  else header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}

export function safeErrorCode(error) {
  if (error === "NATIVE_HOST_INVALID_MESSAGE" || error === "NATIVE_HOST_INVALID_RELEASE_BATCH" || error === "NATIVE_HOST_WRITE_FAILED") return error;
  return "NATIVE_HOST_INVALID_MESSAGE";
}

function containsRawHtml(value) {
  if (typeof value === "string") return /<!doctype\s+html|<html(?:\s|>)|<script(?:\s|>)|<body(?:\s|>)/i.test(value);
  if (Array.isArray(value)) return value.some(containsRawHtml);
  if (value && typeof value === "object") return Object.values(value).some(containsRawHtml);
  return false;
}

export function createNativeHost({ inboxPath = path.join(os.homedir(), "Library/Application Support/HakusyakuMUSIAM/release-inbox"), parseBatch = parseCanonicalReleaseDocument } = {}) {
  return async function handleMessage(message) {
    if (!message || typeof message !== "object" || Array.isArray(message)) return { ok: false, code: "NATIVE_HOST_INVALID_MESSAGE" };
    if (message.op === "ping" && Object.keys(message).length === 1) return { ok: true, bridge: "MUSIAM_RELEASE_NATIVE_HOST" };
    if (message.op !== "saveReleaseBatch" || Object.keys(message).some((key) => !["op", "payload"].includes(key))) {
      return { ok: false, code: "NATIVE_HOST_INVALID_MESSAGE" };
    }
    const payload = message.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.schemaVersion !== 1 ||
      Object.keys(payload).some((key) => !["schemaVersion", "releases"].includes(key)) || !Array.isArray(payload.releases) ||
      payload.releases.length > 20 || containsRawHtml(payload)) {
      return { ok: false, code: "NATIVE_HOST_INVALID_RELEASE_BATCH" };
    }
    let releases;
    try {
      releases = parseBatch(payload);
    } catch {
      return { ok: false, code: "NATIVE_HOST_INVALID_RELEASE_BATCH" };
    }
    try {
      await fs.mkdir(inboxPath, { recursive: true, mode: 0o700 });
      await fs.chmod(inboxPath, 0o700);
      const filename = `release-capture-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID()}.json`;
      const canonical = `${JSON.stringify({ schemaVersion: 1, releases }, null, 2)}\n`;
      await fs.writeFile(path.join(inboxPath, filename), canonical, { flag: "wx", mode: 0o600 });
      return { ok: true, accepted: releases.length };
    } catch {
      return { ok: false, code: "NATIVE_HOST_WRITE_FAILED" };
    }
  };
}

export async function runNativeHost({ input = process.stdin, output = process.stdout, handle = createNativeHost() } = {}) {
  let buffer = Buffer.alloc(0);
  let stopped = false;
  const writeResponse = async (value) => {
    const frame = encodeNativeMessage(value);
    if (!output.write(frame)) await new Promise((resolve) => output.once("drain", resolve));
  };
  for await (const chunk of input) {
    if (stopped) break;
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 4) {
      const length = readLength(buffer);
      if (length > MAX_MESSAGE_BYTES) {
        await writeResponse({ ok: false, code: "NATIVE_HOST_INVALID_MESSAGE" });
        stopped = true;
        break;
      }
      if (buffer.length < 4 + length) break;
      const body = buffer.subarray(4, 4 + length);
      buffer = buffer.subarray(4 + length);
      let response;
      try {
        response = await handle(JSON.parse(body.toString("utf8")));
      } catch {
        response = { ok: false, code: "NATIVE_HOST_INVALID_MESSAGE" };
      }
      await writeResponse(response);
    }
    if (buffer.length > MAX_MESSAGE_BYTES + 4) {
      await writeResponse({ ok: false, code: "NATIVE_HOST_INVALID_MESSAGE" });
      stopped = true;
    }
  }
  if (buffer.length && !stopped) process.stderr.write("Native messaging input ended with an incomplete frame.\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runNativeHost().catch(() => {
    process.stderr.write("Native messaging host stopped safely.\n");
    process.exitCode = 1;
  });
}
