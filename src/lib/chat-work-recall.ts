import type { CatalogWork } from "@/lib/mergeWorksCatalog";

export type RecallConfidence = "high" | "medium" | "low" | "none";
export type RecallMedium = "music" | "book" | null;

export type RecallCatalogCandidate = {
  workId: string;
  title: string;
  type: string;
  releasedAt: string;
  tags: string[];
};

export type RecallModelDecision = {
  workId: string | null;
  confidence: RecallConfidence;
};

export type FuzzyRecallResult =
  | { status: "exact"; work: CatalogWork; score: number }
  | { status: "ambiguous"; work: null; score: number }
  | { status: "none"; work: null; score: number };

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, "");
}

function mediumForWork(work: CatalogWork): RecallMedium {
  const type = String(work.type ?? "").toLowerCase();
  if (/(music|album|track|song|audio)/.test(type)) return "music";
  if (/(book|novel|read|pdf)/.test(type)) return "book";
  return null;
}

export function recallMediumForQuery(query: string): RecallMedium {
  if (/(?:曲|楽曲|歌|アルバム|音楽|song|track|album|music|morceau|chanson|canción|lied|أغنية|موسيقى)/i.test(query)) return "music";
  if (/(?:本|書籍|小説|読む|book|novel|livre|roman|libro|buch|كتاب)/i.test(query)) return "book";
  return null;
}

export function isWorkRecallRequest(query: string): boolean {
  const text = String(query ?? "").normalize("NFKC").trim();
  if (!text) return false;
  return /(?:なんだっけ|何だっけ|なんて(?:曲|作品|本)|何て(?:曲|作品|本)|(?:曲名|作品名|タイトル).{0,16}(?:何|なん|思い出|忘れ)|あの.{0,24}(?:曲|作品|本).{0,12}(?:何|なん|だっけ)|(?:伯爵|あなた).{0,28}(?:曲|作品|本).{0,12}(?:何|なん|だっけ)|what(?:'s| is| was) (?:that|the) (?:song|work|book)|what was it called|what(?:'s| is) the (?:song|title|name)|can(?:'t|not) remember (?:the )?(?:song|title|name)|trying to remember|which (?:song|work|book)|quel(?:le)? (?:chanson|œuvre|livre)|comment s['’]appelle|cómo se llama|qué (?:canción|obra|libro)|wie heißt|welches (?:lied|werk|buch)|ما اسم|ما هي الأغنية)/i.test(text);
}

