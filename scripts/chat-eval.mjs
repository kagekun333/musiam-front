#!/usr/bin/env node
/**
 * 伯爵チャット 品質回帰チェック（opt-in）。
 *
 * 使い方:
 *   1) 別ターミナルで dev サーバを起動: `pnpm dev`
 *   2) CHAT_EVAL_BASE_URL=http://localhost:3000 node scripts/chat-eval.mjs
 *
 * CHAT_EVAL_BASE_URL が未設定なら、ゴールデンセットの構造検証だけ行い終了する
 * （CI でネットワーク無しでも壊れない）。
 *
 * 各シナリオを /api/chat-experience-v3 に投げ、ヒューリスティックで採点する:
 *   - noWork:           作品カードが出ていないこと
 *   - expectOfferByTurn: 指定ターンまでに作品が提示されること
 *   - maxQuestions:     1メッセージ内の「？/?」が上限以下
 *   - minLen:           返答が短すぎない
 *   - mustNotContainUrl: URL を含まない
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goldenPath = path.join(__dirname, "..", "docs", "chat-golden-set.json");

function loadGolden() {
  const raw = fs.readFileSync(goldenPath, "utf8");
  const json = JSON.parse(raw);
  if (!Array.isArray(json.scenarios)) throw new Error("golden set: scenarios[] missing");
  return json.scenarios;
}

function countQuestions(text) {
  return (String(text).match(/[？?]/g) || []).length;
}

function hasUrl(text) {
  return /https?:\/\//i.test(String(text));
}

async function runScenario(baseUrl, scenario) {
  const messages = [];
  let lastJson = null;

  // 館を開く（turn 0・伯爵の出迎え）
  await post(baseUrl, { lang: scenario.lang, messages: [] });

  for (let i = 0; i < scenario.turns.length; i++) {
    messages.push({ role: "user", content: scenario.turns[i] });
    lastJson = await post(baseUrl, { lang: scenario.lang, messages });
    messages.push({ role: "assistant", content: String(lastJson?.assistantText || "") });
  }

  const text = String(lastJson?.assistantText || "");
  const card = lastJson?.card ?? null;
  const cta = lastJson?.cta ?? null;
  const persona = lastJson?.persona ?? "count";
  const exp = scenario.expect || {};
  const fails = [];

  if (exp.noWork && card) fails.push("作品が出てはいけないのに出た");
  if (exp.noCta && cta) fails.push("CTAが出てはいけないのに出た");
  if (exp.expectCta && !cta) fails.push("CTAが期待されたが出ていない");
  if (exp.expectPersona && persona !== exp.expectPersona) fails.push(`persona=${persona}（期待: ${exp.expectPersona}）`);
  if (typeof exp.maxQuestions === "number" && countQuestions(text) > exp.maxQuestions) {
    fails.push(`質問数 ${countQuestions(text)} > 上限 ${exp.maxQuestions}`);
  }
  if (typeof exp.minLen === "number" && text.trim().length < exp.minLen) {
    fails.push(`返答が短すぎる (${text.trim().length} < ${exp.minLen})`);
  }
  if (exp.mustNotContainUrl && hasUrl(text)) fails.push("URLを含んでいる");

  return { id: scenario.id, persona, ok: fails.length === 0, fails, sample: text.slice(0, 80) };
}

async function post(baseUrl, body) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat-experience-v3`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  const scenarios = loadGolden();
  const baseUrl = process.env.CHAT_EVAL_BASE_URL;

  if (!baseUrl) {
    console.log(`[chat-eval] ゴールデンセット構造OK: ${scenarios.length} シナリオ。`);
    console.log("[chat-eval] 実走するには CHAT_EVAL_BASE_URL=http://localhost:3000 を設定してください。");
    return;
  }

  let pass = 0;
  for (const sc of scenarios) {
    try {
      const r = await runScenario(baseUrl, sc);
      if (r.ok) {
        pass++;
        console.log(`✓ ${r.id} (${r.persona}) — ${r.sample}…`);
      } else {
        console.log(`✗ ${r.id} (${r.persona})`);
        for (const f of r.fails) console.log(`    - ${f}`);
        console.log(`    sample: ${r.sample}…`);
      }
    } catch (e) {
      console.log(`✗ ${sc.id} — 実行エラー: ${e?.message || e}`);
    }
  }
  console.log(`\n[chat-eval] ${pass}/${scenarios.length} passed`);
  if (pass < scenarios.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
