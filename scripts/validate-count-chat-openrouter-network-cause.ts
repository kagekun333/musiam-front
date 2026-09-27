import assert from "node:assert/strict";

const originalFetch = globalThis.fetch;
const originalError = console.error;
const logEvents: unknown[][] = [];
let nextFailure: { code?: string; causeName?: string; errorName?: string } | null = null;
let interceptedFetches = 0;
console.error = (...items) => { logEvents.push(items); };

process.env.OPENROUTER_API_KEY = "fixture-only-openrouter-key";
process.env.ANTHROPIC_API_KEY = "fixture-only-anthropic-key";
process.env.GROQ_API_KEY = "fixture-only-groq-key";
process.env.LMSTUDIO_BASE_URL = "http://127.0.0.1:1234/v1";
process.env.LMSTUDIO_MODEL = "fixture/local-model";

globalThis.fetch = async () => {
  interceptedFetches += 1;
  if (interceptedFetches % 4 === 1) {
    const selected = nextFailure;
    const cause = selected?.code === undefined && selected?.causeName === undefined ? undefined : {
      ...(selected?.causeName ? { name: selected.causeName } : {}),
      ...(selected?.code ? { code: selected.code } : {}),
      message: "CAUSE_MESSAGE_SECRET_SENTINEL",
    };
    const error = new TypeError("ERROR_MESSAGE_SECRET PROMPT_SECRET UPSTREAM_SECRET");
    if (cause) Object.defineProperty(error, "cause", { value: cause });
    if (selected?.errorName) error.name = selected.errorName;
    throw error;
  }
  return new Response("UPSTREAM_BODY_SECRET_SENTINEL", { status: 503 });
};

function aggregate() {
  assert.equal(logEvents.length, 1);
  assert.equal(logEvents[0][0], "COUNT_CHAT_LLM_ALL_FAILED");
  const event = logEvents[0][1] as { attempts: Array<Record<string, unknown>> };
  assert.equal(event.attempts[0].provider, "openrouter");
  assert.equal(event.attempts[0].requestedModel, "openai/gpt-6-luna");
  assert.equal(event.attempts[0].failureCode, "network_error");
  assert.equal(event.attempts.length, 4);
  return event.attempts[0];
}

async function main() {
  const router = await import("../src/lib/llm-router");
  const cases = [
    { label: "ENOTFOUND", input: { code: "ENOTFOUND", causeName: "Error" }, code: "ENOTFOUND", name: "Error" },
    { label: "ECONNREFUSED", input: { code: "ECONNREFUSED", causeName: "SystemError" }, code: "ECONNREFUSED", name: "SystemError" },
    { label: "ETIMEDOUT", input: { code: "ETIMEDOUT", causeName: "Error" }, code: "ETIMEDOUT", name: "Error" },
    { label: "UND_ERR_CONNECT_TIMEOUT", input: { code: "UND_ERR_CONNECT_TIMEOUT", causeName: "ConnectTimeoutError" }, code: "UND_ERR_CONNECT_TIMEOUT", name: "ConnectTimeoutError" },
    { label: "TLS", input: { code: "ERR_TLS_CERT_ALTNAME_INVALID", causeName: "Error" }, code: "ERR_TLS_CERT_ALTNAME_INVALID", name: "Error" },
    { label: "unknown", input: { code: "SECRET_UNKNOWN_CODE", causeName: "SECRET_UNKNOWN_NAME" }, code: "NETWORK_CAUSE_UNKNOWN", name: "UNKNOWN" },
    { label: "no cause", input: { errorName: "TypeError" }, code: "NETWORK_CAUSE_UNKNOWN", name: "TypeError" },
  ] as const;

  for (const testCase of cases) {
    nextFailure = testCase.input;
    logEvents.length = 0;
    const result = await router.chat({ purpose: "quality", trace: "network-cause-fixture",
      messages: [{ role: "user", content: "SYNTHETIC_PROMPT_SENTINEL" }] });
    assert.equal(result.provider, "none");
    assert.equal(result.diagnostics?.[0].failureCode, "network_error", testCase.label);
    const attempt = aggregate();
    assert.equal(attempt.networkCauseCode, testCase.code, testCase.label);
    assert.equal(attempt.networkCauseName, testCase.name, testCase.label);
    assert.equal(JSON.stringify(logEvents).includes("SECRET"), false, `${testCase.label}: secret/raw error leaked`);
    assert.equal(JSON.stringify(logEvents).includes("SYNTHETIC_PROMPT"), false, `${testCase.label}: prompt leaked`);
    assert.equal(JSON.stringify(logEvents).includes("UPSTREAM_BODY"), false, `${testCase.label}: response body leaked`);
  }

  assert.equal(interceptedFetches, cases.length * 4);
  console.error = originalError;
  globalThis.fetch = originalFetch;
  console.log(`COUNT_CHAT_OPENROUTER_NETWORK_CAUSE_FIXTURE=PASS cases=${cases.length} intercepted_attempts=${interceptedFetches} external_provider_calls=0 raw_error_or_secret_leaks=0`);
}

void main().catch(() => {
  console.error = originalError;
  globalThis.fetch = originalFetch;
  // Do not print exception text: fixture failures must not expose raw sentinels.
  console.error("COUNT_CHAT_OPENROUTER_NETWORK_CAUSE_FIXTURE=FAIL");
  process.exitCode = 1;
});
