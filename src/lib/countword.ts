type PickLike = {
  moodTags?: string[];
  title?: string;
};

const JA_OPENERS = [
  "星明かりの下では、",
  "今夜の空気には、",
  "宇宙の静けさの奥で、",
  "ひそやかな光のように、",
  "まだ名のない余韻が、",
  "今日の心の軌道には、",
  "遠い星のさざめきが、",
  "夜の輪郭にそっと、",
];

const JA_SUBJECTS = [
  "やわらかな答え",
  "小さな入口",
  "澄んだ余白",
  "静かな熱",
  "見落としていた輝き",
  "いま似合う温度",
  "ほどける気配",
  "深呼吸の続き",
];

const JA_ENDINGS = [
  "きっと、次の一作へ導いてくれます。",
  "今日はそれを拾う日です。",
  "無理に急がず、ひとつだけ手に取ってください。",
  "耳を澄ませば、ちょうどいい出会いがあります。",
  "あなたの歩幅で、静かに近づいてきます。",
  "その余韻に、今日は素直でいてください。",
  "焦らずとも、ちゃんと届きます。",
  "今夜はその気配に従ってみてください。",
];

const EN_OPENERS = [
  "Tonight,",
  "Under a quiet sky,",
  "In the hush between stars,",
  "Along today's orbit,",
  "Somewhere in the still air,",
  "Near the edge of this evening,",
];

const EN_SUBJECTS = [
  "a softer answer",
  "a small doorway",
  "a clear pocket of air",
  "a gentle heat",
  "a brighter echo",
  "the right temperature",
];

const EN_ENDINGS = [
  "is already moving toward you.",
  "is enough for tonight.",
  "will meet you if you do not rush.",
  "will find you in one honest choice.",
  "is waiting in the next work you open.",
];

function hash32(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: string, salt: string): T {
  return arr[hash32(`${seed}|${salt}`) % arr.length];
}

function pickMoodToken(items: Array<PickLike | null | undefined>, lang: "ja" | "en", seed: string) {
  const tags = items
    .flatMap((item) => item?.moodTags || [])
    .map((tag) => String(tag).trim())
    .filter((tag) => tag && !/^(ASIN|asin|price|aspect):/i.test(tag))
    .filter((tag) => !/^(square|portrait|landscape)$/i.test(tag));

  if (!tags.length) return "";
  const chosen = tags[hash32(`${seed}|mood` ) % tags.length];

  if (lang === "ja") {
    return `「${chosen}」みたいな気分を、`;
  }
  return `that ${chosen} feeling `;
}

export function fallbackCountWord(lang: "ja" | "en") {
  return lang === "ja"
    ? "今日は、静かな一頁を。耳を澄ませば、あなたに合う一作がある。"
    : "A quiet page today. Listen closely — something here matches you.";
}

export function buildDailyCountWord(
  lang: "ja" | "en",
  ymd: string,
  items: Array<PickLike | null | undefined>
) {
  const seed = `${ymd}|${lang}`;
  const mood = pickMoodToken(items, lang, seed);

  if (lang === "ja") {
    const opener = pick(JA_OPENERS, seed, "o");
    const subject = pick(JA_SUBJECTS, seed, "s");
    const ending = pick(JA_ENDINGS, seed, "e");
    return `${opener}${mood}${subject}が、${ending}`;
  }

  const opener = pick(EN_OPENERS, seed, "o");
  const subject = pick(EN_SUBJECTS, seed, "s");
  const ending = pick(EN_ENDINGS, seed, "e");
  return `${opener} ${mood}${subject} ${ending}`.replace(/\s+/g, " ").trim();
}
