import assert from "node:assert/strict";
import { requestedWorkMedium, wantsCatalogWork } from "../src/lib/chat-request-medium";

const cases = [
  { query: "夜に静かに聴けるものを一個だけ、日本語で", medium: "music", wants: true },
  { query: "日本語で答えて", medium: undefined, wants: false },
  { query: "日本語の曲ある？", medium: "music", wants: true },
  { query: "本日は晴天ですね", medium: undefined, wants: false },
  { query: "おすすめの本ある？", medium: "book", wants: true },
  { query: "この本読みたい", medium: "book", wants: true },
  { query: "本じゃなくて曲がいい", medium: "music", wants: true },
  { query: "曲じゃなくて本がいい", medium: "book", wants: true },
  { query: "German song please", medium: "music", wants: true },
  { query: "I want to read a book", medium: "book", wants: true },
  { query: "何かおすすめある？", medium: undefined, wants: true },
] as const;

for (const test of cases) {
  assert.equal(requestedWorkMedium(test.query), test.medium, test.query);
  assert.equal(wantsCatalogWork(test.query), test.wants, test.query);
}

console.log(JSON.stringify({
  verdict: "COUNT_CHAT_WORK_MEDIUM_CLASSIFIER=PASS",
  cases: cases.length,
}));
