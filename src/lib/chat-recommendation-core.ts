import claimsMatrix from "../../ops/simulation-refinement/phase5-generalization-20260913/music/batch-r3/claims-matrix.json";
import { getPublicLinksForCard, type PublicLink } from "@/lib/work-links";
import type { CatalogWork } from "@/lib/mergeWorksCatalog";
import { intelligenceSearchText, scoreWorkIntelligenceQuery } from "@/lib/catalog-intelligence";

export type CoreMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  /** Stable ID of a card actually shown with this assistant message. */
  recommendedWorkId?: string | null;
};
export type CoreLanguage = "ja" | "en" | "fr" | "es" | "de" | "ar";
export type ActionMedium = "music" | "book" | "other";
export type ActionKind = "listen" | "read" | "view";
export type CatalogIdentityResolution =
  | { status: "exact"; work: CatalogWork; source: "id" | "alias" | "title" }
  | { status: "ambiguous" | "unknown" | "none"; work: null; source: null };

type R4Claim = {
  workId?: string;
  sourceScope?: string;
  allowedClaims?: string[];
  prohibitedClaims?: string[];
  ambiguity?: string | null;
};

export type SalesOptOut = {
  temporaryNoBuy: boolean;
  persistentSalesStop: boolean;
  persistentRecommendationStop: boolean;
  /** Backward-compatible union of the two persistent stop states. */
  persistentStop: boolean;
  currentStopRequest: boolean;
  currentReopenRequest: boolean;
  suppressSales: boolean;
  suppressRecommendations: boolean;
};

export type ChatCoreTurn = {
  language: CoreLanguage;
  currentRequest: string;
  sales: SalesOptOut;
  actionKind: ActionKind | null;
  actionTargetId: string | null;
  actionLinks: PublicLink[];
  /** link_available means a recorded URL exists, not that an action ran. */
  actionStatus: "not_requested" | "link_available" | "unavailable" | "ambiguous" | "suppressed";
};

export type Recommendation = {
  work: CatalogWork;
  reasons: string[];
  reason: string;
  links: PublicLink[];
  evidence: Pick<R4Claim, "workId" | "sourceScope" | "allowedClaims" | "prohibitedClaims" | "ambiguity"> | null;
};

