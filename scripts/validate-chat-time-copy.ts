#!/usr/bin/env tsx

import assert from "node:assert/strict";
import {
  SALON_TIME_TONE_VALUES,
  PRODUCTS,
  SUPPORTED_LANG_VALUES,
  getChatUiText,
  getLanguageProfile,
  getLocalizedSalonTimeCopy,
  getSalonStarters,
  getSalonTimeCopy,
  getSalonTimeTone,
  normalizeLang,
  normalizeSalonTimeTone,
  productCtaLabelForLang,
  type Lang,
  type SalonTimeTone,
} from "../src/lib/chat-experience";

const expectedTones = ["morning", "afternoon", "evening", "night", "lateNight"] as const;
const expectedLangs = ["ja", "en", "fr", "es", "de", "ar"] as const;

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

const nightBiasPattern: Record<Lang, RegExp> = {
  ja: /今夜|夜ふけ|夜更け/,
  en: /tonight|late[- ]?hour|late hours/i,
  fr: /cette nuit|heure tardive|heures tardives|\bnuit\b/i,
  es: /esta noche|madrugada|\bnoche\b/i,
  de: /diese Nacht|späte Stunde|späten Stunde|\bNacht\b/i,
  ar: /آخر الليل|هذه الليلة|عتبة الليل|الليل|ليلك/,
};

function assertNoNightBias(lang: Lang, tone: SalonTimeTone) {
  if (tone === "night" || tone === "lateNight") return;
  const copy = getLocalizedSalonTimeCopy(lang, tone);
  const visibleCopy = [
    copy.subtitle,
    copy.opening,
    copy.fallback,
    copy.longClose,
    copy.giftKicker,
    copy.workTitle,
    copy.error,
    copy.leadPrompt,
    copy.leadToast,
    ...copy.starters,
  ].join("\n");

  assert.doesNotMatch(visibleCopy, nightBiasPattern[lang], `${tone}/${lang} visible copy should not force night wording`);
}

function assertStarters(lang: Lang, tone: SalonTimeTone) {
  const copy = getLocalizedSalonTimeCopy(lang, tone);
  const starters = getSalonStarters(lang, tone);
  assert.deepEqual(starters, copy.starters);
  assert.ok(starters.length >= 5, `${tone}/${lang} should keep enough starter chips`);
  for (const starter of starters) assertTextPresent(`${tone}.${lang}.starter`, starter);
}

assert.deepEqual(SALON_TIME_TONE_VALUES, expectedTones);
assert.deepEqual(SUPPORTED_LANG_VALUES, expectedLangs);

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

assert.equal(normalizeLang("ja"), "ja");
assert.equal(normalizeLang("en-US"), "en");
assert.equal(normalizeLang("fr-FR"), "fr");
assert.equal(normalizeLang("es_MX"), "es");
assert.equal(normalizeLang("ar-EG"), "ar");
assert.equal(normalizeLang("de-DE"), "de");
assert.equal(normalizeLang(null), "ja");

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
  for (const lang of SUPPORTED_LANG_VALUES) {
    const localized = getLocalizedSalonTimeCopy(lang, tone);
    assertTextPresent(`${tone}.${lang}.subtitle`, localized.subtitle);
    assertTextPresent(`${tone}.${lang}.opening`, localized.opening);
    assertTextPresent(`${tone}.${lang}.prompt`, localized.prompt);
    assertTextPresent(`${tone}.${lang}.fallback`, localized.fallback);
    assertTextPresent(`${tone}.${lang}.longClose`, localized.longClose);
    assertTextPresent(`${tone}.${lang}.giftKicker`, localized.giftKicker);
    assertTextPresent(`${tone}.${lang}.workTitle`, localized.workTitle);
    assertTextPresent(`${tone}.${lang}.error`, localized.error);
    assertTextPresent(`${tone}.${lang}.leadPrompt`, localized.leadPrompt);
    assertTextPresent(`${tone}.${lang}.leadToast`, localized.leadToast);
    assertStarters(lang, tone);
    assertNoNightBias(lang, tone);
  }
}

for (const lang of SUPPORTED_LANG_VALUES) {
  const profile = getLanguageProfile(lang);
  assertTextPresent(`${lang}.label`, profile.label);
  assertTextPresent(`${lang}.nativeName`, profile.nativeName);
  assertTextPresent(`${lang}.englishName`, profile.englishName);
  assert.ok(profile.dir === "ltr" || profile.dir === "rtl", `${lang}.dir should be ltr or rtl`);

  const ui = getChatUiText(lang);
  for (const [key, value] of Object.entries(ui)) {
    assertTextPresent(`${lang}.ui.${key}`, value);
  }

  for (const product of PRODUCTS) {
    assertTextPresent(`${lang}.product.${product.id}.ctaLabel`, productCtaLabelForLang(product, lang));
  }
}

console.log(`[validate-chat-time-copy] ${SUPPORTED_LANG_VALUES.length} languages x ${SALON_TIME_TONE_VALUES.length} time tones passed.`);
