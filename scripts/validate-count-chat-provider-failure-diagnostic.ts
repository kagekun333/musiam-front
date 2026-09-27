import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import type { ProviderFailureCode } from "../src/lib/llm-router";

const keys = ["OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "GROQ_API_KEY", "LMSTUDIO_BASE_URL", "LMSTUDIO_MODEL"];
const originalEnv = new Map(keys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const originalError = console.error;
const logs: unknown[][] = [];
let externalFetches = 0;
let fetchMode: "status" | "network" | "timeout" | "invalid" | "empty" = "status";
let statuses: number[] = [];
let timeoutAt = -1;
const allLogs: unknown[][] = [];
console.error = (...items) => { logs.push(items); allLogs.push(items); };
globalThis.fetch = async (_input, init) => {
  externalFetches += 1;
  if (fetchMode === "network") throw new TypeError("PROMPT_SENTINEL API_KEY_SENTINEL UPSTREAM_BODY_SENTINEL");
  if (fetchMode === "timeout" && externalFetches === timeoutAt) return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("PROMPT_SENTINEL API_KEY_SENTINEL", "AbortError")), { once: true });
  });
  if (fetchMode === "empty") return new Response("", { status: 200 });
  if (fetchMode === "invalid") return new Response("UPSTREAM_BODY_SENTINEL", { status: 200 });
  const status = statuses.shift() ?? 503;
  return new Response(status === 200
    ? JSON.stringify({ choices: [{ message: { content: "Synthetic provider answer." } }], model: "openai/gpt-6-luna", raw: "UPSTREAM_BODY_SENTINEL" })
    : "UPSTREAM_BODY_SENTINEL API_KEY_SENTINEL PROMPT_SENTINEL", { status });
};

const input = { purpose: "quality" as const, system: "SYSTEM_PROMPT_SENTINEL",
  messages: [{ role: "user" as const, content: "USER_PROMPT_SENTINEL" }], maxTokens: 16, trace: "safe-trace-123" };
function logEvent() {
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], "COUNT_CHAT_LLM_ALL_FAILED");
  return logs[0][1] as { trace?: string; attemptCount: number; attempts: { provider: string; requestedModel: string | null; outcome: string; failureCode: ProviderFailureCode | null }[] };
}
function clearLogs() { logs.length = 0; }

