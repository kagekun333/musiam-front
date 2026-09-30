import { getPublicLinksForCard } from "@/lib/work-links";
import type { CatalogWork } from "@/lib/mergeWorksCatalog";
import { editorialSourceClass, getEditorialKnowledgeForWorkId, type EditorialSourceClass, type OwnerIntentStatus } from "@/lib/editorial-knowledge";
import { tokyoYmd } from "@/lib/release-status";

export type WorkMedium = "music" | "book" | "other";
export const INGESTION_PIPELINE_STATUS = "READY" as const;
export const DISTROKID_FEED_STATUS = "NOT_CONNECTED" as const;
export type KnowledgeAction = { kind: "listen" | "read" | "view" | "store"; url: string; scope: "recorded-public-url" };
export type KnowledgeEnvelope = {
  workId: string;
  title: string | null;
  medium: WorkMedium;
  releaseDate: string | null;
  distribution: {
    source: string | null;
    artist: string | null;
    releaseDateAuthority: "DISTROKID_EXPLICIT" | "APPLE_PUBLIC_DISTRIBUTION" | "OWNER_VERIFIED" | "MUSIAM_CATALOG" | null;
    primaryGenre: string | null;
    secondaryGenre: string | null;
    appleGenre: string | null;
    primaryGenreSource: "APPLE_PUBLIC_CATALOG" | "DISTRIBUTION_METADATA" | null;
    isrc: string[];
    upc: string | null;
    identifiers: Record<string, string>;
  };
  catalog: { tags: string[]; moodTags: string[]; moodSeeds: string[] };
  actions: KnowledgeAction[];
  evidence: { field: string; sourceType: "APPLE_PUBLIC_CATALOG" | "DISTRIBUTION_METADATA" | "MUSIAM_CATALOG"; stableIdentifier: string }[];
  editorial: null | {
    summaryJa: string | null;
    ownerIntentSummaryJa: string | null;
    facets: string[];
    sourceClass: EditorialSourceClass;
    ownerIntentStatus: OwnerIntentStatus;
    sourceHref: string | null;
  };
  interpretations: { status: "UNPOPULATED" };
  unknowns: string[];
  /** Reserved extension point. No audio analysis is produced by this Gate. */
  audioAnalysis?: null;
};

export type DistributionRow = {
  workId?: string | null;
  canonicalWorkId?: string | null;
  alias?: string | null;
  title?: string | null;
  artist?: string | null;
  releaseDate?: string | null;
  releaseDateAuthority?: "DISTROKID_EXPLICIT" | "APPLE_PUBLIC_DISTRIBUTION" | "OWNER_VERIFIED" | null;
  primaryGenre?: string | null;
  secondaryGenre?: string | null;
  isrc?: string | null;
  upc?: string | null;
  releaseId?: string | null;
  appleCollectionId?: string | null;
};

export type IdentityResolution =
  | { status: "RESOLVED"; workId: string; method: "EXACT_WORK_ID" | "CANONICAL_MAPPING" | "EXACT_ISRC" | "UNIQUE_RELEASE_ID" | "EXPLICIT_ALIAS" }
  | { status: "UNRESOLVED"; reason: "TITLE_ONLY" | "NO_MATCH" | "AMBIGUOUS_IDENTIFIER" };

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function mediumForWork(work: CatalogWork): WorkMedium {
  const type = String(work.type ?? "").toLowerCase();
  if (/(music|album|track|song|audio)/.test(type)) return "music";
  if (/(book|novel|read|pdf)/.test(type)) return "book";
  return "other";
}