const TEMPORARY_NO_BUY = [
  /(?:今日は|今(?:日|回|は)).{0,12}(?:買わない|購入しない|買うつもりはない)|(?:今日は|今は).{0,12}(?:見るだけ|考えたい)/i,
  /(?:just|only) browsing|not buying (?:anything )?(?:today|now)|not looking to buy|(?:don['’]?t|do not) want to buy (?:today|now)|(?:only|just) looking|(?:think|decide) about (?:it|buying) (?:first|later)/i,
  /(?:je )?(?:n['’]achète pas|ne vais pas acheter|ne veux pas acheter) (?:aujourd'hui|maintenant)|pas d['’]achat pour le moment|(?:je )?(?:regarde|parcours) (?:seulement|juste)|je (?:veux|vais) réfléchir/i,
  /no (?:voy a comprar|compro|quiero comprar) (?:hoy|ahora|por ahora)|solo (?:estoy mirando|miro)|quiero pensarlo/i,
  /(?:ich )?(?:kaufe|möchte) (?:heute|jetzt) (?:nicht|nichts)|ich (?:schaue|sehe) (?:nur|erst)|ich möchte (?:erst )?überlegen/i,
  /(?:لن أشتري|لا أريد الشراء|لا أشتري) (?:اليوم|الآن)|(?:أتصفح|أنظر) فقط|أريد (?:أن أفكر|التفكير)/i,
];
const SALES_STOP = [
  /(?:もう|これ以上)?(?:営業|売り込).{0,16}(?:しないで|するな|やめて|まないで)|(?:もう|これ以上).{0,12}(?:売らないで|営業しないで)/i,
  /(?:don['’]?t|do not|stop)\b.{0,28}\b(?:sell|selling|pitch(?:ing)?)|no more (?:sales|pitches)|\bno sales\b/i,
  /(?:ne .{0,25}|n['’].{0,25})vend.{0,20}(?:plus|pas|rien)|(?:arrêtez|arrête|cessez|cesse) de (?:me )?vend|plus de vente/i,
  /no (?:me )?vend.{0,20}(?:más|nunca|nada)|(?:deja|deje) de vender|no más ventas/i,
  /(?:verkauf|verkaufen) .{0,16}(?:nichts|nicht|mehr)|(?:nicht|nichts) (?:mehr )?verkauf|keine verkäufe mehr/i,
  /(?:لا|لن) تبيع.{0,24}|(?:توقف|امتنع) عن البيع/i,
];
const RECOMMENDATION_STOP = [
  /(?:商品|作品|カード|リンク|おすすめ|推薦).{0,18}(?:勧めないで|おすすめしないで|出さないで|やめて|いらない)|(?:もう|今後).{0,12}(?:勧めないで|おすすめしないで)|(?:勧める|おすすめする)のをやめて/i,
  /(?:don['’]?t|do not|stop)\b.{0,28}\b(?:recommend(?:ing)?|suggest(?:ing)?)|no more recommendations|(?:please )?stop (?:the )?recommendations/i,
  /(?:ne .{0,25}|n['’].{0,25})(?:recommand|propos).{0,20}(?:plus|pas)|(?:arrêtez|arrête|cessez|cesse) de (?:me )?(?:recommand|propos)|plus de recommandations/i,
  /no (?:me )?(?:recomiend|ofrezc).{0,20}(?:más|nunca)|(?:deja|deje) de recomendar|no (?:quiero|más) recomendaciones/i,
  /(?:empfiehl|empfehlen|empfehl) .{0,24}(?:nicht|keine|mehr)|keine empfehlungen mehr/i,
  /(?:لا|لن) (?:توص|ترشح|تقترح).{0,24}|(?:توقف|امتنع) عن (?:التوصية|الاقتراح)|لا أريد (?:توصيات|اقتراحات)/i,
];
const PURCHASE_REOPEN = [
  /(?:やっぱり|改めて|また).{0,12}(?:買いたい|購入したい)/i,
  /(?:I )?(?:want|would like) to (?:buy|purchase)|(?:buy|purchase).{0,16}(?:now|again)/i,
  /(?:je veux|j['’]aimerais) acheter/i,
  /(?:quiero|me gustaría) comprar/i,
  /(?:ich möchte|ich will) kaufen/i,
  /(?:أريد|أود) (?:الشراء|أن أشتري)/i,
];
const RECOMMENDATION_REOPEN = [
  /(?:やっぱり|改めて|また).{0,12}(?:勧めて|おすすめして|紹介して)/i,
  /(?:recommend|suggest) (?:something|works?|products?) (?:again|now)|(?:I )?(?:want|would like) recommendations again/i,
  /(?:je veux|j['’]aimerais) des recommandations|(?:recommandez|proposez)-?moi (?:de nouveau|à nouveau)/i,
  /(?:recomiéndame|recomiendame|recomiende) (?:otra vez|de nuevo)|quiero recomendaciones/i,
  /(?:ich möchte|ich will) (?:wieder )?empfehlungen|empfiehl mir (?:wieder|erneut)/i,
  /(?:أريد|أود) توصيات|(?:اقترح|رشح|أوص) لي (?:مرة أخرى|الآن)/i,
];
const LISTEN_REQUEST = /(?:聴(?:く|きたい|いて)|聞(?:く|きたい|いて)|\b(?:listen|hear|play|preview)\b|écouter|escuchar|hören|anhören|استمع|الاستماع|أسمع|سماع)/i;
const READ_REQUEST = /(?:読(?:む|みたい|んで)|\bread\b|lire|leer|lesen|أقرأ|قراءة)/i;
const VIEW_REQUEST = /(?:見(?:る|たい|せて)|開(?:く|きたい|いて)|\b(?:view|open|see|show|voir|ouvrir|ver|abrir|ansehen|öffnen)\b|عرض|افتح|أرى)/i;
const REFERENCE_WORD = /(?:これ|それ|あれ|この|その|前(?:の|に)|さっきの|\b(?:this|that|previous|it|ce|cette|cela|celui|ésta|esta|esto|ese|diese|dieses)\b|هذا|هذه|ذلك)/i;
const QUOTED_NAME = /[「『"“«„]([^」』"”»“]{1,120})[」』"”»“]/gu;
const DISTRESS_REQUEST = [
  /(?:死にたい|自殺|自傷|消えたい|生きていたくない|自分を傷つけたい|もう生きられない|限界|つらすぎ|辛すぎ|涙が止ま)/i,
  /(?:\bsuicid(?:e|al)\b|\b(?:kill|hurt|harm) myself\b|\bi want to die\b|\bi don't want to live\b|\bself[ -]?harm\b)/i,
  /(?:suicide|suicider|je veux mourir|je ne veux plus vivre|me faire du mal)/i,
  /(?:suicidio|suicidarme|quiero morir|no quiero vivir|hacerme daño)/i,
  /(?:suizid|selbstmord|ich will sterben|ich möchte sterben|mich selbst verletzen)/i,
  /(?:انتحار|أريد أن أموت|لا أريد أن أعيش|أؤذي نفسي|قتل نفسي)/i,
];
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

/** Current text only; the caller decides whether historical turns are relevant. */
export function isDistressRequest(text: string): boolean {
  return matchesAny(DISTRESS_REQUEST, normalize(text));
}

function lastUser(messages: CoreMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") return messages[index].content.trim();
  }
  return "";
}

function requestedAction(query: string): ActionKind | null {
  if (LISTEN_REQUEST.test(query)) return "listen";
  if (READ_REQUEST.test(query)) return "read";
  if (VIEW_REQUEST.test(query)) return "view";
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

function matchesAny(patterns: RegExp[], query: string): boolean {
  return patterns.some((pattern) => pattern.test(query));
}

function salesOptOut(messages: CoreMessage[], currentRequest: string): SalesOptOut {
  let persistentSalesStop = false;
  let persistentRecommendationStop = false;
  let currentStopRequest = false;
  let currentReopenRequest = false;
  let currentUserIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") { currentUserIndex = index; break; }
  }
  for (const [index, message] of messages.entries()) {
    if (message.role !== "user") continue;
    const content = normalize(message.content);
    const salesStop = matchesAny(SALES_STOP, content);
    const recommendationStop = matchesAny(RECOMMENDATION_STOP, content);
    const purchaseReopen = matchesAny(PURCHASE_REOPEN, content);
    const recommendationReopen = matchesAny(RECOMMENDATION_REOPEN, content);
    // Within one message, explicit stop has priority over a conflicting reopen.
    if (salesStop) persistentSalesStop = true;
    else if (purchaseReopen) persistentSalesStop = false;
    if (recommendationStop) persistentRecommendationStop = true;
    else if (purchaseReopen || recommendationReopen) persistentRecommendationStop = false;
    if (index === currentUserIndex) {
      currentStopRequest = salesStop || recommendationStop;
      currentReopenRequest = !currentStopRequest && (purchaseReopen || recommendationReopen);
    }
  }
  const temporaryNoBuy = matchesAny(TEMPORARY_NO_BUY, normalize(currentRequest));
  return {
    temporaryNoBuy,
    persistentSalesStop,
    persistentRecommendationStop,
    persistentStop: persistentSalesStop || persistentRecommendationStop,
    currentStopRequest,
    currentReopenRequest,
    suppressSales: temporaryNoBuy || persistentSalesStop || persistentRecommendationStop,
    suppressRecommendations: persistentRecommendationStop,
  };
}

function previousRecommendedWorkId(messages: CoreMessage[]): string | null {
  let currentUserIndex = messages.length;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") { currentUserIndex = index; break; }
  }
  for (let index = currentUserIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "assistant") return message.recommendedWorkId ? String(message.recommendedWorkId) : null;
  }
  return null;
}

function uniqueMatch(works: CatalogWork[], source: "id" | "alias" | "title"): CatalogIdentityResolution {
  const unique = Array.from(new Map(works.map((work) => [String(work.id ?? ""), work])).values());
  if (unique.length === 1 && unique[0].id != null && String(unique[0].id)) {
    return { status: "exact", work: unique[0], source };
  }
  return { status: "ambiguous", work: null, source: null };
}

function delimitedName(query: string, name: string): boolean {
  if (!name) return false;
  for (let start = query.indexOf(name); start >= 0; start = query.indexOf(name, start + 1)) {
    const before = query[start - 1] ?? "";
    const after = query[start + name.length] ?? "";
    // A short title such as ME must never match inside "recommend". For Japanese
    // title+particle requests, the exact particle is accepted as a delimiter.
    const leftOK = !before || !/[\p{L}\p{N}]/u.test(before);
    const rightOK = !after || !/[\p{L}\p{N}]/u.test(after)
      || /^(?:を|が|は|に|の|で|と)(?:聴|聞|読|見|開|ください)/u.test(query.slice(start + name.length));
    if (leftOK && rightOK) return true;
  }
  return false;
}

function naturalEmbeddedCatalogName(query: string, name: string): boolean {
  const normalizedQuery = normalize(query).trim();
  const value = normalize(name).trim();
  if (!value || normalizedQuery === value) return false;

  // Keep very short/common titles such as "ME" quote-only when embedded in prose.
  const alphaNumericLength = Array.from(value).filter((char) => /[\p{L}\p{N}]/u.test(char)).length;
  if (alphaNumericLength < 4 && !/\s/u.test(value)) return false;

  for (let start = normalizedQuery.indexOf(value); start >= 0; start = normalizedQuery.indexOf(value, start + 1)) {
    const beforeChar = normalizedQuery[start - 1] ?? "";
    if (beforeChar && /[\p{L}\p{N}]/u.test(beforeChar)) continue;

    const before = normalizedQuery.slice(0, start).trim();
    const after = normalizedQuery.slice(start + value.length).trim();

    // Natural Japanese work references attach particles directly to Latin/Japanese titles.
    if (/^(?:って|について|とは|は(?:どんな|何|どう)|を(?:聴|聞|見|開)|のこと|っていう|って何|ってどんな)/u.test(after)) return true;

    // Explicit work-reference wording is safe enough when the catalog match is unique.
    const wrapper = `${before} ${after}`.trim();
    if (/(?:について|教えて|どんな(?:曲|作品)|何(?:の曲|の作品)|聴きたい|聞きたい|見たい|開いて)/u.test(wrapper)) return true;
    if (/(?:tell me about|what(?:'s| is)|listen to|play|hear|open|show|about)/i.test(wrapper)) return true;
  }
  return false;
}

function exactIdentity(name: string, works: CatalogWork[]): CatalogIdentityResolution {
  const value = normalize(name).trim();
  if (!value) return { status: "none", work: null, source: null };
  const byId = works.filter((work) => work.id != null && normalize(work.id) === value);
  if (byId.length) return uniqueMatch(byId, "id");
  const byAlias = works.filter((work) => (work.catalogAliases ?? []).some((alias) => normalize(alias) === value));
  const byTitle = works.filter((work) => work.title && normalize(work.title) === value);
  if (byAlias.length || byTitle.length) return uniqueMatch([...byAlias, ...byTitle], byAlias.length ? "alias" : "title");
  return { status: "unknown", work: null, source: null };
}

/** Resolves explicit catalog identity without title substrings or assistant prose. */
export function resolveCatalogIdentity(query: string, works: CatalogWork[]): CatalogIdentityResolution {
  const quoted = Array.from(query.matchAll(QUOTED_NAME), (match) => match[1].trim()).filter(Boolean);
  if (quoted.length) {
    if (new Set(quoted.map(normalize)).size !== 1) return { status: "ambiguous", work: null, source: null };
    return exactIdentity(quoted[0], works);
  }
  const normalized = normalize(query).trim();
  const bySource: { source: "id" | "alias" | "title"; matches: CatalogWork[] }[] = [];
  for (const source of ["id", "alias", "title"] as const) {
    const matches = works.filter((work) => {
      const names = source === "id" ? [String(work.id ?? "")]
        : source === "alias" ? work.catalogAliases ?? [] : [work.title ?? ""];
      return names.some((name) => {
        const value = normalize(name).trim();
        // Embedded title/alias matches require explicit reference wording;
        // short/common titles remain quote-only to avoid substring false positives.
        return value && (
          normalized === value
          || (source === "id" && delimitedName(normalized, value))
          || (source !== "id" && naturalEmbeddedCatalogName(normalized, value))
        );
      });
    });
    bySource.push({ source, matches });
  }
  if (bySource[0].matches.length) return uniqueMatch(bySource[0].matches, "id");
  const byAlias = bySource[1].matches;
  const byTitle = bySource[2].matches;
  if (byAlias.length || byTitle.length) return uniqueMatch([...byAlias, ...byTitle], byAlias.length ? "alias" : "title");
  return { status: "none", work: null, source: null };
}

function currentPhrase(query: string): string {
  return query.replace(/\s+/g, " ").trim().slice(0, 72);
}

function catalogHaystack(work: CatalogWork) {
  return normalize([
    work.title,
    work.distribution?.primaryGenre,
    work.distribution?.secondaryGenre,
    ...(work.tags ?? []),
    ...(work.moodTags ?? []),
    ...(work.moodSeeds ?? []),
    intelligenceSearchText(work),
  ].join(" "));
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
    let score = 0;
    const reasons: string[] = [];
    for (const signal of INTENT_SIGNALS) {
      if (!signal.query.test(normalizedQuery)) continue;
      const matches = signal.terms.filter((term) => haystack.includes(normalize(term))).length;
      if (!matches) continue;
      score += Math.min(matches, 4) * 5;
      reasons.push(signal.reason);
    }
    const intelligence = scoreWorkIntelligenceQuery(work, query);
    score += intelligence.score;
    reasons.push(...intelligence.reasons);
    for (const genre of [work.distribution?.primaryGenre, work.distribution?.secondaryGenre].filter((value): value is string => typeof value === "string" && !!value.trim())) {
      if (normalizedQuery.includes(normalize(genre))) {
        score += 8;
        reasons.push(`genre:${genre.trim()}`);
      }
    }
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
  const actionKind = requestedAction(currentRequest);
  const identity = actionKind ? resolveCatalogIdentity(currentRequest, input.works) : null;
  const priorId = actionKind && identity?.status === "none" && REFERENCE_WORD.test(currentRequest)
    ? previousRecommendedWorkId(input.messages)
    : null;
  const prior = priorId ? input.works.find((work) => String(work.id ?? "") === priorId) ?? null : null;
  const target = identity?.status === "exact" ? identity.work : prior;
  const targetMedium = target ? workMedium(target) : null;
  const compatible = actionKind === "view"
    || (actionKind === "listen" && targetMedium === "music")
    || (actionKind === "read" && targetMedium === "book");
  const recordedLinks = target && compatible ? getPublicLinksForCard(target) : [];
  const actionLinks = actionKind === "listen"
    ? recordedLinks.filter((link) => ["spotify", "appleMusic", "amazonMusic", "listen"].includes(link.kind))
    : actionKind === "read" ? recordedLinks.filter((link) => link.kind === "read") : recordedLinks;
  const actionStatus: ChatCoreTurn["actionStatus"] = !actionKind ? "not_requested"
    : sales.suppressRecommendations ? "suppressed"
      : identity?.status === "ambiguous" ? "ambiguous"
        : target && actionLinks.length ? "link_available" : "unavailable";
  return {
    language: languageFor(input.language, currentRequest),
    currentRequest,
    sales,
    actionKind,
    actionTargetId: target && identity?.status !== "ambiguous" && identity?.status !== "unknown"
      ? String(target.id ?? "") || null : null,
    actionLinks: actionStatus === "link_available" ? actionLinks : [],
    actionStatus,
  };
}

function naturalFacetReasonJa(reasons: string[]): string | null {
  const facet = reasons.find((reason) => /^(?:言語|国|地域|場所|文化|テーマ|ビジュアル|時期|検索別名):/.test(reason));
  if (!facet) return null;
  const [kind, label = "", scope = ""] = facet.split(":");
  if (!label.trim()) return null;
  if (kind === "言語") {
    if (scope === "included") return `あります。${label}を含む多言語曲なら、まずこれ。`;
    if (scope === "mixed") return `あります。${label}を含むミックス言語の曲なら、まずこれ。`;
    if (scope === "instrumental") return `あります。${label}なら、まずこの一曲。`;
    return `あります。${label}なら、まずこの一曲。`;
  }
  if (["国", "地域", "場所"].includes(kind)) return `あります。${label}で拾うなら、まずこの一曲。`;
  return `あります。${label}を手がかりに、まずこれ。`;
}

export function selectOneRecommendation(input: {
  works: CatalogWork[];
  query: string;
  language: CoreLanguage;
  sales: SalesOptOut;
  preferWorkId?: string | null;
  excludedWorkIds?: string[];
}): Recommendation | null {
  if (input.sales.suppressRecommendations) return null;
  const availableWorks = input.works.filter((work) => !input.excludedWorkIds?.includes(String(work.id ?? "")));
  const identity = resolveCatalogIdentity(input.query, availableWorks);
  // An explicit current name always wins over a previous ID. Ambiguous or
  // unknown quoted names require clarification, never a substitute card.
  if (identity.status === "ambiguous" || identity.status === "unknown") return null;
  const exact = identity.status === "exact" ? identity.work
    : input.preferWorkId ? availableWorks.find((work) => String(work.id) === input.preferWorkId) ?? null : null;
  if (input.preferWorkId && !exact) return null;
  const candidate = exact
    ? { work: exact, score: 1, reasons: ["現在の指定"] }
    : rankCatalogWorks(availableWorks, input.query).find((item) => item.score > 0) ?? null;
  if (!candidate) return null;
  const links = getPublicLinksForCard(candidate.work);
  if (!links.length) return null;
  const phrase = currentPhrase(input.query);
  const facetReason = input.language === "ja" ? naturalFacetReasonJa(candidate.reasons) : null;
  const baseReason = input.language === "ja"
    ? phrase ? `今の「${phrase}」なら、まずこれ。` : "今の条件なら、まずこれ。"
    : "I selected it from the catalog metadata that matches the request.";
  const reason = facetReason ?? baseReason;
  return {
    work: candidate.work,
    reasons: candidate.reasons,
    reason,
    links,
    // This is lookup-only: R4 never contributes a semantic score or response claim.
    evidence: lookupR4EvidenceByWorkId(String(candidate.work.id ?? "")),
  };
}

export function salesSuppressionText(language: CoreLanguage, scope: "sales" | "recommendations" = "recommendations"): string {
  if (scope === "sales") {
    const salesTexts: Record<CoreLanguage, string> = {
      ja: "承知しました。こちらから購入や販売の案内はしません。作品については、ご希望があればお話しできます。",
      en: "Understood. I will stop sales and purchase prompts. We can still discuss works if you ask.",
      fr: "Entendu. Je ne vous proposerai plus d'achat. Nous pouvons encore parler des œuvres si vous le souhaitez.",
      es: "Entendido. Dejaré de ofrecer compras. Podemos seguir hablando de obras si usted lo pide.",
      de: "Verstanden. Ich werde keine Kaufangebote mehr machen. Über Werke können wir sprechen, wenn Sie möchten.",
      ar: "مفهوم. سأتوقف عن عرض الشراء. يمكننا مواصلة الحديث عن الأعمال إذا طلبت ذلك.",
    };
    return salesTexts[language];
  }
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
  const ambiguous: Record<CoreLanguage, string> = {
    ja: "作品名が複数の catalog 作品に一致します。作品 ID か、別の識別できる名前を指定してください。",
    en: "That name matches multiple catalog works. Please specify a work ID or another unambiguous name.",
    fr: "Ce nom correspond à plusieurs œuvres du catalogue. Précisez l'identifiant de l'œuvre ou un autre nom sans ambiguïté.",
    es: "Ese nombre corresponde a varias obras del catálogo. Indique el ID de la obra u otro nombre inequívoco.",
    de: "Dieser Name passt zu mehreren Werken im Katalog. Bitte nennen Sie die Werk-ID oder einen eindeutigen Namen.",
    ar: "هذا الاسم يطابق أكثر من عمل في الفهرس. يرجى تحديد معرّف العمل أو اسم واضح.",
  };
  const unavailable: Record<CoreLanguage, string> = {
    ja: "その操作に結びつく、確認済みの公開リンクをこの会話から特定できません。別の作品名を指定していただければ、catalog にあるものだけを確かめます。",
    en: "I cannot identify a verified public action link for that request from this conversation.",
    fr: "Je ne peux pas identifier de lien public vérifié pour cette action dans cette conversation.",
    es: "No puedo identificar en esta conversación un enlace público verificado para esa acción.",
    de: "Ich kann in diesem Gespräch keinen bestätigten öffentlichen Link für diese Aktion ermitteln.",
    ar: "لا أستطيع تحديد رابط عام موثّق لهذا الإجراء من هذه المحادثة.",
  };
  const noRecommendation: Record<CoreLanguage, string> = {
    ja: "今のcatalogでは、その条件を確実に言える作品をまだ拾えてません。適当に一曲で埋めるのはダサいので、ここは保留です。",
    en: "I cannot select a catalog-grounded work for that request without inventing one.",
    fr: "Je ne peux pas choisir une œuvre confirmée par le catalogue pour cette demande.",
    es: "No puedo seleccionar para esa solicitud una obra confirmada por el catálogo.",
    de: "Ich kann für diese Anfrage kein durch den Katalog belegtes Werk auswählen.",
    ar: "لا أستطيع اختيار عمل تؤكده بيانات الفهرس لهذا الطلب.",
  };
  return actionStatus === "ambiguous" ? ambiguous[language]
    : actionStatus === "unavailable" ? unavailable[language] : noRecommendation[language];
}