async function main() {
  for (const key of keys) delete process.env[key];
  if (process.argv.includes("--missing-only")) {
    const missingRouter = await import("../src/lib/llm-router");
    const noConfig = await missingRouter.chat(input);
    assert.equal(externalFetches, 0);
    assert.equal(noConfig.diagnostics?.length, 4);
    assert.ok(noConfig.diagnostics?.every((attempt) => attempt.failureCode === "not_configured"));
    assert.equal(logEvent().attemptCount, 4);
    assert.doesNotMatch(JSON.stringify(allLogs), /SENTINEL|SECRET|Bearer|authorization/i);
    console.error = originalError; globalThis.fetch = originalFetch;
    console.log("MISSING_CONFIG_CASE=PASS external_provider_calls=0");
    return;
  }
  const missing = spawnSync(process.execPath, ["--import", "tsx", "scripts/validate-count-chat-provider-failure-diagnostic.ts", "--missing-only"], {
    cwd: process.cwd(), env: { PATH: process.env.PATH ?? "" } as unknown as NodeJS.ProcessEnv, encoding: "utf8",
  });
  assert.equal(missing.status, 0, missing.stderr);
  assert.match(missing.stdout, /MISSING_CONFIG_CASE=PASS external_provider_calls=0/);
  clearLogs();

  process.env.OPENROUTER_API_KEY = "sk-TEST_CREDENTIAL_SENTINEL";
  process.env.ANTHROPIC_API_KEY = "sk-TEST_ANTHROPIC_SENTINEL";
  process.env.GROQ_API_KEY = "gsk_TEST_GROQ_SENTINEL";
  process.env.LMSTUDIO_BASE_URL = "http://127.0.0.1:1234/v1";
  process.env.LMSTUDIO_MODEL = "synthetic/lmstudio-model";
  const router = await import("../src/lib/llm-router");

  assert.deepEqual([400, 401, 402, 429, 503].map(router.classifyHttpFailure),
    ["http_400", "http_401", "http_402", "http_429", "http_5xx"]);
  assert.equal(router.classifyProviderFailure(new TypeError("SECRET")), "network_error");
  assert.equal(router.classifyProviderFailure(Object.assign(new Error("SECRET"), { name: "LlmProviderTimeout" })), "timeout");

  for (const [httpStatus, expected] of [[400, "http_400"], [401, "http_401"], [402, "http_402"], [429, "http_429"]] as const) {
    clearLogs(); fetchMode = "status"; statuses = [httpStatus, 503, 503, 503];
    const result = await router.chat(input);
    assert.equal(result.provider, "none");
    assert.equal(result.diagnostics?.[0].failureCode, expected);
    assert.ok(result.diagnostics?.slice(1).every((attempt) => attempt.failureCode === "http_5xx"));
    assert.equal(logEvent().attempts[0].requestedModel, "openai/gpt-6-luna");
  }

  clearLogs(); fetchMode = "empty"; statuses = [503, 503, 503];
  const empty = await router.chat(input);
  assert.equal(empty.diagnostics?.[0].failureCode, "empty_response");
  assert.equal(logEvent().attempts[0].failureCode, "empty_response");

  clearLogs(); fetchMode = "invalid"; statuses = [503, 503, 503];
  const invalid = await router.chat(input);
  assert.equal(invalid.diagnostics?.[0].failureCode, "invalid_response");
  assert.equal(logEvent().attempts[0].failureCode, "invalid_response");

  clearLogs(); fetchMode = "network";
  const network = await router.chat(input);
  assert.equal(network.diagnostics?.[0].failureCode, "network_error");
  assert.equal(logEvent().attempts[0].failureCode, "network_error");

  clearLogs(); fetchMode = "timeout"; timeoutAt = externalFetches + 1; statuses = [503, 503, 503];
  const timeout = await router.chat(input);
  assert.equal(timeout.diagnostics?.[0].failureCode, "timeout");
  assert.equal(logEvent().attempts[0].failureCode, "timeout");

  clearLogs(); fetchMode = "status"; statuses = [401, 402, 400, 429];
  const allFailed = await router.chat(input);
  assert.equal(allFailed.diagnostics?.length, 4);
  const aggregate = logEvent();
  assert.deepEqual(aggregate.attempts.map((attempt) => [attempt.provider, attempt.failureCode]), [
    ["openrouter", "http_401"], ["anthropic", "http_402"], ["groq", "http_400"], ["lmstudio", "http_429"],
  ]);
  assert.equal(aggregate.trace, "safe-trace-123");

  clearLogs(); fetchMode = "status"; statuses = [200];
  const successful = await router.chat(input);
  assert.equal(successful.provider, "openrouter");
  assert.equal(successful.model, "openai/gpt-6-luna");
  assert.equal(successful.diagnostics?.length, 1);
  assert.equal(successful.diagnostics?.[0].outcome, "success");
  assert.equal(logs.length, 0, "successful provider does not produce all-failed event");

  const serializedDiagnostics = JSON.stringify(allLogs);
  assert.doesNotMatch(serializedDiagnostics, /SENTINEL|SECRET|Bearer|authorization/i);
  // All failure and success requests above were intercepted locally.
  assert.ok(externalFetches > 0);
  console.error = originalError; globalThis.fetch = originalFetch;
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  console.log(`COUNT_CHAT_PROVIDER_FAILURE_DIAGNOSTIC_FIXTURE=PASS intercepted_attempts=${externalFetches} external_provider_calls=0 secret_or_body_log_leaks=0`);
}

void main().catch((error) => {
  console.error = originalError; globalThis.fetch = originalFetch;
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  console.error(error); process.exitCode = 1;
});