export function buildWorkKnowledgeEnvelope(work: CatalogWork): KnowledgeEnvelope | null {
  const workId = clean(work.id);
  if (!workId) return null;
  const editorialRow = getEditorialKnowledgeForWorkId(workId);
  const editorial = editorialRow ? {
    summaryJa: clean(editorialRow.summaryJa),
    ownerIntentSummaryJa: clean(editorialRow.ownerIntentSummaryJa),
    facets: (editorialRow.facets ?? []).map(String).filter(Boolean),
    sourceClass: editorialSourceClass(editorialRow),
    ownerIntentStatus: editorialRow.ownerIntentStatus ?? "UNKNOWN" as const,
    sourceHref: clean(editorialRow.sourceHref),
  } : null;
  const hasExplicitOwnerIntent = editorial?.ownerIntentStatus === "EXPLICIT" && !!editorial.ownerIntentSummaryJa;
  const distribution = work.distribution;
  const applePublicSource = distribution?.source === "apple-music";
  const primaryGenreSource = distribution?.primaryGenre
    ? applePublicSource ? "APPLE_PUBLIC_CATALOG" as const : "DISTRIBUTION_METADATA" as const
    : null;
  const recordingIsrcs = (work.identifiers?.recordings ?? []).map((entry) => clean(entry?.isrc)).filter((value): value is string => !!value);
  const isrc = Array.from(new Set([clean(distribution?.isrc), ...recordingIsrcs].filter((value): value is string => !!value)));
  const upc = clean(distribution?.upc) ?? clean(work.identifiers?.release?.upc);
  const albumuuid = clean(work.identifiers?.release?.albumuuid) ?? clean(work.ssd?.albumuuid);
  const appleCollectionId = clean(work.identifiers?.release?.appleCollectionId) ?? clean(distribution?.identifiers?.appleCollectionId);
  const identifiers: Record<string, string> = { ...(distribution?.identifiers ?? {}) as Record<string, string> };
  if (albumuuid) identifiers.albumuuid = albumuuid;
  if (upc) identifiers.upc = upc;
  if (appleCollectionId) identifiers.appleCollectionId = appleCollectionId;
  for (const [key, value] of Object.entries(identifiers)) if (!clean(value)) delete identifiers[key];

  const links = getPublicLinksForCard(work);
  const actions: KnowledgeAction[] = links.map((link) => ({
    kind: link.kind === "read" ? "read" : mediumForWork(work) === "music" && ["spotify", "appleMusic", "amazonMusic", "listen"].includes(link.kind) ? "listen" : "view",
    url: link.url,
    scope: "recorded-public-url",
  }));
  const storeUrl = clean(work.salesHref);
  if (storeUrl) actions.push({ kind: "store", url: storeUrl, scope: "recorded-public-url" });

  const fields: Array<[string, unknown, "APPLE_PUBLIC_CATALOG" | "DISTRIBUTION_METADATA" | "MUSIAM_CATALOG"]> = [
    ["title", work.title, distribution ? "DISTRIBUTION_METADATA" : "MUSIAM_CATALOG"],
    ["medium", work.type, "MUSIAM_CATALOG"],
    ["releaseDate", distribution?.releaseDate ?? work.releasedAt, distribution?.releaseDate ? "DISTRIBUTION_METADATA" : "MUSIAM_CATALOG"],
    ["primaryGenre", distribution?.primaryGenre, primaryGenreSource ?? "DISTRIBUTION_METADATA"],
    ["secondaryGenre", distribution?.secondaryGenre, "DISTRIBUTION_METADATA"],
    ["appleGenre", distribution?.appleGenre, "APPLE_PUBLIC_CATALOG"],
    ["tags", work.tags, "MUSIAM_CATALOG"],
    ["moodTags", work.moodTags, "MUSIAM_CATALOG"],
    ["moodSeeds", work.moodSeeds, "MUSIAM_CATALOG"],
    ["actions", actions, "MUSIAM_CATALOG"],
    ["identifiers", identifiers, distribution ? "DISTRIBUTION_METADATA" : "MUSIAM_CATALOG"],
  ];
  const evidence = fields.filter(([, value]) => Array.isArray(value)
    ? value.length > 0
    : value !== null && typeof value === "object"
      ? Object.keys(value as Record<string, unknown>).length > 0
      : clean(value) !== null)
    .map(([field, , sourceType]) => ({ field, sourceType, stableIdentifier: workId }));
  const unknowns = [
    ...(!clean(work.title) ? ["title"] : []),
    ...(!clean(distribution?.releaseDate ?? work.releasedAt) ? ["releaseDate"] : []),
    ...(!clean(distribution?.source) ? ["distributionSource"] : []),
    ...(!clean(distribution?.artist) ? ["artist"] : []),
    ...(!clean(distribution?.primaryGenre) ? ["primaryGenre"] : []),
    ...(!clean(distribution?.secondaryGenre) ? ["secondaryGenre"] : []),
    ...(!clean(distribution?.appleGenre) ? ["appleGenre"] : []),
    ...(!isrc.length ? ["isrc"] : []),
    ...(!upc ? ["upc"] : []),
    ...(!Object.keys(identifiers).length ? ["releaseIdentifiers"] : []),
    ...(!actions.some((action) => action.kind === "listen") ? ["publicListenAction"] : []),
    ...(!editorial?.summaryJa ? ["editorialSummary"] : []),
    ...(!hasExplicitOwnerIntent ? ["ownerProductionIntent"] : []),
    "instruments", "bpm", "vocalPresence", "lyrics", "lyricTheme", "sonicTexture", "recordingLocation", "rights", "fullTrackAvailability",
  ];

  return {
    workId,
    title: clean(work.title),
    medium: mediumForWork(work),
    releaseDate: clean(distribution?.releaseDate) ?? clean(work.releasedAt),
    distribution: {
      source: clean(distribution?.source),
      artist: clean(distribution?.artist),
      releaseDateAuthority: distribution?.releaseDate
        ? distribution.releaseDateAuthority ?? null
        : clean(work.releasedAt) ? "MUSIAM_CATALOG" : null,
      primaryGenre: clean(distribution?.primaryGenre),
      secondaryGenre: clean(distribution?.secondaryGenre),
      appleGenre: clean(distribution?.appleGenre),
      primaryGenreSource,
      isrc,
      upc,
      identifiers,
    },
    catalog: {
      tags: (work.tags ?? []).map(String),
      moodTags: (work.moodTags ?? []).map(String),
      moodSeeds: (work.moodSeeds ?? []).map(String),
    },
    actions,
    evidence,
    editorial,
    interpretations: { status: "UNPOPULATED" },
    unknowns,
    audioAnalysis: null,
  };
}

