#!/usr/bin/env tsx

import assert from "node:assert/strict";
import {
  SALON_TIME_TONE_VALUES,
  getSalonStarters,
  getSalonTimeCopy,
  getSalonTimeTone,
  normalizeSalonTimeTone,
  type Lang,
  type SalonTimeTone,
} from "../src/lib/chat-experience";

const expectedTones = ["morning", "afternoon", "evening", "night", "lateNight"] as const;

function at(hour: number, minute = 0) {
  return new Date(2026, 5, 29, hour, minute, 0, 0);
}

function assertBoundary(hour: number, minute: number, expected: SalonTimeTone) {
  assert.equal(
    getSalonTimeTone(at(hour, minute)),
    expected,
    `expected ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} to be ${expected}`
  );
}

function assertTextPresent(label: string, value: string) {
  assert.equal(typeof value, "string", `${label} should be a string`);
  assert.ok(value.trim().length > 0, `${label} should not be empty`);
}

function assertNoNightBias(tone: SalonTimeTone) {
  if (tone === "night" || tone === "lateNight") return;
  const copy = getSalonTimeCopy(tone);
  const visibleJa = [
    copy.subtitleJa,
    copy.openingJa,
    copy.fallbackJa,
    copy.longCloseJa,
    copy.giftKickerJa,
    copy.workTitleJa,
    copy.errorJa,
    copy.leadPromptJa,
    copy.leadToastJa,
    ...copy.startersJa,
  ].join("\n");

  assert.doesNotMatch(visibleJa, /今夜|夜ふけ|夜更け/, `${tone} visible JA copy should not force late-night wording`);
}

function assertStarters(lang: Lang, tone: SalonTimeTone) {
  const copy = getSalonTimeCopy(tone);
  const starters = getSalonStarters(lang, tone);
  assert.deepEqual(starters, lang === "ja" ? copy.startersJa : copy.startersEn);
  assert.ok(starters.length >= 5, `${tone}/${lang} should keep enough starter chips`);
  for (const starter of starters) assertTextPresent(`${tone}.${lang}.starter`, starter);
}

assert.deepEqual(SALON_TIME_TONE_VALUES, expectedTones);

assertBoundary(0, 0, "lateNight");
assertBoundary(4, 59, "lateNight");
assertBoundary(5, 0, "morning");
assertBoundary(10, 59, "morning");
assertBoundary(11, 0, "afternoon");
assertBoundary(16, 59, "afternoon");
assertBoundary(17, 0, "evening");
assertBoundary(20, 59, "evening");
assertBoundary(21, 0, "night");
assertBoundary(23, 59, "night");

assert.equal(normalizeSalonTimeTone("morning"), "morning");
assert.equal(normalizeSalonTimeTone("afternoon"), "afternoon");
assert.equal(normalizeSalonTimeTone("evening"), "evening");
assert.equal(normalizeSalonTimeTone("night"), "night");
assert.equal(normalizeSalonTimeTone("lateNight"), "lateNight");
assert.equal(normalizeSalonTimeTone("late-night"), "night");
assert.equal(normalizeSalonTimeTone(null), "night");

for (const tone of SALON_TIME_TONE_VALUES) {
  const copy = getSalonTimeCopy(tone);
  assertTextPresent(`${tone}.subtitleJa`, copy.subtitleJa);
  assertTextPresent(`${tone}.subtitleEn`, copy.subtitleEn);
  assertTextPresent(`${tone}.openingJa`, copy.openingJa);
  assertTextPresent(`${tone}.openingEn`, copy.openingEn);
  assertTextPresent(`${tone}.promptJa`, copy.promptJa);
  assertTextPresent(`${tone}.promptEn`, copy.promptEn);
  assertTextPresent(`${tone}.fallbackJa`, copy.fallbackJa);
  assertTextPresent(`${tone}.fallbackEn`, copy.fallbackEn);
  assertTextPresent(`${tone}.longCloseJa`, copy.longCloseJa);
  assertTextPresent(`${tone}.longCloseEn`, copy.longCloseEn);
  assertTextPresent(`${tone}.giftKickerJa`, copy.giftKickerJa);
  assertTextPresent(`${tone}.giftKickerEn`, copy.giftKickerEn);
  assertTextPresent(`${tone}.workTitleJa`, copy.workTitleJa);
  assertTextPresent(`${tone}.workTitleEn`, copy.workTitleEn);
  assertTextPresent(`${tone}.errorJa`, copy.errorJa);
  assertTextPresent(`${tone}.errorEn`, copy.errorEn);
  assertTextPresent(`${tone}.leadPromptJa`, copy.leadPromptJa);
  assertTextPresent(`${tone}.leadPromptEn`, copy.leadPromptEn);
  assertTextPresent(`${tone}.leadToastJa`, copy.leadToastJa);
  assertTextPresent(`${tone}.leadToastEn`, copy.leadToastEn);
  assertStarters("ja", tone);
  assertStarters("en", tone);
  assertNoNightBias(tone);
}

console.log(`[validate-chat-time-copy] ${SALON_TIME_TONE_VALUES.length} time tones passed.`);
