import claimsMatrix from "../../ops/simulation-refinement/phase5-generalization-20260913/music/batch-r3/claims-matrix.json";
import { getPublicLinksForCard, type PublicLink } from "@/lib/work-links";
import type { CatalogWork } from "@/lib/mergeWorksCatalog";

export type CoreMessage = { role: "system" | "user" | "assistant"; content: string };
export type CoreLanguage = "ja" | "en" | "fr" | "es" | "de" | "ar";
export type ActionMedium = "music" | "book" | "other";

type R4Claim = {
  workId?: string;
  sourceScope?: string;
  allowedClaims?: string[];
  prohibitedClaims?: string[];
  ambiguity?: string | null;
};

export type SalesOptOut = {
  temporaryNoBuy: boolean;
  persistentStop: boolean;
  suppressSales: boolean;
  suppressRecommendations: boolean;
};

export type ChatCoreTurn = {
  language: CoreLanguage;
  currentRequest: string;
  sales: SalesOptOut;
  actionTargetId: string | null;
  actionLinks: PublicLink[];
  actionStatus: "not_requested" | "available" | "unavailable" | "suppressed";
};

export type Recommendation = {
  work: CatalogWork;
  reasons: string[];
  reason: string;
  links: PublicLink[];
  evidence: Pick<R4Claim, "workId" | "sourceScope" | "allowedClaims" | "prohibitedClaims" | "ambiguity"> | null;
};

const TEMPORARY_NO_BUY = /(今日は|今(?:日|回|は))?.{0,12}(?:買わない|購入しない)|(?:今日は|今は).{0,12}(?:見るだけ|考えたい)|(?:just|only) browsing|not buying (?:today|now)|not looking to buy/i;
const PERSISTENT_STOP = /(?:もう|これ以上)?(?:営業|売り込).{0,16}(?:しないで|するな|やめて)|(?:商品|作品|カード|リンク).{0,18}(?:勧めないで|おすすめしないで|出さないで)|(?:don['’]?t|do not|stop)\b.{0,28}\b(?:sell|selling|recommend(?:ing)?|pitch(?:ing)?)/i;
const PURCHASE_REOPEN = /(?:やっぱり|改めて).{0,12}(?:買いたい|購入したい)|(?:I )?(?:want|would like) to (?:buy|purchase)|(?:buy|purchase).{0,16}(?:now|again)/i;
const LISTEN_REQUEST = /(?:聴(?:く|きたい|いて)|聞(?:く|きたい|いて)|listen|hear|play|preview)/i;
const READ_REQUEST = /(?:読(?:む|みたい|んで)|read)/i;
const REFERENCE_WORD = /(?:これ|それ|あれ|この|その|前(?:の|に)|さっきの|this|that|previous)/i;
const NAMED_OUTSIDE = /[「『"“][^」』"”]{2,120}[」』"”]/;
// Only catalog/editorial-style metadata participates here. SSD production notes
// and all R4 machine observations are deliberately excluded.
const INTENT_SIGNALS = [
  { query: /(眠|寝る前|睡眠|おやすみ|夜|静か|sleep|bedtime)/i, terms: ["睡眠", "眠り", "静か", "穏やか", "夜", "calm"], reason: "眠る前の静けさ" },
  { query: /(疲れ|落ち着|癒|休み|ゆっくり|穏やか|relax|calm|tired)/i, terms: ["癒し", "穏やか", "静か", "休息", "内省", "calm"], reason: "心をほどく時間" },
  { query: /(集中|作業|勉強|仕事|邪魔しない|focus|study|work)/i, terms: ["集中", "ミニマル", "反復", "アンビエント", "minimal", "ambient"], reason: "集中を保つ流れ" },
  { query: /(旅|移動|列車|飛行機|海|山|travel|journey|trip|road)/i, terms: ["旅", "道", "風景", "海", "山", "列車", "travel", "journey"], reason: "旅の景色を運ぶ広がり" },
  { query: /(懐かし|故郷|昔|思い出|帰りたい|nostal|home|memory)/i, terms: ["郷愁", "故郷", "懐かし", "記憶", "旅", "nostalgia", "home"], reason: "記憶に触れる余韻" },
  { query: /(退屈|暇|刺激|景色.*変|何か面白|bored|boring|stimulat)/i, terms: ["実験", "意外", "奇妙", "前衛", "変化", "刺激", "experimental", "avant"], reason: "いつもの景色をずらす意外性" },
] as const;

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase();
}

function lastUser(messages: CoreMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") return messages[index].content.trim();
  }
  return "";
}

function requestedMedium(query: string): ActionMedium | null {
  if (LISTEN_REQUEST.test(query)) return "music";
  if (READ_REQUEST.test(query)) return "book";
  return null;
}

function workMedium(work: CatalogWork): ActionMedium {
  const type = normalize(work.type);
  if (/(music|album|track|song|audio)/.test(type)) return "music";
  if (/(book|novel|read|pdf)/.test(type)) return "book";
  return "other";
}

function languageFor(defaultLanguage: CoreLanguage, query: string): CoreLanguage {
  // The current explicit language instruction wins over UI/default locale.
  return /(?:日本語で|日本語(?:だけ|のみ)で|in japanese)/i.test(query) ? "ja" : defaultLanguage;
}

function salesOptOut(messages: CoreMessage[], currentRequest: string): SalesOptOut {
  let persistentStop = false;
  for (const message of messages) {
    if (message.role !== "user") continue;
    if (PERSISTENT_STOP.test(message.content)) persistentStop = true;
    if (persistentStop && PURCHASE_REOPEN.test(message.content)) persistentStop = false;
  }
  const temporaryNoBuy = TEMPORARY_NO_BUY.test(currentRequest);
  return {
    temporaryNoBuy,
    persistentStop,
    suppressSales: temporaryNoBuy || persistentStop,
    suppressRecommendations: persistentStop,
  };
}

function referencedWork(messages: CoreMessage[], works: CatalogWork[], medium: ActionMedium | null): CatalogWork | null {
  if (!medium) return null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;
    const text = normalize(message.content);
    const match = works.find((work) =>
      workMedium(work) === medium && Boolean(work.title) && text.includes(normalize(work.title))
    );
    if (match) return match;
  }
  return null;
}

