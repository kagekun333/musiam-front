import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildOpenRouterRequestBody,
  extractOpenRouterChatResponse,
  OPENROUTER_QUALITY_MODEL,
  OPENROUTER_QUALITY_REASONING_EFFORT,
  routerStatus,
} from "../src/lib/llm-router";

const input = {
  purpose: "quality" as const,
  system: "SERVER TRUSTED PROMPT",
  messages: [
    { role: "system" as const, content: "CLIENT UNTRUSTED PROMPT" },
    { role: "user" as const, content: "Fixed local fixture" },
  ],
  temperature: 0.85,
  maxTokens: 64,
};
const request = buildOpenRouterRequestBody(input, OPENROUTER_QUALITY_MODEL);
assert.equal(OPENROUTER_QUALITY_MODEL, "openai/gpt-6-luna");
assert.equal(OPENROUTER_QUALITY_REASONING_EFFORT, "medium");
assert.equal(request.model, "openai/gpt-6-luna");
assert.ok("reasoning" in request);
assert.deepEqual(request.reasoning, { effort: "medium" });
assert.equal("temperature" in request, false, "GPT-6 Luna reasoning requests omit temperature");
assert.equal("models" in request, false, "OpenRouter routes providers for the selected Luna model");
assert.equal(request.messages[0].role, "system");
assert.equal(request.messages[0].content, "SERVER TRUSTED PROMPT");
assert.equal(request.messages.some((message) => message.content.includes("CLIENT UNTRUSTED")), false);
assert.equal(request.messages.some((message) => message.role === "system" && message.content === "CLIENT UNTRUSTED PROMPT"), false);

const otherModel = buildOpenRouterRequestBody(input, "deepseek/deepseek-v4-flash");
assert.ok("temperature" in otherModel);
assert.equal(otherModel.temperature, 0.85, "other OpenRouter models retain prior temperature behavior");
assert.ok(Array.isArray(otherModel.models), "other model fallback list remains available");
assert.equal("reasoning" in otherModel, false);

const fallbackResponse = extractOpenRouterChatResponse({
  model: "deepseek/deepseek-v4-pro",
  choices: [{ message: { content: "Fallback response" } }],
});
assert.equal(fallbackResponse.ok, true);
assert.equal(fallbackResponse.model, "deepseek/deepseek-v4-pro", "response model metadata must report the model actually used");
assert.equal(fallbackResponse.provider, "openrouter");
assert.equal(extractOpenRouterChatResponse({ choices: [{ message: { content: "  " } }] }).ok, false);
assert.equal(routerStatus().openrouter.model.quality, OPENROUTER_QUALITY_MODEL);

const source = readFileSync("src/lib/llm-router.ts", "utf8");
assert.match(source, /OpenRouter\(GPT-6 Luna Medium\) → Anthropic → Groq → LMStudio/);
assert.match(source, /if \(result\.ok && result\.text\)/);

console.log("COUNT_CHAT_LUNA_ROUTER_FIXTURE=PASS provider_calls=0 network_calls=0");