function candidatePhrase(query: string): string {
  const text = String(query ?? "").normalize("NFKC").trim();
  const ja = text
    .replace(/^(?:伯爵の|あなたの|あの|その|例の)\s*/u, "")
    .replace(/(?:って|について|とは|は).*/u, "")
    .replace(/の(?:曲|作品|本).*/u, "")
    .replace(/(?:曲|作品|本)(?:名|タイトル)?.*/u, "")
    .trim();
  if (ja && ja !== text) return ja;
  const en = text
    .replace(/^(?:what(?:'s| is| was) (?:that|the) (?:song|work|book)(?: called)?|tell me about|play|listen to|open)\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .trim();
  return en;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i];
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  const max = Math.max(left.length, right.length);
  return max ? 1 - levenshtein(left, right) / max : 0;
}

export function fuzzyRecallWork(query: string, works: CatalogWork[]): FuzzyRecallResult {
  const phrase = candidatePhrase(query);
  const normalizedPhrase = normalize(phrase);
  if (normalizedPhrase.length < 4) return { status: "none", work: null, score: 0 };

  const medium = recallMediumForQuery(query);
  const scored: { work: CatalogWork; score: number }[] = [];
  for (const work of works) {
    if (!work.id || !work.title) continue;
    if (medium && mediumForWork(work) !== medium) continue;
    const names = [String(work.title), ...(work.catalogAliases ?? [])].filter(Boolean);
    const score = Math.max(...names.map((name) => similarity(phrase, name)));
    if (score > 0) scored.push({ work, score });
  }
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 0.84) return { status: "none", work: null, score: best?.score ?? 0 };
  const second = scored[1];
  if (second && second.score >= best.score - 0.05 && String(second.work.id) !== String(best.work.id)) {
    return { status: "ambiguous", work: null, score: best.score };
  }
  return { status: "exact", work: best.work, score: best.score };
}

export function buildRecallCatalogCandidates(works: CatalogWork[], query: string): RecallCatalogCandidate[] {
  const medium = recallMediumForQuery(query);
  const rows: RecallCatalogCandidate[] = [];
  const seenIds = new Set<string>();
  for (const work of works) {
    const workId = String(work.id ?? "").trim();
    const title = String(work.title ?? "").trim();
    if (!workId || !title || seenIds.has(workId)) continue;
    if (medium && mediumForWork(work) !== medium) continue;
    seenIds.add(workId);
    const tags = Array.from(new Set([
      ...(work.tags ?? []),
      ...(work.moodTags ?? []),
      work.distribution?.primaryGenre ?? "",
      work.distribution?.secondaryGenre ?? "",
    ].map((value) => String(value ?? "").trim()).filter(Boolean))).slice(0, 5);
    rows.push({
      workId,
      title,
      type: String(work.type ?? ""),
      releasedAt: String(work.releasedAt ?? work.distribution?.releaseDate ?? ""),
      tags,
    });
  }
  return rows.slice(0, 600);
}

export function buildRecallModelMessages(query: string, candidates: RecallCatalogCandidate[]) {
  const catalog = candidates.map((item) =>
    [item.workId, item.title, item.releasedAt, item.tags.join(",")].join("\t")
  ).join("\n");

  const system = [
    "You resolve a visitor's fuzzy memory of a work to ONE work in the supplied MUSIAM catalog.",
    "The visitor may remember a translation, transliteration, place name, partial title, typo, theme, or language instead of the exact title.",
    "Never invent a work. Never output a workId that is not in the supplied catalog.",
    "Use HIGH only when the clue maps clearly to one catalog work, including strong translation/transliteration matches.",
    "Use MEDIUM when one candidate is plausible but confirmation is appropriate.",
    "Use LOW or NONE when generic clues fit multiple works or evidence is weak.",
    "Do not infer musical instruments, lyrics, sound, intent, or biography from a title.",
    "Return JSON only, exactly: {\"workId\":string|null,\"confidence\":\"high\"|\"medium\"|\"low\"|\"none\"}.",
  ].join(" ");

  const user = [
    `VISITOR QUERY: ${query}`,
    "CATALOG ROWS: workId<TAB>title<TAB>releaseDate<TAB>publicTags",
    catalog,
  ].join("\n");

  return { system, user };
}

export function parseRecallModelDecision(text: string, candidates: RecallCatalogCandidate[]): RecallModelDecision {
  const allowed = new Set(candidates.map((item) => item.workId));
  const raw = String(text ?? "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { workId: null, confidence: "none" };
  try {
    const value = JSON.parse(match[0]) as { workId?: unknown; confidence?: unknown };
    const confidence = ["high", "medium", "low", "none"].includes(String(value.confidence))
      ? String(value.confidence) as RecallConfidence : "none";
    const workId = typeof value.workId === "string" && allowed.has(value.workId) ? value.workId : null;
    if (!workId || confidence === "none") return { workId: null, confidence: "none" };
    return { workId, confidence };
  } catch {
    return { workId: null, confidence: "none" };
  }
}

export function recallReplyText(
  language: "ja" | "en" | "fr" | "es" | "de" | "ar",
  title: string,
  confidence: RecallConfidence,
  canListen: boolean,
): string {
  const high: Record<typeof language, string> = {
    ja: `それは「${title}」ですね。${canListen ? "聴きますか？" : "開きますか？"}`,
    en: `That's “${title}”. ${canListen ? "Would you like to listen?" : "Would you like to open it?"}`,
    fr: `C’est « ${title} ».${canListen ? " Voulez-vous l’écouter ?" : " Voulez-vous l’ouvrir ?"}`,
    es: `Es «${title}».${canListen ? " ¿Quiere escucharlo?" : " ¿Quiere abrirlo?"}`,
    de: `Das ist „${title}“.${canListen ? " Möchten Sie es anhören?" : " Möchten Sie es öffnen?"}`,
    ar: `إنه «${title}».${canListen ? " هل تريد الاستماع إليه؟" : " هل تريد فتحه؟"}`,
  };
  const medium: Record<typeof language, string> = {
    ja: `「${title}」のことですか？${canListen ? " これならすぐ聴けます。" : ""}`,
    en: `Do you mean “${title}”?${canListen ? " I can give you the listening link." : ""}`,
    fr: `Vous pensez à « ${title} » ?${canListen ? " Je peux vous donner le lien d’écoute." : ""}`,
    es: `¿Se refiere a «${title}»?${canListen ? " Puedo darle el enlace de escucha." : ""}`,
    de: `Meinen Sie „${title}“?${canListen ? " Ich kann Ihnen den Hörlink geben." : ""}`,
    ar: `هل تقصد «${title}»؟${canListen ? " يمكنني إعطاؤك رابط الاستماع." : ""}`,
  };
  return confidence === "high" ? high[language] : medium[language];
}

export function recallClarificationText(language: "ja" | "en" | "fr" | "es" | "de" | "ar"): string {
  const text: Record<typeof language, string> = {
    ja: "かなり近いところまで探せます。覚えている手がかりをもう一つだけください。地名、言語、時期、タイトルの一部のどれでも大丈夫です。",
    en: "I can usually narrow it down. Give me one more clue—place, language, release period, or any fragment of the title.",
    fr: "Je peux généralement retrouver l’œuvre. Donnez-moi un indice de plus : lieu, langue, période de sortie ou fragment du titre.",
    es: "Normalmente puedo encontrarla. Déme una pista más: lugar, idioma, época de publicación o una parte del título.",
    de: "Ich kann das meist eingrenzen. Geben Sie mir noch einen Hinweis: Ort, Sprache, Veröffentlichungszeit oder einen Teil des Titels.",
    ar: "يمكنني عادة تضييق الاحتمالات. أعطني تلميحًا آخر: مكانًا أو لغة أو فترة الإصدار أو جزءًا من العنوان.",
  };
  return text[language];
}
