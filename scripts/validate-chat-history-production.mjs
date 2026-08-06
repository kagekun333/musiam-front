#!/usr/bin/env node

import { randomUUID } from "node:crypto";

const baseUrl = String(process.env.CHAT_HISTORY_BASE_URL || "https://www.hakusyaku.xyz").replace(/\/$/, "");
const allowWrite = process.argv.includes("--allow-write");
const conversationId = randomUUID();
const endpoint = `${baseUrl}/api/chat-history?conversationId=${encodeURIComponent(conversationId)}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 200) }; }
}

if (!allowWrite) {
  const response = await fetch(endpoint, { headers: { accept: "application/json" }, redirect: "manual" });
  const body = await readJson(response);
  console.log(JSON.stringify({
    mode: "read-only",
    baseUrl,
    status: response.status,
    routeAvailable: response.status !== 404,
    apiResponse: body,
    next: "Run with --allow-write only after deployment approval to verify save, restore, and cleanup.",
  }, null, 2));
  process.exit(response.status === 404 ? 2 : 0);
}

const messages = [
  { role: "assistant", content: "今夜はどのような音が残りましたか。", persona: "count" },
  { role: "user", content: "検証用の会話です。静かな曲の続きを話したいです。" },
  { role: "assistant", content: "前回の静けさから、続きを伺います。", persona: "count" },
];

let cleanupStatus = null;
try {
  const putResponse = await fetch(`${baseUrl}/api/chat-history`, {
    method: "PUT",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ conversationId, lang: "ja", messages }),
  });
  const putBody = await readJson(putResponse);
  assert(putResponse.ok && putBody.ok === true, `save failed: HTTP ${putResponse.status}`);

  const getResponse = await fetch(endpoint, { headers: { accept: "application/json" } });
  const getBody = await readJson(getResponse);
  assert(getResponse.ok && getBody.ok === true, `restore failed: HTTP ${getResponse.status}`);
  assert(getBody.history?.conversationId === conversationId, "restored conversationId mismatch");
  assert(getBody.history?.messages?.length === messages.length, "restored message count mismatch");
  assert(getBody.history?.messages?.[1]?.content === messages[1].content, "restored content mismatch");

  console.log(JSON.stringify({
    mode: "write-restore-delete",
    baseUrl,
    saved: true,
    restored: true,
    messageCount: getBody.history.messages.length,
    expiresAt: putBody.expiresAt,
  }, null, 2));
} finally {
  try {
    const deleteResponse = await fetch(endpoint, { method: "DELETE", headers: { accept: "application/json" } });
    const deleteBody = await readJson(deleteResponse);
    cleanupStatus = deleteResponse.ok && deleteBody.ok === true;
  } catch {
    cleanupStatus = false;
  }
  console.log(JSON.stringify({ cleanupDeleted: cleanupStatus }));
  if (!cleanupStatus) process.exitCode = 1;
}