export function buildLunaEvidencePack(work: CatalogWork): string | null {
  const envelope = buildWorkKnowledgeEnvelope(work);
  if (!envelope) return null;
  return JSON.stringify({
    status: "EVIDENCE_ONLY",
    fact: {
      workId: envelope.workId,
      title: envelope.title,
      medium: envelope.medium,
      releaseDate: envelope.releaseDate,
      distributionReleaseMetadata: envelope.distribution,
      catalogMetadata: envelope.catalog,
      actions: envelope.actions,
    },
    editorial: envelope.editorial,
    editorialPolicy: {
      ownerIntentMayBeAttributedToOwner: envelope.editorial?.ownerIntentStatus === "EXPLICIT" && !!envelope.editorial.ownerIntentSummaryJa,
      editorialSummaryMayDescribeWork: !!envelope.editorial?.summaryJa,
      nonExplicitOwnerIntentMustNotBeInvented: true,
      curatorialInterpretationAllowedIfClearlyFramedAsInterpretation: true,
      biographicalFabricationForbidden: true,
    },
    interpretation: "You may offer a compact curatorial reading, but clearly frame it as your reading and never restate it as owner biography, historical fact, lyrics, instruments, or production intent.",
    unknown: envelope.unknowns,
  });
}

const compact = (value: unknown) => String(value ?? "").trim().toLowerCase();
const allIsrcs = (work: CatalogWork) => Array.from(new Set([
  ...(work.identifiers?.recordings ?? []).map((entry) => clean(entry?.isrc)),
  clean(work.distribution?.isrc),
].filter((value): value is string => !!value)));
const releaseIds = (work: CatalogWork) => [
  clean(work.distribution?.upc), clean(work.identifiers?.release?.upc),
  clean(work.distribution?.identifiers?.albumuuid), clean(work.identifiers?.release?.albumuuid), clean(work.ssd?.albumuuid),
  ...Object.entries(work.distribution?.identifiers ?? {}).filter(([name]) => name !== "appleCollectionId").map(([, value]) => clean(value)),
].filter((value): value is string => !!value).map(compact);
const appleCollectionIds = (work: CatalogWork) => [
  clean(work.identifiers?.release?.appleCollectionId), clean(work.distribution?.identifiers?.appleCollectionId),
].filter((value): value is string => !!value).map(compact);

