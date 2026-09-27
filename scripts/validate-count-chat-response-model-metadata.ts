import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { extractOpenRouterChatResponse, type LlmCallResult } from "../src/lib/llm-router";

// Exercise the real extractor and exact API route with only the LLM import
// replaced. Synthetic fallback results test propagation, not live providers.
async function main() {
  const temporary = mkdtempSync(join(tmpdir(), "count-chat-model-metadata-"));
  const previousFetch = globalThis.fetch;
  let externalFetches = 0;
  globalThis.fetch = async () => { externalFetches += 1; throw new Error("EXTERNAL_FETCH_DISABLED"); };
  try {
    const routeSource = readFileSync("src/pages/api/chat-experience-v3.ts", "utf8");
    const routerImport = 'from "@/lib/llm-router"';
    assert.equal(routeSource.split(routerImport).length, 2);
    const stubPath = join(temporary, "stub.ts");
    writeFileSync(stubPath, `
      export const calls: unknown[] = [];
      let result: unknown;
      export function setResult(value: unknown) { result = value; }
      export async function chat(input: unknown) { calls.push(input); return result; }
    `);
    writeFileSync(join(temporary, "route.ts"), routeSource
      .replace(routerImport, 'from "./stub"')
      .replace('from "zod"', `from "${resolve("node_modules/zod")}"`));
    const [{ default: handler }, stub] = await Promise.all([
      import(pathToFileURL(join(temporary, "route.ts")).href),
      import(pathToFileURL(stubPath).href),
    ]);
    let serial = 0;
    const prompt = "Why does a quiet pause make a conversation feel different? Reply in one short sentence.";
    const user = (content: string) => ({ role: "user", content });
    async function route(messages = [user(prompt)]) {
      let status = 0;
      let body: Record<string, any> = {};
      const before = stub.calls.length;
      const response = {
        setHeader() {},
        status(value: number) { status = value; return this; },
        json(value: Record<string, any>) { body = value; return this; },
      };
      await handler({ method: "POST", headers: { "x-forwarded-for": `metadata-fixture-${++serial}` },
        body: { lang: "en", timeTone: "night", messages } }, response);
      assert.equal(status, 200);
      assert.equal(body.ok, true);
      assert.ok(body.assistantText);
      return { body, stubCalls: stub.calls.length - before };
    }
    const extract = (metadata: Record<string, unknown>) => extractOpenRouterChatResponse({
      ...metadata, choices: [{ message: { content: "Synthetic answer.", reasoning: "PRIVATE_SENTINEL" } }],
      authorization: "PRIVATE_SENTINEL", system: "PRIVATE_SENTINEL",
    });
    const cases: { name: string; result: LlmCallResult; expected: string | null }[] = [
      { name: "Luna observed", result: extract({ model: "openai/gpt-6-luna" }), expected: "openai/gpt-6-luna" },
      { name: "non-Luna observed", result: extract({ model: "synthetic/non-luna" }), expected: "synthetic/non-luna" },
      ...[{}, { model: null }, { model: "" }, { model: "   " }, { model: 42 }].map((metadata, index) => ({
        name: `unavailable model ${index}`, result: extract(metadata), expected: null,
      })),
      ...(["anthropic", "groq", "lmstudio"] as const).map((provider) => ({
        name: `${provider} fallback`, expected: `synthetic/${provider}-observed`,
        result: { ok: true, text: "Synthetic fallback answer.", provider,
          model: `synthetic/${provider}-observed`, tried: ["openrouter", provider] },
      })),
    ];
    for (const test of cases) {
      if (test.expected === null) assert.equal(test.result.model, "", test.name);
      stub.setResult({ ...test.result, raw: "PRIVATE_SENTINEL", system: "PRIVATE_SENTINEL",
        reasoning: "PRIVATE_SENTINEL", authorization: "PRIVATE_SENTINEL", error: "PRIVATE_SENTINEL" });
      const { body, stubCalls } = await route();
      assert.equal(stubCalls, 1, `${test.name}: LLM generation branch`);
      assert.equal(body.provider, test.result.provider, test.name);
      assert.equal(body.model, test.expected, test.name);
      assert.equal(stub.calls.at(-1).maxTokens, 520);
      assert.equal(JSON.stringify(body).includes("PRIVATE_SENTINEL"), false);
      for (const key of ["raw", "system", "reasoning", "authorization", "error", "tried"]) {
        assert.equal(key in body, false, `${test.name}: no extra router fields`);
      }
    }
    for (const messages of [[], Array.from({ length: 21 }, () => user(prompt)),
      [user("Don't recommend products anymore")], [user("ジョークを言って")]]) {
      const { body, stubCalls } = await route(messages);
      assert.equal(stubCalls, 0, "deterministic branch must not call LLM");
      assert.equal(body.provider, "none");
      assert.equal(body.model, null);
    }
    assert.equal(externalFetches, 0);
    console.log(`COUNT_CHAT_RESPONSE_MODEL_METADATA_FIXTURE=PASS observed_cases=${cases.length} deterministic_cases=4 provider_calls=0 external_fetches=0`);
  } finally {
    globalThis.fetch = previousFetch;
    rmSync(temporary, { recursive: true, force: true });
  }
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