function namedCatalogWork(query: string, works: CatalogWork[]): CatalogWork | null {
  const normalized = normalize(query);
  return works.find((work) => {
    const id = normalize(work.id);
    const title = normalize(work.title);
    return Boolean(id || title) && (normalized.includes(id) || normalized.includes(title));
  }) ?? null;
}

function currentPhrase(query: string): string {
  return query.replace(/\s+/g, " ").trim().slice(0, 72);
}

function catalogHaystack(work: CatalogWork) {
  return normalize([work.title, ...(work.tags ?? []), ...(work.moodTags ?? []), ...(work.moodSeeds ?? [])].join(" "));
}

function stableTieBreak(query: string, work: CatalogWork) {
  const value = `${normalize(query)}|${normalize(work.id ?? work.title)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rankCatalogWorks(works: CatalogWork[], query: string) {
  const normalizedQuery = normalize(query);
  return works.map((work) => {
    const haystack = catalogHaystack(work);
    const title = normalize(work.title);
    let score = 0;
    const reasons: string[] = [];
    for (const signal of INTENT_SIGNALS) {
      if (!signal.query.test(normalizedQuery)) continue;
      const matches = signal.terms.filter((term) => haystack.includes(normalize(term))).length;
      if (!matches) continue;
      score += Math.min(matches, 4) * 5;
      reasons.push(signal.reason);
    }
    if (title && normalizedQuery.includes(title)) score += 20;
    if (String(work.id ?? "") && normalizedQuery.includes(normalize(work.id))) score += 20;
    return { work, score, reasons: Array.from(new Set(reasons)), tie: stableTieBreak(query, work) };
  }).sort((left, right) => right.score - left.score || left.tie - right.tie);
}

export function lookupR4EvidenceByWorkId(workId: string): R4Claim | null {
  const entry = (claimsMatrix as { records?: R4Claim[] }).records?.find((row) => row.workId === workId)
    ?? (claimsMatrix as unknown as R4Claim[]).find?.((row) => row.workId === workId);
  return entry ? {
    workId: entry.workId,
    sourceScope: entry.sourceScope,
    allowedClaims: entry.allowedClaims,
    prohibitedClaims: entry.prohibitedClaims,
    ambiguity: entry.ambiguity ?? null,
  } : null;
}

export function deriveChatCoreTurn(input: { messages: CoreMessage[]; language: CoreLanguage; works: CatalogWork[] }): ChatCoreTurn {
  const currentRequest = lastUser(input.messages);
  const sales = salesOptOut(input.messages, currentRequest);
  const medium = requestedMedium(currentRequest);
  const asksForPriorAction = Boolean(medium && REFERENCE_WORD.test(currentRequest));
  const prior = asksForPriorAction ? referencedWork(input.messages, input.works, medium) : null;
  const actionLinks = prior ? getPublicLinksForCard(prior) : [];
  const actionStatus = !medium ? "not_requested"
    : sales.suppressRecommendations ? "suppressed"
      : prior && actionLinks.length ? "available"
        : "unavailable";
  return {
    language: languageFor(input.language, currentRequest),
    currentRequest,
    sales,
    actionTargetId: actionStatus === "available" ? String(prior?.id ?? "") || null : null,
    actionLinks: actionStatus === "available" ? actionLinks : [],
    actionStatus,
  };
}

export function selectOneRecommendation(input: {
  works: CatalogWork[];
  query: string;
  language: CoreLanguage;
  sales: SalesOptOut;
  preferWorkId?: string | null;
}): Recommendation | null {
  if (input.sales.suppressRecommendations) return null;
  const exact = input.preferWorkId
    ? input.works.find((work) => String(work.id) === input.preferWorkId) ?? null
    : namedCatalogWork(input.query, input.works);
  // A quoted unknown title is not a license to replace it with an unrelated item.
  if (!exact && NAMED_OUTSIDE.test(input.query)) return null;
  const candidate = exact
    ? { work: exact, score: 1, reasons: ["現在の指定"] }
    : rankCatalogWorks(input.works, input.query).find((item) => item.score > 0) ?? null;
  if (!candidate) return null;
  const links = getPublicLinksForCard(candidate.work);
  if (!links.length) return null;
  const phrase = currentPhrase(input.query);
  const selectedReasons = candidate.reasons.length ? candidate.reasons.join("と") : "現在の指定";
  const baseReason = input.language === "ja"
    ? `選んだ根拠は、catalog metadata にある${selectedReasons}です。`
    : "I selected it from the catalog metadata that matches the request.";
  const reason = input.language === "ja" && phrase
    ? `今の「${phrase}」というご希望を手がかりにしました。${baseReason}`
    : baseReason;
  return {
    work: candidate.work,
    reasons: candidate.reasons,
    reason,
    links,
    // This is lookup-only: R4 never contributes a semantic score or response claim.
    evidence: lookupR4EvidenceByWorkId(String(candidate.work.id ?? "")),
  };
}

export function salesSuppressionText(language: CoreLanguage): string {
  const texts: Record<CoreLanguage, string> = {
    ja: "承知しました。こちらから商品や作品を勧めることは控えます。今は、話したいことだけをそのまま聞かせてください。",
    en: "Understood. I will not introduce products or works unless you explicitly reopen that subject. We can stay with what you want to discuss.",
    fr: "Entendu. Je ne proposerai ni produit ni œuvre sans que vous rouvriez explicitement ce sujet.",
    es: "Entendido. No recomendaré productos ni obras a menos que usted vuelva a abrir expresamente ese tema.",
    de: "Verstanden. Ich werde weder Produkte noch Werke empfehlen, sofern Sie das Thema nicht ausdrücklich wieder eröffnen.",
    ar: "مفهوم. لن أقترح منتجات أو أعمالاً ما لم تعاود أنت فتح هذا الموضوع صراحةً.",
  };
  return texts[language];
}

export function unavailableRecommendationText(language: CoreLanguage, actionStatus?: ChatCoreTurn["actionStatus"]): string {
  if (language === "ja") {
    if (actionStatus === "unavailable") return "その操作に結びつく、確認済みの公開リンクをこの会話から特定できません。別の作品名を指定していただければ、catalog にあるものだけを確かめます。";
    return "その条件に合う作品を、catalog の記録だけから確かに選べませんでした。架空の作品やリンクで埋めることはいたしません。";
  }
  return actionStatus === "unavailable"
    ? "I cannot identify a verified public action link for that request from this conversation."
    : "I cannot select a catalog-grounded work for that request without inventing one.";
}