export function resolveDistributionRow(row: DistributionRow, works: CatalogWork[]): IdentityResolution {
  const exactId = clean(row.workId);
  if (exactId) {
    const work = works.find((entry) => String(entry.id ?? "") === exactId);
    if (work) return { status: "RESOLVED", workId: String(work.id), method: "EXACT_WORK_ID" };
  }
  const canonicalId = clean(row.canonicalWorkId);
  if (canonicalId) {
    const work = works.find((entry) => String(entry.id ?? "") === canonicalId || entry.canonicalMasterId === canonicalId);
    if (work) return { status: "RESOLVED", workId: String(work.id), method: "CANONICAL_MAPPING" };
  }
  const isrc = compact(row.isrc);
  if (isrc) {
    const matches = works.filter((work) => allIsrcs(work).some((value) => compact(value) === isrc));
    if (matches.length === 1) return { status: "RESOLVED", workId: String(matches[0].id), method: "EXACT_ISRC" };
    if (matches.length > 1) return { status: "UNRESOLVED", reason: "AMBIGUOUS_IDENTIFIER" };
  }
  for (const releaseId of [row.upc, row.releaseId].map(compact).filter(Boolean)) {
    const matches = works.filter((work) => releaseIds(work).includes(releaseId));
    if (matches.length === 1) return { status: "RESOLVED", workId: String(matches[0].id), method: "UNIQUE_RELEASE_ID" };
    if (matches.length > 1) return { status: "UNRESOLVED", reason: "AMBIGUOUS_IDENTIFIER" };
  }
  const appleCollectionId = compact(row.appleCollectionId);
  if (appleCollectionId) {
    const matches = works.filter((work) => appleCollectionIds(work).includes(appleCollectionId));
    if (matches.length === 1) return { status: "RESOLVED", workId: String(matches[0].id), method: "UNIQUE_RELEASE_ID" };
    if (matches.length > 1) return { status: "UNRESOLVED", reason: "AMBIGUOUS_IDENTIFIER" };
  }
  const alias = clean(row.alias);
  if (alias) {
    const matches = works.filter((work) => (work.catalogAliases ?? []).includes(alias));
    if (matches.length === 1) return { status: "RESOLVED", workId: String(matches[0].id), method: "EXPLICIT_ALIAS" };
    if (matches.length > 1) return { status: "UNRESOLVED", reason: "AMBIGUOUS_IDENTIFIER" };
  }
  return { status: "UNRESOLVED", reason: clean(row.title) ? "TITLE_ONLY" : "NO_MATCH" };
}

export function projectDistributionMetadata(
  row: DistributionRow,
  works: CatalogWork[],
  source: string,
): { resolution: IdentityResolution; work: CatalogWork | null } {
  const resolution = resolveDistributionRow(row, works);
  if (resolution.status !== "RESOLVED") return { resolution, work: null };
  const work = works.find((entry) => String(entry.id ?? "") === resolution.workId);
  if (!work) return { resolution: { status: "UNRESOLVED", reason: "NO_MATCH" }, work: null };
  const identifiers = { ...(work.distribution?.identifiers ?? {}) };
  if (clean(row.releaseId)) identifiers.releaseId = clean(row.releaseId)!;
  if (clean(row.upc)) identifiers.upc = clean(row.upc)!;
  if (clean(row.appleCollectionId)) identifiers.appleCollectionId = clean(row.appleCollectionId)!;
  return {
    resolution,
    work: {
      ...work,
      distribution: {
        ...work.distribution,
        source: clean(source) ?? work.distribution?.source,
        artist: clean(row.artist) ?? work.distribution?.artist ?? null,
        releaseDate: clean(row.releaseDate) ?? work.distribution?.releaseDate ?? null,
        releaseDateAuthority: clean(row.releaseDate) ? row.releaseDateAuthority ?? null : work.distribution?.releaseDateAuthority ?? null,
        primaryGenre: clean(row.primaryGenre) ?? work.distribution?.primaryGenre ?? null,
        secondaryGenre: clean(row.secondaryGenre) ?? work.distribution?.secondaryGenre ?? null,
        isrc: clean(row.isrc) ?? work.distribution?.isrc ?? null,
        upc: clean(row.upc) ?? work.distribution?.upc ?? null,
        identifiers,
      },
    },
  };
}

