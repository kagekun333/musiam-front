import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { chat as llmChat } from "@/lib/llm-router";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { getPublicLinksForCard } from "@/lib/work-links";
import {
  getChatEntry,
  getChatPersona,
  type ChatEntry,
  type ChatEntryId,
  type ChatPersona,
} from "@/lib/chat-experience";

const MAX_USER_TURNS = 10;

type Lang = "ja" | "en";
type Stage = "open" | "receive" | "reflect" | "hold" | "offer" | "close";

type RecoLinkKind = "open" | "listen" | "buy" | "read";
type RecoCard = {
  id: string;
  title: string;
  cover: string;
  links: { kind: RecoLinkKind; url: string }[];
  moodTags?: string[];
  type?: string;
};

type Work = {
  id?: string | number;
  title?: string;
  type?: string;
  cover?: string;
  tags?: string[];
  releasedAt?: string;
  href?: string;
  primaryHref?: string;
  salesHref?: string;
  moodTags?: string[];
  moodSeeds?: string[];
  matchInfo?: { summary?: string; reason?: string } | string;
  links?: Record<string, string> | { url?: string; label?: string }[] | null;
  ssd?: {
    tracks?: { n?: number; title?: string; mood?: string; notes?: string }[];
  };
};

const BodySchema = z.object({
  entryId: z.string().optional(),
  lang: z.enum(["ja", "en"]).default("ja"),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })
    )
    .default([]),
});

function countUserTurns(messages: { role: string; content: string }[]) {
  return messages.filter((message) => message.role === "user" && String(message.content || "").trim()).length;
}

function lastUserText(messages: { role: string; content: string }[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return String(messages[i].content || "").trim();
  }
  return "";
}

function userTextBlob(messages: { role: string; content: string }[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => String(message.content || "").trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeWorkType(t: string | undefined): "book" | "music" | "other" {
  const x = String(t || "").toLowerCase();
  if (x === "book") return "book";
  if (x === "music") return "music";
  if (x.includes("book") || x.includes("novel") || x.includes("read") || x.includes("pdf")) return "book";
  if (x.includes("music") || x.includes("album") || x.includes("track") || x.includes("song") || x.includes("audio")) {
    return "music";
  }
  return "other";
}

function extractDesiredType(text: string, entry?: ChatEntry): "book" | "music" | undefined {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("本") || lower.includes("book") || lower.includes("読む")) return "book";
  if (lower.includes("音楽") || lower.includes("music") || lower.includes("曲") || lower.includes("聴")) return "music";
  return entry?.defaultDesiredType;
}

function tokenizeLoose(text: string): string[] {
  const value = String(text || "").trim().toLowerCase();
  if (!value) return [];
  const ascii = value
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 14);
  const jpChunks = value.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]{2,}/gu) ?? [];
  return Array.from(new Set([...ascii, ...jpChunks])).slice(0, 20);
}

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function scoreWork(work: Work, tokens: string[]): number {
  if (!tokens.length) return 0;
  const hay = [
    work.title ?? "",
    ...(Array.isArray(work.tags) ? work.tags : []),
    ...(Array.isArray(work.moodTags) ? work.moodTags : []),
    ...(Array.isArray(work.moodSeeds) ? work.moodSeeds : []),
    typeof work.matchInfo === "string" ? work.matchInfo : work.matchInfo?.summary ?? "",
    work.matchInfo && typeof work.matchInfo === "object" ? work.matchInfo.reason ?? "" : "",
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (hay.includes(token)) score += token.length >= 4 ? 3 : 2;
  }

  const title = String(work.title || "").toLowerCase();
  for (const token of tokens) {
    if (token && title.includes(token)) score += 4;
  }

  return score;
}

function buildLinks(work: Work): { kind: RecoLinkKind; url: string }[] {
  return getPublicLinksForCard(work).map((item) => ({
    kind: item.kind === "spotify" || item.kind === "appleMusic" || item.kind === "amazonMusic" ? "listen" : item.kind,
    url: item.url,
  }));
}

function pickCover(work: Work) {
  return String(work.cover || "");
}

