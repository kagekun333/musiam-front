import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";

const MOOD_TAG_VOCABULARY = [
  "静けさ",
  "ノスタルジー",
  "切なさ",
  "高揚",
  "熱狂",
  "多幸感",
  "勇気",
  "浄化",
  "孤独",
  "神秘",
  "夜更け",
  "朝の光",
  "都会",
  "自然",
  "旅心",
  "海辺",
  "宇宙",
  "祈り",
  "哀愁",
  "希望",
  "凛然",
  "優美",
  "緊張",
  "陶酔",
  "怒り",
];

const MOOD_TAG_SET = new Set(MOOD_TAG_VOCABULARY);

const API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const MODEL = (process.env.CODEX_MODEL || "").trim();
const API_BASE_URL = ((process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim() || "https://api.openai.com/v1").replace(/\/+$/, "");

const WORKS_PATH = path.join(process.cwd(), "public/works/works.json");

if (!API_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable.");
  process.exit(1);
}

if (!MODEL) {
  console.error("Missing CODEX_MODEL environment variable.");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: API_KEY,
  baseURL: API_BASE_URL,
});

async function readWorks() {
  const raw = await fs.readFile(WORKS_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
    throw new Error("Unexpected works.json format: missing items array.");
  }
  return parsed;
}

function buildSystemPrompt() {
  return [
    "You are an assistant that labels creative works with mood tags.",
    "Choose between three and seven unique tags that best fit the provided title.",
    "Use ONLY the vocabulary provided.",
    "Return the result as a JSON array of strings with no additional commentary.",
  ].join(" ");
}

function buildUserPrompt(title) {
  return [
    "Vocabulary:",
    MOOD_TAG_VOCABULARY.map((tag) => `- ${tag}`).join("\n"),
    "\nTitle:",
    title,
  ].join("\n");
}

function extractTextFromResponse(data) {
  if (!data || typeof data !== "object") return "";

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  if (Array.isArray(data.output)) {
    const parts = [];
    for (const message of data.output) {
      const content = message?.content;
      if (!Array.isArray(content)) continue;
      for (const piece of content) {
        if (typeof piece?.text === "string") {
          parts.push(piece.text);
        } else if (typeof piece?.content === "string") {
          parts.push(piece.content);
        } else if (typeof piece === "string") {
          parts.push(piece);
        }
      }
    }
    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  if (Array.isArray(data.choices)) {
    const parts = [];
    for (const choice of data.choices) {
      const message = choice?.message;
      if (!message) continue;
      const { content } = message;
      if (typeof content === "string") {
        parts.push(content);
      } else if (Array.isArray(content)) {
        for (const piece of content) {
          if (typeof piece === "string") {
            parts.push(piece);
          } else if (typeof piece?.text === "string") {
            parts.push(piece.text);
          }
        }
      }
    }
    if (parts.length > 0) {
      return parts.join("\n");
    }
  }

  if (typeof data.text === "string") {
    return data.text;
  }

  return "";
}

function parseTagsFromText(text) {
  if (!text) return [];
  const trimmed = text.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  const candidate = start !== -1 && end !== -1 && end >= start ? trimmed.slice(start, end + 1) : trimmed;
  try {
    const parsed = JSON.parse(candidate);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    return [];
  }
}

function normalizeTags(rawTags) {
  if (!Array.isArray(rawTags)) return [];
  const result = [];
  const seen = new Set();
  for (const entry of rawTags) {
    const value = typeof entry === "string" ? entry.trim() : "";
    if (!value) continue;
    if (!MOOD_TAG_SET.has(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  if (result.length < 3 || result.length > 7) {
    return [];
  }
  return result;
}

function formatOpenAIError(prefix, error) {
  if (error && typeof error === "object") {
    const parts = [];
    const status = typeof error.status === "number" ? `status ${error.status}` : "";
    const code = typeof error.code === "string" && error.code ? `code ${error.code}` : "";
    const message =
      typeof error.message === "string" && error.message
        ? error.message
        : typeof error?.error?.message === "string" && error.error.message
          ? error.error.message
          : "";

    if (status) parts.push(status);
    if (code) parts.push(code);
    if (message) parts.push(message);

    if (parts.length > 0) {
      return new Error(`${prefix}: ${parts.join(" - ")}`);
    }
  }

  return new Error(`${prefix}: ${error instanceof Error ? error.message : String(error)}`);
}

async function callResponsesEndpoint(systemPrompt, userPrompt) {
  try {
    const payload = await openai.responses.create({
      model: MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: systemPrompt,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
      temperature: 0,
      max_output_tokens: 200,
    });
    return extractTextFromResponse(payload);
  } catch (error) {
    throw formatOpenAIError("OpenAI responses endpoint failed", error);
  }
}

async function callChatCompletionsEndpoint(systemPrompt, userPrompt) {
  try {
    const payload = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 200,
    });
    return extractTextFromResponse(payload);
  } catch (error) {
    throw formatOpenAIError("OpenAI chat completions endpoint failed", error);
  }
}

async function fetchMoodTags(title) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(title);
  const errors = [];

  for (const caller of [callResponsesEndpoint, callChatCompletionsEndpoint]) {
    try {
      const text = await caller(systemPrompt, userPrompt);
      const parsed = parseTagsFromText(text);
      const normalized = normalizeTags(parsed);
      if (normalized.length > 0) {
        return normalized;
      }
      errors.push(new Error(`Unable to extract valid tags from response: ${text}`));
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  const messages = errors.map((error) => error.message).join("\n");
  throw new Error(`Failed to generate mood tags for \"${title}\".\n${messages}`);
}

async function main() {
  const works = await readWorks();
  let updates = 0;

  for (const item of works.items) {
    if (Array.isArray(item.moodTags) && item.moodTags.length > 0) {
      continue;
    }

    console.log(`Generating mood tags for: ${item.title}`);
    try {
      const tags = await fetchMoodTags(item.title);
      item.moodTags = tags;
      updates += 1;
      console.log(`  → ${tags.join(", ")}`);
    } catch (error) {
      console.error(`  Failed to generate mood tags: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (updates > 0) {
    await fs.writeFile(WORKS_PATH, `${JSON.stringify(works, null, 2)}\n`, "utf-8");
    console.log(`Updated mood tags for ${updates} works.`);
  } else {
    console.log("No updates were necessary.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