export type IncrementalStatus = "NEW" | "CHANGED" | "UNCHANGED" | "UNRESOLVED";
export function classifyIncrementalRows(
  rows: DistributionRow[],
  works: CatalogWork[],
  previousByWorkId: Record<string, string>,
): Array<{ row: DistributionRow; status: IncrementalStatus; workId: string | null; fingerprint: string | null; refreshProjection: boolean }> {
  return rows.map((row) => {
    const resolution = resolveDistributionRow(row, works);
    if (resolution.status !== "RESOLVED") return { row, status: "UNRESOLVED", workId: null, fingerprint: null, refreshProjection: false };
    const fingerprint = JSON.stringify({
      workId: resolution.workId, title: clean(row.title), artist: clean(row.artist), releaseDate: clean(row.releaseDate),
      primaryGenre: clean(row.primaryGenre), secondaryGenre: clean(row.secondaryGenre), isrc: compact(row.isrc), upc: compact(row.upc), releaseId: compact(row.releaseId),
    });
    const prior = previousByWorkId[resolution.workId];
    const status: IncrementalStatus = prior === undefined ? "NEW" : prior === fingerprint ? "UNCHANGED" : "CHANGED";
    return { row, status, workId: resolution.workId, fingerprint, refreshProjection: status === "NEW" || status === "CHANGED" };
  });
}

export function latestReleasedWorks(works: CatalogWork[], options: { medium?: WorkMedium; now?: Date; limit?: number } = {}): CatalogWork[] {
  const now = options.now ?? new Date();
  const upperBound = tokyoYmd(now);
  return works.filter((work) => {
    if (options.medium && mediumForWork(work) !== options.medium) return false;
    const date = clean(work.distribution?.releaseDate) ?? clean(work.releasedAt);
    const day = date?.slice(0, 10) ?? "";
    return !!date && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(date)) && day <= upperBound;
  }).sort((a, b) => {
    const dateA = clean(a.distribution?.releaseDate) ?? clean(a.releasedAt) ?? "";
    const dateB = clean(b.distribution?.releaseDate) ?? clean(b.releasedAt) ?? "";
    return dateB.localeCompare(dateA) || String(a.id ?? "").localeCompare(String(b.id ?? ""));
  }).slice(0, options.limit ?? 1);
}

export type VisitorState = {
  preferredMedium: "music" | "book" | null;
  rejectedWorkIds: string[];
  recentRecommendedWorkIds: string[];
  lastPresentedWorkId: string | null;
  anotherRequested: boolean;
  reopenRequested: boolean;
};
export type VisitorMessage = { role: "user" | "assistant"; content: string; recommendedWorkId?: string | null };