function workToCard(work: Work): RecoCard | null {
  const id = String(work.id ?? work.title ?? "");
  const title = String(work.title || "").trim();
  const cover = pickCover(work);
  if (!id || !title || !cover) return null;

  const links = buildLinks(work);
  if (!links.length) return null;

  return {
    id,
    title,
    cover,
    links,
    moodTags: Array.isArray(work.moodTags) ? work.moodTags.slice(0, 4) : Array.isArray(work.tags) ? work.tags.slice(0, 4) : [],
    type: work.type,
  };
}

function stripMvImageMarker(text: string) {
  const idx = text.indexOf("MV映像イメージ:");
  return (idx >= 0 ? text.slice(0, idx) : text).trim();
}

function workSummary(work: Work, lang: Lang) {
  const ssdNote = work.ssd?.tracks?.[0]?.notes;
  if (typeof ssdNote === "string" && ssdNote.trim()) {
    const clean = stripMvImageMarker(ssdNote);
    return clean.length > 180 ? clean.slice(0, 180) + "…" : clean;
  }

  const matchInfo = work.matchInfo;
  const summary =
    typeof matchInfo === "string"
      ? matchInfo
      : matchInfo && typeof matchInfo === "object"
      ? matchInfo.summary || matchInfo.reason || ""
      : "";
  if (summary) return summary.length > 120 ? summary.slice(0, 120) + "…" : summary;

  const tags = (Array.isArray(work.moodTags) ? work.moodTags : Array.isArray(work.tags) ? work.tags : []).slice(0, 4);
  if (tags.length) {
    return lang === "ja" ? `雰囲気: ${tags.join(" / ")}` : `Vibe: ${tags.join(" / ")}`;
  }
  return lang === "ja" ? "短く、芯に届く一作。" : "A concise piece that lands cleanly.";
}

function formatPickedForLlm(picked: Work[], lang: Lang) {
  if (!picked.length) return "";
  return picked
    .map((work, index) => {
      const kind = normalizeWorkType(work.type) === "book" ? (lang === "ja" ? "本" : "book") : lang === "ja" ? "音楽" : "music";
      const tags = (Array.isArray(work.moodTags) ? work.moodTags : Array.isArray(work.tags) ? work.tags : [])
        .filter((item) => !/^(ASIN|asin|price|aspect):/i.test(String(item)))
        .slice(0, 4)
        .join(", ");
      return `${index + 1}. [${kind}] 「${work.title ?? ""}」 — ${workSummary(work, lang)}${tags ? ` (tags: ${tags})` : ""}`;
    })
    .join("\n");
}

async function loadWorks(): Promise<Work[]> {
  try {
    return (await loadMergedWorksServer()) as Work[];
  } catch {
    return [];
  }
}