export function deriveVisitorState(messages: VisitorMessage[], recentLimit = 5): VisitorState {
  let preferredMedium: VisitorState["preferredMedium"] = null;
  let lastPresentedWorkId: string | null = null;
  const recentRecommendedWorkIds: string[] = [];
  const rejectedWorkIds = new Set<string>();
  const users = messages.filter((message) => message.role === "user");
  for (const message of messages) {
    if (message.role === "assistant" && message.recommendedWorkId) {
      lastPresentedWorkId = message.recommendedWorkId;
      recentRecommendedWorkIds.push(message.recommendedWorkId);
    }
    if (message.role !== "user") continue;
    const text = message.content.normalize("NFKC").toLowerCase();
    if (/(?:本|小説|書籍|\bbook\b|\bnovel\b|\blivre\b|\bleer\b|\blibro\b|\bleer\b|\bbuch\b|\blesen\b|كتاب|قراءة)/i.test(text)) preferredMedium = "book";
    else if (/(?:曲|音楽|楽曲|\bmusic\b|\bsong\b|\btrack\b|\bmusique\b|\bchanson\b|\bcanción\b|\bmúsica\b|\blied\b|\bmusik\b|أغنية|موسيقى)/i.test(text)) preferredMedium = "music";
    if (lastPresentedWorkId && /(?:これは違う|好みではない|気に入らない|別のもの|don't like this|not for me|not this|pas celle-ci|no me gusta esta|gefällt mir nicht|لا يعجبني)/i.test(text)) rejectedWorkIds.add(lastPresentedWorkId);
    if (lastPresentedWorkId && /(?:やっぱりこれ|もう一度これ|やはりこれ|show this again|reopen this|want this one again|reconsid[eè]re cette œuvre|quiero esta otra vez|diese wieder|أريد هذا مجددًا)/i.test(text)) rejectedWorkIds.delete(lastPresentedWorkId);
  }
  const latestText = users.at(-1)?.content ?? "";
  const anotherRequested = /(?:別の作品|別の曲|他の曲|他の作品|違う作品|もう一曲|もう一つ|another (?:one|work|song)|different (?:one|work|song)|autre œuvre|autre morceau|otra obra|otra canción|anderes werk|anderes lied|عمل آخر|أغنية أخرى)/i.test(latestText);
  const reopenRequested = /(?:やっぱりこれ|もう一度これ|やはりこれ|show this again|reopen this|want this one again)/i.test(latestText);
  return {
    preferredMedium,
    rejectedWorkIds: Array.from(rejectedWorkIds),
    recentRecommendedWorkIds: Array.from(new Set(recentRecommendedWorkIds)).slice(Math.max(0, new Set(recentRecommendedWorkIds).size - Math.max(0, recentLimit))),
    lastPresentedWorkId,
    anotherRequested,
    reopenRequested,
  };
}

export function eligibleForVisitor(work: CatalogWork, state: VisitorState): boolean {
  const id = String(work.id ?? "");
  if (!id || state.rejectedWorkIds.includes(id)) return false;
  if (state.reopenRequested) return true;
  if (state.anotherRequested && (id === state.lastPresentedWorkId || state.recentRecommendedWorkIds.includes(id))) return false;
  if (state.preferredMedium && mediumForWork(work) !== state.preferredMedium) return false;
  return true;
}

export function asksForLatestRelease(text: string): boolean {
  return /(?:新曲|最新曲|最近.{0,8}(?:出した|リリース|作品)|新しい作品|最新.{0,6}(?:作品|リリース)|\b(?:new|latest|recent)\s+(?:song|release|work|album)s?\b|what(?:'s| is) new|dernier(?:e)?s? (?:morceau|sortie|œuvre)|nouveau(?:lle)?s? (?:morceau|œuvre)|últim[oa]s? (?:canción|lanzamiento|obra)|nuev[oa]s? (?:canción|obra)|neu(?:e|este|sten) (?:lied|veröffentlichung|werk)|aktuell(?:e|sten) (?:lieder|werke)|أحدث (?:أغنية|إصدار|عمل)|أغنية جديدة)/i.test(text);
}

export function asksForUpcomingRelease(text: string): boolean {
  return /(?:次の新曲|次のリリース|近日(?:公開|リリース)|公開予定|配信予定|\b(?:upcoming|next|coming\s+soon)\s+(?:song|release|album)\b|\bwhat(?:'s| is)\s+coming\b|prochain(?:e)?\s+(?:morceau|sortie|album)|próxim[oa]\s+(?:canción|lanzamiento|álbum)|näch(?:ste|sten)\s+(?:lied|veröffentlichung|album)|الإصدار القادم|الأغنية القادمة)/i.test(text);
}

export function asksForWorkStory(text: string): boolean {
  return /(?:どんな(?:曲|作品)|どういう(?:曲|作品)|テーマ|意味|何を描|何を表現|何を込め|なにを込め|何が込め|どんな(?:思い|想い|意図).{0,8}(?:込め|こめ)|何を伝え|何が伝え|制作背景|作った理由|なぜ.{0,10}作|なんで.{0,10}作|どうして.{0,10}作|この曲について|この作品について|\b(?:what is this song about|what is this work about|what does .* mean|what did .* put into|what was .* meant to convey|what is .* trying to say|why did .* make|why was .* made|story behind|meaning|theme)\b|de quoi parle|pourquoi .* créé|signifie|de qué trata|por qué .* hizo|bedeutet|warum .* gemacht|worum geht|عن ماذا|لماذا.*صنع|معنى)/i.test(text);
}

export function workStoryResponseLooksComplete(
  text: string,
  language: "ja" | "en" | "fr" | "es" | "de" | "ar",
): boolean {
  const value = String(text ?? "").normalize("NFKC").trim();
  if (value.length < 12) return false;

  // A model can return ok=true even when its generated sentence is cut off.
  // Work Story responses are prose, so terminal punctuation is the strongest
  // language-independent completion signal.
  if (/[。！？!?…．.」』”’›»)]$/u.test(value)) return true;

  if (language === "ja") {
    // Allow natural chat endings that sometimes omit final punctuation while
    // rejecting connective/conjugation stems such as 「一望させ」.
    if (/(?:です|ます|でした|ました|ません|ですね|ですよ|でしょう|でしょうね|だね|だよ|なんだ|なのです|のです|かもしれない|かもしれません|と思います|と考えます|に見えます|だろう)$/u.test(value)) return true;
    if (/(?:させ|して|し|で|が|を|に|へ|と|ながら|けれど|けど|ので|から|なら|たり|つつ|として|という)$/u.test(value)) return false;
  }

  return false;
}

export function asksForTechnicalSonicDetails(text: string): boolean {
  return /(?:どんな音|どんな楽器|何の楽器|楽器.*(?:入|使)|歌詞|BPM|テンポ|ボーカル|歌って|ピアノ|ギター|ドラム|音色|ミックス|マスタリング|\b(?:what does it sound like|what instruments|lyrics|bpm|tempo|vocals?|piano|guitar|drums?|mix|mastering)\b|quels instruments|paroles|tempo|suena|instrumentos|letra|instrumente|liedtext|klingt|آلات موسيقية|كلمات الأغنية)/i.test(text);
}

export function asksForSonicDetails(text: string): boolean {
  return /(?:どんな音|どんな曲|どんな楽器|何の楽器|楽器.*(?:入|使)|歌詞|激しい|ピアノ|音色|テンポ|\b(?:what does it sound like|what instruments|lyrics|is it intense|does it have piano|tempo|vocals?)\b|quels instruments|paroles|suena|instrumentos|letra|instrumente|liedtext|klingt|آلات موسيقية|كلمات الأغنية)/i.test(text);
}

export function unknownSonicText(language: "ja" | "en" | "fr" | "es" | "de" | "ar", workId: string, hasListenAction: boolean): string {
  const variant = Array.from(workId).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2;
  const withAction: Record<typeof language, [string, string]> = {
    ja: ["そこはまだ発掘できてません。想像で音を足すより早いので、下のカードで耳から答え合わせしましょう。", "その音の細部はまだ裏が取れてません。ここで勝手に楽器を召喚するのも格好悪いので、下のカードで聴けます。"],
    en: ["The catalog does not establish those sonic details. You can listen through the verified public link below.", "I cannot verify the instruments or texture from the records. I have included the public listening link so you can hear it yourself."],
    fr: ["Le catalogue ne permet pas d’affirmer ces détails sonores. Vous pouvez écouter l’œuvre avec le lien public vérifié ci-dessous.", "Les instruments et le timbre ne sont pas documentés. J’ai ajouté le lien d’écoute public pour que vous puissiez l’entendre."],
    es: ["El catálogo no confirma esos detalles sonoros. Puede escuchar la obra desde el enlace público verificado de abajo.", "Los instrumentos y el timbre no constan en los registros. He añadido el enlace de escucha para que pueda comprobarlo."],
    de: ["Der Katalog belegt diese Klangdetails nicht. Über den bestätigten öffentlichen Link unten können Sie selbst hineinhören.", "Instrumente und Klangfarbe sind nicht dokumentiert. Ich habe den öffentlichen Hörlink ergänzt, damit Sie selbst lauschen können."],
    ar: ["لا يثبت الفهرس هذه التفاصيل الصوتية. يمكنك الاستماع إلى العمل عبر الرابط العام الموثق أدناه.", "لا تسجل البيانات الآلات أو الطابع الصوتي. أرفقت رابط الاستماع العام لتتحقق بنفسك."],
  };
  const withoutAction: Record<typeof language, string> = {
    ja: "そこはまだ未発掘です。適当に音を召喚するのはやめておきます。試聴の裏が取れたら、耳で答え合わせしましょう。",
    en: "The available records do not establish those details, and I cannot find a verified public listening link.",
    fr: "Les données disponibles ne permettent pas de l’établir, et je ne trouve aucun lien d’écoute public vérifié.",
    es: "Los registros disponibles no permiten confirmarlo y no encuentro un enlace público de escucha verificado.",
    de: "Die verfügbaren Angaben belegen das nicht, und ich finde keinen bestätigten öffentlichen Hörlink.",
    ar: "لا تؤكد السجلات المتاحة ذلك، ولا أجد رابط استماع عامًا موثقًا.",
  };
  return hasListenAction ? withAction[language][variant] : withoutAction[language];
}