function pickTopCards(params: {
  works: Work[];
  desiredType?: "book" | "music";
  queryText: string;
  count: number;
  seed: string;
}) {
  const { works, desiredType, queryText, count, seed } = params;
  let pool = works.filter((work) => !!pickCover(work));
  if (desiredType) {
    pool = pool.filter((work) => normalizeWorkType(work.type) === desiredType);
  }

  const tokens = tokenizeLoose(queryText);
  const scored = pool.map((work) => ({
    work,
    score: scoreWork(work, tokens),
    jitter: (hash32(`${seed}|${String(work.id ?? work.title ?? "")}`) % 1000) / 1000,
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.jitter - a.jitter;
  });

  const cards: RecoCard[] = [];
  const picked: Work[] = [];

  for (const item of scored) {
    const card = workToCard(item.work);
    if (!card) continue;
    cards.push(card);
    picked.push(item.work);
    if (cards.length >= count) break;
  }

  return {
    cards: cards.slice(0, count),
    picked: picked.slice(0, count),
  };
}

function isDistressText(text: string) {
  return /(しんどい|つらい|辛い|苦しい|疲れた|消えたい|死にたい|生きるのが辛い|限界|もう無理|depressed|hopeless|want to die|can't go on)/i.test(
    String(text || "")
  );
}

function wantsOnlyListening(text: string) {
  return /(聞いてほしい|ただ話したい|ただ聞いて|アドバイスはいらない|just listen|just hear me|don't advise)/i.test(String(text || ""));
}

function wantsWork(text: string) {
  return /(おすすめ|一作|作品|選んで|探して|聴きたい|読みたい|book|music|recommend|pick|find|something to listen|something to read)/i.test(
    String(text || "")
  );
}

function wantsToClose(text: string) {
  return /(ありがとう|またね|もう大丈夫|十分|おやすみ|thanks|thank you|good night|that's enough)/i.test(String(text || ""));
}

function hasSceneSignal(text: string) {
  return /(今夜|夜|朝|寝る前|移動中|仕事帰り|静か|散歩|眠れない|before sleep|tonight|late|commute|walk)/i.test(String(text || ""));
}

function hasMoodSignal(text: string) {
  return /(疲れ|だるい|さみしい|寂しい|焦る|不安|静か|軽い|重い|救い|しんどい|lonely|tired|restless|calm|heavy|light)/i.test(
    String(text || "")
  );
}

type SignalProfile = {
  fatigue: boolean;
  anxiety: boolean;
  loneliness: boolean;
  insomnia: boolean;
  confusion: boolean;
  pressure: boolean;
  social: boolean;
  needQuiet: boolean;
  needPush: boolean;
  needChoice: boolean;
  bodyFocus: boolean;
};

function analyzeSignals(text: string): SignalProfile {
  const value = String(text || "");
  return {
    fatigue: /(疲れ|つかれ|だるい|しんどい|heavy|tired|drained|exhaust)/i.test(value),
    anxiety: /(不安|焦り|こわい|怖い|胸騒ぎ|restless|anxious|afraid|panic)/i.test(value),
    loneliness: /(ひとり|一人|孤独|さみしい|寂しい|lonely|alone)/i.test(value),
    insomnia: /(眠れ|寝れ|寝つけ|夜中|before sleep|can't sleep|insomnia)/i.test(value),
    confusion: /(わからない|まとまらない|散らか|迷う|決められない|can't decide|confused|stuck)/i.test(value),
    pressure: /(仕事|締切|プレッシャー|責任|急が|deadline|pressure|work)/i.test(value),
    social: /(人といる|人前|誰か|会う|会話|with people|around people)/i.test(value),
    needQuiet: /(静か|落ち着きたい| calm |quiet|stillness|rest)/i.test(` ${value} `),
    needPush: /(背中を押|はっきり|決めて|進みたい|push me|be direct)/i.test(value),
    needChoice: /(おすすめ|選んで|一作|本|音楽|recommend|pick|choose)/i.test(value),
    bodyFocus: /(呼吸|身体|体|肩|胃|胸|breath|body|chest|stomach|shoulder)/i.test(value),
  };
}

function summarizeProfile(profile: SignalProfile, lang: Lang) {
  if (lang === "ja") {
    if (profile.insomnia && profile.needQuiet) return "眠りの手前で静けさを探している";
    if (profile.fatigue && profile.pressure) return "疲れと圧の両方を抱えている";
    if (profile.anxiety) return "言葉になる前の不安が揺れている";
    if (profile.loneliness) return "ひとりで抱えた重さが強い";
    if (profile.confusion) return "考えが絡まり、順番が失われている";
    if (profile.needChoice) return "今夜の一つを決めたい";
    if (profile.needQuiet) return "刺激ではなく静けさを求めている";
    return "まだ輪郭になりきらない夜を持ってきている";
  }

  if (profile.insomnia && profile.needQuiet) return "you are looking for stillness before sleep";
  if (profile.fatigue && profile.pressure) return "you're carrying both fatigue and pressure";
  if (profile.anxiety) return "anxiety is moving before it fully becomes language";
  if (profile.loneliness) return "the weight feels especially solitary";
  if (profile.confusion) return "your thoughts feel tangled and out of order";
  if (profile.needChoice) return "you want tonight narrowed to one thing";
  if (profile.needQuiet) return "you want less stimulation, more quiet";
  return "you're carrying a night that hasn't fully taken shape yet";
}

function groundingQuestion(profile: SignalProfile, entry: ChatEntry, lang: Lang, latestQuery?: string) {
  const value = String(latestQuery || "");
  if (lang === "ja") {
    if (profile.pressure) {
      if (/(失敗|怖)/.test(value)) return "その怖さを少し下げるなら、今夜は何を確かめられると動きやすくなりますか。";
      if (/(量|多すぎ|終わら)/.test(value)) return "今夜ひとつだけ捨てるなら、どの作業を外すのがいちばん効きそうですか。";
      return "いま一番圧になっているのは、やることの量ですか、それとも失敗の怖さですか。";
    }
    if (profile.social) return "その感じは、ひとりの時より人といる時の方が強くなりますか。";
    if (profile.insomnia) return "眠れないのは、考えが止まらないからですか、それとも気持ちが落ち着かないからですか。";
    if (profile.confusion) return entry.intent === "discover"
      ? "今夜は本と音楽のどちらに寄せると少し楽になりそうですか。"
      : "順番が崩れているのは、考えですか、気持ちですか。";
    if (profile.loneliness) return "いま欲しいのは、励ましですか、それともただ静かに付き合う相手ですか。";
    if (profile.bodyFocus || profile.fatigue) return "その重さは、少し休むと抜ける感じですか、それとも休んでも残り続けますか。";
    return "その感じがいちばん強く出るのは、今夜のどんな場面ですか。";
  }

  if (profile.pressure) {
    if (/(fear|get it wrong|fail)/i.test(value)) return "If that fear eased even a little, what would become easier to start tonight?";
    if (/(too much|too many|won't finish)/i.test(value)) return "If you dropped one thing tonight, which omission would help most?";
    return "Is the pressure coming more from the amount to do, or from fear of getting it wrong?";
  }
  if (profile.social) return "Does it get stronger when you're around people, or when you're alone?";
  if (profile.insomnia) return "Is sleep far away because your thoughts won't stop, or because your feelings won't settle?";
  if (profile.confusion) {
    return entry.intent === "discover"
      ? "Would tonight be easier if I narrowed this toward a book, or toward music?"
      : "What feels more tangled right now: thought, or feeling?";
  }
  if (profile.loneliness) return "Do you want comfort, or just quiet company?";
  if (profile.bodyFocus || profile.fatigue) return "Does the heaviness ease when you stop moving, or does it stay even when you rest?";
  return "Where does that feeling get strongest tonight?";
}

function reflectLine(profile: SignalProfile, persona: ChatPersona, lang: Lang) {
  const focus = summarizeProfile(profile, lang);
  if (lang === "ja") {
    if (persona.id === "quiet") return `いま見えているのは、${focus}状態です。急いで答えを出すより、まずその輪郭を少し整えた方が良さそうです。`;
    if (persona.id === "dream") return `今夜の気配は、${focus}方向へ傾いています。意味を急がず、その輪郭だけを一度受け取ってみましょう。`;
    return `話をほどくと、${focus}局面に見えます。今は選択肢を増やすより、一本に絞る方が効きそうです。`;
  }

  if (persona.id === "quiet") return `What I see is that ${focus}. It may help to steady that contour before rushing toward an answer.`;
  if (persona.id === "dream") return `Tonight seems tilted toward a shape where ${focus}. We can hold that contour before forcing meaning onto it.`;
  return `Underneath the noise, it looks like ${focus}. Narrowing things down may help more than opening more paths.`;
}

function whisperLine(profile: SignalProfile, lang: Lang) {
  if (lang === "ja") {
    if (profile.fatigue) return "今夜は、無理に元へ戻らなくていい。静けさのほうへ、少しだけ身体を寄せてください。";
    if (profile.anxiety) return "答えを急がなくていい夜です。揺れていること自体を、まず責めないでください。";
    if (profile.loneliness) return "ひとりの重さは、あなたの価値ではありません。今夜は呼吸だけ戻れば十分です。";
    if (profile.pressure) return "今夜すべてを終えなくていい。ひとつだけ終われば、夜はちゃんと前へ進みます。";
    if (profile.needQuiet) return "今夜は強い光より、輪郭のやわらかい静けさのほうが味方になります。";
    return "今夜は、まだ名前にならないものを急いで意味に変えなくて大丈夫です。";
  }

  if (profile.fatigue) return "Tonight, you do not need to force yourself back to normal. Lean a little closer to stillness.";
  if (profile.anxiety) return "This is not a night that needs a rushed answer. Do not punish yourself for shaking.";
  if (profile.loneliness) return "The weight of being alone is not proof of your worth. Tonight, getting your breath back is enough.";
  if (profile.pressure) return "You do not have to finish everything tonight. One finished thing is enough to move the night forward.";
  if (profile.needQuiet) return "Tonight, softer edges may help you more than brighter light.";
  return "Tonight, you do not have to turn an unnamed feeling into meaning too quickly.";
}

function hasStrongSignal(profile: SignalProfile) {
  return Object.values(profile).some(Boolean);
}

function offerLead(card: RecoCard, profile: SignalProfile, persona: ChatPersona, lang: Lang) {
  const focus = summarizeProfile(profile, lang);
  if (lang === "ja") {
    if (persona.id === "quiet") return `今夜は「${card.title}」を置いていきます。${focus}夜に、刺激を増やしすぎず寄り添える一作です。`;
    if (persona.id === "dream") return `今夜の軌道には「${card.title}」が近いです。${focus}気配を、そのまま崩さず受け止めやすい一作です。`;
    return `今夜は「${card.title}」で行きましょう。${focus}場面に対して、余計な遠回りを減らしやすい一作です。`;
  }

  if (persona.id === "quiet") return `Tonight I'll leave you with "${card.title}". It can stay close to a night where ${focus}, without adding more noise.`;
  if (persona.id === "dream") return `"${card.title}" sits closest to tonight's orbit. It can hold a night where ${focus} without forcing it open.`;
  return `Let's go with "${card.title}" tonight. It fits a moment where ${focus}, and it keeps the path clean.`;
}

function entrySpecificFallback(params: {
  entry: ChatEntry;
  persona: ChatPersona;
  lang: Lang;
  stage: Stage;
  query: string;
  profile: SignalProfile;
  cards: RecoCard[];
}) {
  const { entry, persona, lang, stage, query, profile, cards } = params;
  const firstCard = cards[0];

  if (entry.id === "dream-whisper") {
    return whisperLine(profile, lang);
  }

  if (entry.id === "quiet-hear") {
    if (stage === "hold") {
      return lang === "ja"
        ? `それはかなりしんどいね。${summarizeProfile(profile, lang)}ように見えます。今は答えを急がなくていいので、${groundingQuestion(profile, entry, lang, query)}`
        : `${summarizeProfile(profile, lang)}. We don't have to rush an answer. ${groundingQuestion(profile, entry, lang, query)}`;
    }
    if (stage === "receive" || stage === "reflect") {
      if (!hasStrongSignal(profile)) {
        return lang === "ja"
          ? "うまく説明しなくて大丈夫です。今夜の気分を、まとまっていないままで続けて置いてください。こちらで急がず受け止めます。"
          : "You don't have to explain it neatly. Leave the feeling here in its unfinished shape, and I'll receive it without rushing you.";
      }
      return lang === "ja"
        ? `急がなくて大丈夫です。${summarizeProfile(profile, lang)}感じが見えています。${groundingQuestion(profile, entry, lang, query)}`
        : `${reflectLine(profile, persona, lang)} ${groundingQuestion(profile, entry, lang, query)}`;
    }
  }

  if (entry.id === "tactician-pick" && firstCard && stage === "offer") {
    return lang === "ja"
      ? `${offerLead(firstCard, profile, persona, lang)} 迷いを増やさないよう、今夜はこれだけで十分です。`
      : `${offerLead(firstCard, profile, persona, lang)} One is enough for tonight.`;
  }

  if (entry.id === "quiet-piece" && stage !== "offer") {
    return lang === "ja"
      ? `静かな一作へ寄せるなら、${summarizeProfile(profile, lang)}夜に近そうです。${groundingQuestion(profile, entry, lang, query)}`
      : `${reflectLine(profile, persona, lang)} ${groundingQuestion(profile, entry, lang, query)}`;
  }

  if (entry.id === "dream-orbit" && stage !== "offer") {
    return lang === "ja"
      ? `今夜の軌道は、${summarizeProfile(profile, lang)}方向に傾いています。光へ寄せたいのか、深さへ寄せたいのか、どちらが近いですか。`
      : `Tonight's orbit leans toward a shape where ${summarizeProfile(profile, lang)}. Do you want light, or depth?`;
  }

  return null;
}

function recommendationReadiness(params: {
  entry: ChatEntry;
  query: string;
  conversation: string;
  userTurns: number;
  distress: boolean;
}) {
  const { entry, query, conversation, userTurns, distress } = params;
  if (entry.recommendationBias === "never") return 0;

  let score = 0;
  if (userTurns >= entry.minTurnsBeforeOffer) score += 2;
  if (entry.intent === "discover") score += 1;
  if (wantsWork(query)) score += 3;
  if (hasSceneSignal(query) || hasSceneSignal(conversation)) score += 1;
  if (hasMoodSignal(query) || hasMoodSignal(conversation)) score += 1;
  if (distress) score -= 2;
  return score;
}

function pickStage(params: {
  entry: ChatEntry;
  userTurns: number;
  query: string;
  conversation: string;
  distress: boolean;
  readiness: number;
}) {
  const { entry, userTurns, query, conversation, distress, readiness } = params;
  if (userTurns === 0) return "open" satisfies Stage;
  if (entry.id === "dream-whisper" && userTurns >= 1) return "close" satisfies Stage;
  if (wantsToClose(query) || userTurns >= MAX_USER_TURNS) return "close" satisfies Stage;
  if (distress && entry.intent !== "discover") return "hold" satisfies Stage;
  if (entry.recommendationBias === "eager" && readiness >= 3) return "offer" satisfies Stage;
  if (entry.recommendationBias === "gentle" && readiness >= 5 && !wantsOnlyListening(conversation)) return "offer" satisfies Stage;
  if (userTurns <= 1) return "receive" satisfies Stage;
  return "reflect" satisfies Stage;
}

function buildSystemPrompt(params: {
  entry: ChatEntry;
  persona: ChatPersona;
  lang: Lang;
  stage: Stage;
  userTurns: number;
  picked: Work[];
  distress: boolean;
}) {
  const { entry, persona, lang, stage, userTurns, picked, distress } = params;
  const context = stage === "offer" ? formatPickedForLlm(picked, lang) : "";

  if (lang === "ja") {
    return [
      `あなたは伯爵MUSIAMの ${persona.nameJa}。`,
      `人格の軸: ${persona.toneJa}`,
      `入口テーマ: ${entry.nameJa} / ${entry.subtitleJa}`,
      "",
      "■ 会話の基準",
      "- 直前の相手の言葉に具体的に返す。抽象的な相づちだけで終わらせない。",
      "- 断定的に見抜いたふりをせず、『〜かもしれない』『〜に見える』のように仮説として差し出す。",
      "- 心理学の技法は薄く使う。感情ラベリング、ミラーリング、コントラスト質問は可。不安煽りは禁止。",
      "- 1メッセージにつき質問は最大1つ。重い相談では、まず負荷を下げる言葉を置く。",
      "- 同じ言い回しや同じ質問を繰り返さない。",
      "- URL・値段・プラットフォーム名は書かない。",
      "- 作品を出す時は1作だけ。候補にない作品は絶対に出さない。",
      `- いまの stage=${stage}, userTurns=${userTurns}, distress=${distress ? "yes" : "no"}`,
      "",
      "■ stage ごとの役割",
      stage === "receive"
        ? "- 受け止める。相手の言葉を短く言い換えたうえで、状況を少しだけ具体化する1問を返す。まだ作品は出さない。"
        : stage === "reflect"
        ? "- 一段深く言語化する。いま起きている緊張や願いを仮説として返し、必要なら1問だけ置く。原則まだ作品は出さない。"
        : stage === "hold"
        ? "- 重さを優先して受け止める。助言や作品提示を急がず、呼吸を整えるような一言と、足場になる1問だけ返す。"
        : stage === "offer"
        ? "- ここでは一作を差し出してよい。候補の中から1作だけ選び、なぜ今それが合うかを2〜3文で伝える。最後にごく小さく余韻を置く。"
        : "- 静かに締める。会話をまとめ、必要なら一礼して終える。",
      "",
      stage === "offer"
        ? "■ 候補作品 context（この中から1作だけ）\n" +
          (context || "（候補なし。作品は出さず、会話だけで終える）")
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `You are ${persona.nameEn} of Count MUSIAM.`,
    `Core tone: ${persona.toneEn}`,
    `Entry: ${entry.nameEn} / ${entry.subtitleEn}`,
    "",
    "■ Conversation rules",
    "- Reply specifically to the user's latest words. Do not hide behind generic empathy.",
    "- Use tentative pattern reading, not manipulative certainty.",
    "- Light psychology only: emotional labeling, mirroring, contrast questions. No fear amplification.",
    "- At most one question per message. Lower pressure first if the user is distressed.",
    "- Never repeat the same wording or question.",
    "- No URLs, prices, or platform names.",
    "- If you offer a work, offer only one, and only from the provided candidates.",
    `- Current stage=${stage}, userTurns=${userTurns}, distress=${distress ? "yes" : "no"}`,
    "",
    "■ Stage duties",
    stage === "receive"
      ? "- Receive. Briefly mirror the user's words and ask one clarifying question. Do not recommend yet."
      : stage === "reflect"
      ? "- Reflect. Name the tension or desire more precisely and, if needed, ask one grounded question. Usually do not recommend yet."
      : stage === "hold"
      ? "- Hold. Reduce pressure, offer a stabilizing line, and ask one small grounded question. Do not recommend."
      : stage === "offer"
      ? "- Offer. Choose exactly one work from the candidates and explain in 2-3 sentences why it fits tonight."
      : "- Close gently. Summarize and bow out without pushing.",
    stage === "offer"
      ? "■ Candidate works context\n" + (context || "(No candidate available. Do not recommend a work.)")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function callLlm(params: {
  system: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  trace: string;
}) {
  try {
    return await llmChat({
      purpose: "quality",
      system: params.system,
      messages: params.messages,
      temperature: 0.8,
      maxTokens: 450,
      trace: params.trace,
    });
  } catch {
    return { ok: false, text: "", provider: "none", model: "", error: "chat failed", tried: [] } as const;
  }
}

function fallbackResponse(params: {
  entry: ChatEntry;
  persona: ChatPersona;
  lang: Lang;
  stage: Stage;
  query: string;
  conversation: string;
  cards: RecoCard[];
}) {
  const { entry, persona, lang, stage, query, conversation, cards } = params;
  const firstCard = cards[0];
  const profile = analyzeSignals(conversation || query);
  const entrySpecific = entrySpecificFallback({ entry, persona, lang, stage, query, profile, cards });
  if (entrySpecific) return entrySpecific;

  if (lang === "ja") {
    if (stage === "hold") {
      if (persona.id === "quiet") {
        return `それはかなりしんどいね。${summarizeProfile(profile, lang)}ように見えます。今は答えを急がなくていいので、${groundingQuestion(profile, entry, lang, query)}`;
      }
      if (persona.id === "dream") {
        return `今夜は無理に意味を探さなくて大丈夫です。${summarizeProfile(profile, lang)}夜なら、まず輪郭だけで十分です。${groundingQuestion(profile, entry, lang, query)}`;
      }
      return `まず足場を作りましょう。いまは ${summarizeProfile(profile, lang)} 状態に見えます。${groundingQuestion(profile, entry, lang, query)}`;
    }

    if (stage === "receive") {
      if (query) {
        const openings: Record<ChatPersona["id"], string> = {
          quiet: `急がなくて大丈夫です。${summarizeProfile(profile, lang)}感じが見えています。`,
          dream: `その断片には今夜の輪郭があります。${summarizeProfile(profile, lang)}気配が出ています。`,
          tactician: `まず軸を見ます。今は ${summarizeProfile(profile, lang)} 状態に近そうです。`,
        };
        return `${openings[persona.id]} ${groundingQuestion(profile, entry, lang, query)}`;
      }
    }

    if (stage === "reflect") {
      return `${reflectLine(profile, persona, lang)} ${groundingQuestion(profile, entry, lang, query)}`;
    }

    if (stage === "offer" && firstCard) {
      return `${offerLead(firstCard, profile, persona, lang)} 下の一作からどうぞ。`;
    }

    if (stage === "close") {
      return "今夜はここまでで大丈夫です。必要になったら、また別の入口からでも来てください。";
    }

    return query
      ? `その言葉は見落としたくありません。${entry.subtitleJa} に近づくために、もう一段だけ具体的にしてみましょう。`
      : entry.openingJa;
  }

  if (stage === "hold") {
    return `${summarizeProfile(profile, lang)}. We don't need to force meaning yet. ${groundingQuestion(profile, entry, lang, query)}`;
  }

  if (stage === "receive") {
    return `${reflectLine(profile, persona, lang)} ${groundingQuestion(profile, entry, lang, query)}`;
  }

  if (stage === "reflect") {
    return `${reflectLine(profile, persona, lang)} ${groundingQuestion(profile, entry, lang, query)}`;
  }

  if (stage === "offer" && firstCard) {
    return `${offerLead(firstCard, profile, persona, lang)} Open the work below when you're ready.`;
  }

  if (stage === "close") {
    return "That's enough for tonight. Come back through any doorway when you need it.";
  }

  return entry.openingEn;
}

function buildMemory(params: {
  entry: ChatEntry;
  persona: ChatPersona;
  assistantText: string;
  cards: RecoCard[];
}) {
  const { entry, persona, assistantText, cards } = params;
  return {
    entryId: entry.id,
    entryNameJa: entry.nameJa,
    entryNameEn: entry.nameEn,
    personaId: persona.id,
    personaNameJa: persona.nameJa,
    personaNameEn: persona.nameEn,
    residue: assistantText.slice(0, 120),
    cardTitle: cards[0]?.title ?? null,
    timestamp: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const trace = Math.random().toString(36).slice(2);
  try {
    const parsed = BodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, v: 3, error: "invalid_body", trace });
    }

    const { entryId, lang, messages } = parsed.data;
    const entry = getChatEntry((entryId as ChatEntryId | undefined) || "dream-sign");
    if (!entry) {
      return res.status(400).json({ ok: false, v: 3, error: "invalid_entry", trace });
    }
    const persona = getChatPersona(entry.persona);
    if (!persona) {
      return res.status(500).json({ ok: false, v: 3, error: "persona_missing", trace });
    }

    const userTurns = countUserTurns(messages);
    if (userTurns === 0) {
      const assistantText = lang === "ja" ? entry.openingJa : entry.openingEn;
      return res.status(200).json({
        ok: true,
        v: 3,
        assistantText,
        cards: [],
        stage: "open",
        entry,
        persona,
        memory: buildMemory({ entry, persona, assistantText, cards: [] }),
        trace,
      });
    }

    const works = await loadWorks();
    const query = lastUserText(messages);
    const conversation = userTextBlob(messages);
    const distress = isDistressText(conversation);
    const desiredType = extractDesiredType(conversation, entry);
    const readiness = recommendationReadiness({ entry, query, conversation, userTurns, distress });
    const stage = pickStage({ entry, userTurns, query, conversation, distress, readiness });

    const seed = `${trace}|${entry.id}|${userTurns}|${conversation}`;
    const { cards, picked } =
      stage === "offer"
        ? pickTopCards({
            works,
            desiredType,
            queryText: conversation || query,
            count: entry.maxCards,
            seed,
          })
        : { cards: [] as RecoCard[], picked: [] as Work[] };

    const effectiveStage: Stage = stage === "offer" && cards.length === 0 ? "reflect" : stage;

    const system = buildSystemPrompt({
      entry,
      persona,
      lang,
      stage: effectiveStage,
      userTurns,
      picked,
      distress,
    });

    const llmResult = await callLlm({ system, messages, trace });
    const assistantText = llmResult.ok && llmResult.text
      ? llmResult.text.trim()
      : fallbackResponse({ entry, persona, lang, stage: effectiveStage, query, conversation, cards });

    return res.status(200).json({
      ok: true,
      v: 3,
      assistantText,
      cards: effectiveStage === "offer" ? cards.slice(0, entry.maxCards) : [],
      stage: effectiveStage,
      entry,
      persona,
      memory: buildMemory({
        entry,
        persona,
        assistantText,
        cards: effectiveStage === "offer" ? cards.slice(0, entry.maxCards) : [],
      }),
      provider: llmResult.provider,
      ...(process.env.NODE_ENV !== "production"
        ? {
            debug: {
              tried: llmResult.tried ?? [],
              providerError: llmResult.error ?? null,
            },
          }
        : {}),
      trace,
    });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ ok: false, v: 3, error: err?.message ?? "failed", trace });
  }
}
