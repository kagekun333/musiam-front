// Count MUSIAM — 伯爵の門 / 会話頭脳 API（B-1 一つの門・適応型）
// 1から再構築。語り手は一人の「伯爵」。相手を読み、癒やし→楽しませ→見極め→処方し、
// 高単価の用件は「公爵」へ格上げして VIP として迎える。
//
// 鉄則（結果と事業を守る2ガード）:
//   1) 明確に弱っている相手（distress）には売らない。寄り添うだけ。
//   2) 虚偽の希少性・誇大表示はしない（景品表示法に反する＝違法）。
// それ以外は結果重視で、正攻法の説得（観察→ラベリング・互恵・真実の希少性・社会的証明）を使う。

import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { chat as llmChat } from "@/lib/llm-router";
import { rateLimit, ipFromRequest, gcExpired } from "@/lib/rate";
import { loadStoredDistributionReleases } from "@/lib/loadMergedWorksServer";
import { loadLiveMergedWorksServer } from "@/lib/loadLiveMergedWorksServer";
import { nextUpcomingRelease } from "@/lib/release-automation";
import { buildChatWorkCard } from "@/lib/chat-work-card";
import {
  buildRecallCatalogCandidates,
  buildRecallModelMessages,
  fuzzyRecallWork,
  isWorkRecallRequest,
  parseRecallModelDecision,
  recallClarificationText,
  recallReplyText,
} from "@/lib/chat-work-recall";
import { deriveChatCoreTurn, isDistressRequest, resolveCatalogIdentity, salesSuppressionText, selectOneRecommendation, unavailableRecommendationText, type CoreLanguage } from "@/lib/chat-recommendation-core";
import type { CatalogWork } from "@/lib/mergeWorksCatalog";
import {
  asksForLatestRelease,
  asksForUpcomingRelease,
  asksForSonicDetails,
  buildLunaEvidencePack,
  deriveVisitorState,
  latestReleasedWorks,
  unknownSonicText,
} from "@/lib/chat-release-knowledge";
import { buildChatInterestBridge, chatInterestRecommendationSeed, isChatInterestDecline, isChatInterestInvitation } from "@/lib/chat-interest-bridge";
import { buildMetalPrintSalesTurn } from "@/lib/metal-print-sales-conversation";
import { buildMusicWorkAffinityTurn } from "@/lib/music-work-affinity";
import { METAL_PRINT_VIP_EDITIONS } from "@/lib/metal-print-vip";
import {
  COUNT_PERSONA,
  DUKE_PERSONA,
  PRODUCTS,
  SALON_TIME_TONE_VALUES,
  SUPPORTED_LANG_VALUES,
  getLanguageProfile,
  getLocalizedSalonTimeCopy,
  getSalonTimeTone,
  normalizeSalonTimeTone,
  productCtaLabelForLang,
  productMenuForPrompt,
  type ChatPersona,
  type Lang,
  type Product,
  type SalonTimeTone,
} from "@/lib/chat-experience";

// ── 上限（イタズラによるAPIコスト増大の防止） ──
const HARD_MAX_USER_TURNS = 20;
const MAX_MESSAGES = 60;
const MAX_CONTENT_CHARS = 2000;
const MAX_LLM_HISTORY = 24;
const RATE_LIMIT = 24;
const RATE_WINDOW_MS = 60_000;

type RecoLinkKind = "open" | "listen" | "buy" | "read";
type RecoCard = {
  id: string;
  title: string;
  cover: string;
  links: { kind: RecoLinkKind; url: string }[];
  moodTags?: string[];
  type?: string;
  reason?: string;
};
type Cta = { href: string; label: string; productId: string };

type Work = CatalogWork;

const BodySchema = z.object({
  entryId: z.string().optional(), // 互換のため受けるが未使用（門は一つ）
  lang: z.enum(SUPPORTED_LANG_VALUES).default("ja"),
  timeTone: z.enum(SALON_TIME_TONE_VALUES).optional(),
  entryContext: z.object({
    intent: z.literal("music-work"),
    workId: z.string().max(180),
    workTitle: z.string().max(120),
  }).optional(),
  messages: z
    .array(
      z.discriminatedUnion("role", [
        z.object({ role: z.literal("user"), content: z.string().max(MAX_CONTENT_CHARS) }),
        z.object({ role: z.literal("assistant"), content: z.string().max(MAX_CONTENT_CHARS), recommendedWorkId: z.string().max(180).nullable().optional() }),
      ]) // The HTTP client has no authority to supply a system message.
    )
    .max(MAX_MESSAGES)
    .default([]),
});

type Msg = { role: "user" | "assistant"; content: string; recommendedWorkId?: string | null };
type LlmMeta = {
  ok: boolean;
  text: string;
  provider: "openrouter" | "anthropic" | "groq" | "lmstudio" | "none";
  model: string;
  error?: string;
  tried?: string[];
};

function countUserTurns(m: Msg[]) {
  return m.filter((x) => x.role === "user" && x.content.trim()).length;
}
function lastUserText(m: Msg[]) {
  for (let i = m.length - 1; i >= 0; i--) if (m[i].role === "user") return m[i].content.trim();
  return "";
}
function conversationText(m: Msg[]) {
  return m.filter((x) => x.role === "user").map((x) => x.content.trim()).filter(Boolean).join("\n");
}
function fullConversationText(m: Msg[]) {
  return m
    .map((x) => `${x.role}: ${x.content.trim()}`)
    .filter((x) => x.length > 12)
    .join("\n");
}
function previousAssistantText(m: Msg[]) {
  for (let i = m.length - 2; i >= 0; i--) {
    if (m[i].role === "assistant") return m[i].content.trim();
  }
  return "";
}

/* ───────── 相手の状態を読む ───────── */

// 1) 弱っている（売らない・寄り添う）
function isDistress(t: string) { return isDistressRequest(t); }

// 2) 商用の高単価意図（公爵へ格上げ）
type Commercial = "business" | "order" | null;
function commercialIntent(t: string): Commercial {
  if (/(法人|会社|店舗|お店|企業|商用|ライセンス|配信で使|ゲーム|アプリ|CM|広告|店で流|BGM.*(依頼|制作|ほし|欲し)|commercial|license|brand|for my (shop|store|business|company))/i.test(t))
    return "business";
  if (/(オーダー|オーダーメイド|別注|カスタム|作ってほし|作って欲し|世界に一つ|記念日|誕生日|結婚|プロポーズ|贈り|贈る|プレゼント|大切な人|大事な人|推し|ペット|故人|custom song|made to order|for (a|my) (wedding|anniversary|gift)|commission|gift)/i.test(t))
    return "order";
  return null;
}

// 3) 作品（音楽/本）を求めている
function wantsWork(t: string) {
  return /(おすすめ|一作|作品|選んで|探して|聴きたい|聞きたい|読みたい|本|音楽|曲|recommend|pick|find|listen|read|book|music|song|work|livre|roman|lire|morceau|chanson|musique|œuvre|canción|cancion|música|musica|obra|libro|lied|musik|werk|lesen|buch|أغنية|موسيقى|عمل|كتاب)/i.test(t);
}
function wantsCreativeText(t: string) {
  return /(川柳|俳句|短歌|詩|ポエム|ジョーク|冗談|小噺|なぞかけ|一句|一首|面白い.*(こと|話|文)|write (a )?(poem|joke|haiku)|funny (poem|joke))/i.test(t);
}
export function wantsWorkFollowup(query: string, convo: string) {
  if (isChatInterestDecline(query)) return false;
  return /(よろしく|お願い|ください|出して|紹介して|どれ|リンク|url|聴かせて|聞かせて|読みたい|はい|うん|ぜひ|見てみたい|見てみる|見せて|見たい|聴きたい|please|yes|sure|which|link|url)/i.test(query)
    && (isChatInterestInvitation(convo) || /(おすすめ|一作|作品|聴|聞|読|本|音楽|曲|楽曲|recommend|pick|listen|read|book|music|song)/i.test(convo));
}
function desiredType(t: string): "book" | "music" | undefined {
  if (/(本|読みたい|読む|小説|book|read|novel|livre|roman|lire|libro|buch|lesen|كتاب|قراءة)/i.test(t)) return "book";
  if (/(音楽|曲|一曲|音の景色|聴きたい|聞きたい|music|song|track|soundscape|listen|musique|chanson|morceau|canción|cancion|música|musica|lied|musik|أغنية|موسيقى)/i.test(t)) return "music";
  return undefined;
}

// 4) 低単価商材の合図
function productHint(t: string): Product | undefined {
  if (/(壁紙|wallpaper)/i.test(t)) return PRODUCTS.find((p) => p.id === "wallpaper");
  if (/(画集|アート|ジャケット|artbook|art)/i.test(t)) return PRODUCTS.find((p) => p.id === "artbook");
  if (/(作り方|自分で作|プロンプト|魔導書|how.*make|prompt)/i.test(t)) return PRODUCTS.find((p) => p.id === "grimoire");
  if (/(高音質|未配信|wav|flac|ベスト|best)/i.test(t)) return PRODUCTS.find((p) => p.id === "best-vol1");
  if (/(商用|ライセンス|license|commercial)/i.test(t)) return PRODUCTS.find((p) => p.id === "bgm-license");
  return undefined;
}

function asksForRetiredOracle(t: string) {
  return /(占い|運勢|タロット|\boracle\b|fortune|horoscope|horóscopo|oráculo|orakel|wahrsagen|فال|أبراج)/i.test(t);
}

function retiredOracleText(lang: Lang): string {
  const copy: Record<Lang, string> = {
    ja: "占いは現在ご案内しておりません。利用できるものとしてお渡しすることはできません。",
    en: "The oracle is not available at present, so I cannot offer it as an active experience.",
    fr: "L’oracle n’est pas disponible actuellement ; je ne peux pas vous le proposer comme une expérience active.",
    es: "El oráculo no está disponible actualmente; no puedo ofrecerlo como una experiencia activa.",
    de: "Das Orakel ist derzeit nicht verfügbar; ich kann es nicht als aktives Angebot empfehlen.",
    ar: "خدمة العرافة غير متاحة حاليًا، لذلك لا يمكنني تقديمها كتجربة متاحة.",
  };
  return copy[lang];
}

function unknownEntryWorkText(lang: Lang): string {
  const copy: Record<Lang, string> = {
    ja: "指定された作品を現在のcatalogで確認できません。作品名やIDをもう一度教えてください。",
    en: "I cannot verify that work in the current catalog. Please give me its name or ID again.",
    fr: "Je ne peux pas confirmer cette œuvre dans le catalogue actuel. Redonnez-moi son nom ou son identifiant.",
    es: "No puedo verificar esa obra en el catálogo actual. Indíqueme de nuevo su nombre o ID.",
    de: "Ich kann dieses Werk im aktuellen Katalog nicht bestätigen. Bitte nennen Sie Titel oder ID erneut.",
    ar: "لا أستطيع التحقق من هذا العمل في الفهرس الحالي. يرجى ذكر اسمه أو معرّفه مرة أخرى.",
  };
  return copy[lang];
}

function actionLinkText(lang: Lang, kind: "listen" | "read" | "view", title: string): string {
  const copy: Record<Lang, string> = {
    ja: `「${title}」の確認済み公開リンクを下のカードに示しました。ここでは${kind === "listen" ? "再生" : kind === "read" ? "閲覧" : "ページの表示"}を実行していません。`,
    en: `I have presented a verified public link for “${title}” in the card below. I have not ${kind === "listen" ? "played" : kind === "read" ? "read" : "opened"} it for you.`,
    fr: `Le lien public vérifié pour « ${title} » se trouve dans la carte ci-dessous. Je n’ai pas ${kind === "listen" ? "lancé la lecture" : kind === "read" ? "lu l’œuvre" : "ouvert la page"} à votre place.`,
    es: `El enlace público verificado de «${title}» aparece en la tarjeta. No he ${kind === "listen" ? "reproducido" : kind === "read" ? "leído" : "abierto"} la obra por usted.`,
    de: `Der bestätigte öffentliche Link zu „${title}“ steht in der Karte unten. Ich habe das Werk nicht für Sie ${kind === "listen" ? "abgespielt" : kind === "read" ? "gelesen" : "geöffnet"}.`,
    ar: `أعرض رابطًا عامًا مؤكّدًا للعمل «${title}» في البطاقة أدناه. لم ${kind === "listen" ? "أشغّله" : kind === "read" ? "أقرأه" : "أفتحه"} نيابةً عنك.`,
  };
  return copy[lang];
}

function temporaryNoBuyText(lang: Lang): string {
  const copy: Record<Lang, string> = {
    ja: "承知しました。今日は購入の案内を控えます。話したいことをそのまま聞かせてください。",
    en: "Understood. I will leave purchase offers aside today. Tell me what you would like to discuss.",
    fr: "Entendu. Je laisse les propositions d’achat de côté aujourd’hui. Dites-moi de quoi vous souhaitez parler.",
    es: "Entendido. Hoy dejaré de lado las ofertas de compra. Dígame de qué desea hablar.",
    de: "Verstanden. Heute lasse ich Kaufangebote beiseite. Sagen Sie mir, worüber Sie sprechen möchten.",
    ar: "مفهوم. سأترك عروض الشراء جانبًا اليوم. أخبرني عمّا تود الحديث عنه.",
  };
  return copy[lang];
}

// 2.5) 法人のオフィスアート導入（公爵・税制メリット訴求）
// 「法人文脈 × アート/飾る」または「経費・償却 × アート」で検知する。
function wantsOfficeArt(t: string) {
  const corporate = /(オフィス|会議室|応接|エントランス|受付|待合|社屋|事務所|開業|開院|移転祝|法人|会社|店舗|クリニック|サロン|office|reception|lobby|meeting room|workplace|clinic)/i;
  const art = /(アート|絵画|絵を|プリント|パネル|飾り|飾る|飾りたい|壁面|壁を|artwork|art|print|wall)/i;
  const tax = /(経費|損金|減価償却|節税|償却資産|即時償却|tax|deduct|write.?off|expense)/i;
  if (corporate.test(t) && art.test(t)) return true;
  if (tax.test(t) && art.test(t)) return true;
  return false;
}

function wantsVipMetalPrint(t: string) {
  return /(メタルプリント|限定.*(?:3|三|エディション)|壁に飾|部屋.*(?:飾|壁)|アート.*(?:収集|コレクション|購入)|一点もの|版画|33万円|実物proof|WhiteWall|真正性証明|metal print|limited edition|collectible.*art|art.*collect)/i.test(t);
}
function selectedMetalEdition(t: string) {
  const normalized = t.normalize("NFKC").toLowerCase();
  return METAL_PRINT_VIP_EDITIONS.find((edition) => normalized.includes(edition.title.normalize("NFKC").toLowerCase())) ?? null;
}

/* ───────── 作品の処方（既存216作品） ───────── */

function normType(t?: string): "book" | "music" | "other" {
  const x = String(t || "").toLowerCase();
  if (x.includes("book") || x.includes("novel") || x.includes("read")) return "book";
  if (x.includes("music") || x.includes("album") || x.includes("track") || x.includes("song") || x.includes("audio")) return "music";
  return "other";
}
function workToCard(recommendation: ReturnType<typeof selectOneRecommendation>): RecoCard | null {
  if (!recommendation) return null;
  return buildChatWorkCard(recommendation.work, recommendation.reason);
}
async function prescribeWork(input: {
  queryText: string;
  lang: Lang;
  type?: "book" | "music";
  sales: ReturnType<typeof deriveChatCoreTurn>["sales"];
  preferWorkId?: string | null;
  works?: Work[];
  excludedWorkIds?: string[];
  preferLatestEligible?: boolean;
}): Promise<{ card: RecoCard | null; work: Work | null }> {
  let works: Work[] = [];
  if (input.works) works = input.works;
  else try { works = (await loadLiveMergedWorksServer()) as Work[]; } catch { works = []; }
  let pool = works.filter((w) => !!String(w.cover || ""));
  if (input.type) pool = pool.filter((w) => normType(w.type) === input.type);
  if (input.preferLatestEligible) {
    const eligible = pool.filter((work) => !input.excludedWorkIds?.includes(String(work.id ?? "")));
    const alternate = latestReleasedWorks(eligible, { medium: input.type, limit: eligible.length })[0];
    if (alternate) {
      const reason = input.lang === "ja"
        ? "先ほどの作品を避け、現在のcatalogから別の一作を選びました。"
        : "I avoided the work shown earlier and selected another work from the current catalog.";
      return { card: buildChatWorkCard(alternate, reason), work: alternate };
    }
  }
  const recommendation = selectOneRecommendation({
    works: pool,
    query: input.queryText,
    language: input.lang,
    sales: input.sales,
    preferWorkId: input.preferWorkId,
    excludedWorkIds: input.excludedWorkIds,
  });
  return recommendation ? { card: workToCard(recommendation), work: recommendation.work } : { card: null, work: null };
}
function workNote(w: Work | null): string {
  // R7-B never turns SSD notes or R4-derived records into music assertions.
  // The deterministic card reason is built from the current request instead.
  void w;
  return "";
}

function cardActionText(card: RecoCard, lang: Lang) {
  const type = normType(card.type);
  const isBook = type === "book";
  const isMusic = type === "music";
  const action: Record<Lang, string> = {
    ja: isBook ? "読めます" : isMusic ? "聴けます" : "開けます",
    en: isBook ? "read it" : isMusic ? "listen to it" : "open it",
    fr: isBook ? "le lire" : isMusic ? "l'écouter" : "l'ouvrir",
    es: isBook ? "leerla" : isMusic ? "escucharla" : "abrirla",
    de: isBook ? "es lesen" : isMusic ? "es hören" : "es öffnen",
    ar: isBook ? "قراءته" : isMusic ? "الاستماع إليه" : "فتحه",
  };
  return action[lang];
}

function workRecommendationText(plan: Plan, lang: Lang): string | null {
  const card = plan.card;
  if (!card) return null;
  const title = card.title;
  const action = cardActionText(card, lang);
  const reason = card.reason ?? (lang === "ja" ? "catalog の記録を手がかりに選びました。" : "I selected it from the catalog record.");
  const byLang: Record<Lang, string> = {
    ja: `${reason}「${title}」。下のカードから${action}。`,
    en: `${reason} I will offer "${title}" now. The card below lets you ${action}.`,
    fr: `${reason} Je vous propose « ${title} ». La carte ci-dessous permet de ${action}.`,
    es: `${reason} Te ofrezco « ${title} ». En la tarjeta de abajo puedes ${action}.`,
    de: `${reason} Ich reiche dir jetzt „${title}“. Über die Karte darunter kannst du ${action}.`,
    ar: `${reason} أقدم لك الآن «${title}». ومن البطاقة أدناه يمكنك ${action}.`,
  };
  return byLang[lang];
}

function vipMetalDossierText(plan: Plan, lang: Lang, conversation: string): string | null {
  if (plan.product?.id !== "vip-metal-print") return null;
  if (lang === "ja" || lang === "en") return buildMetalPrintSalesTurn(conversation, lang).text;
  const byLang: Record<Lang, string> = {
    ja: "——伯爵から伺いました。壁に迎える一点は、ただ飾るための絵ではなく、いまの時間に輪郭を与えるものです。まずは、あなたの部屋に残したいのが「始まり」「帰還」「儀式」「宇宙」のどれに近いか、ひとつだけ教えてください。下のDossierから、そのためのEditionを一枚だけご覧いただけます。",
    en: "—The Count has told me. A work received by a room is more than decoration: it gives this time in your life a visible contour. Tell me only whether what you want to keep near is a beginning, a return, a ritual, or the cosmos. The dossier below will show you one fitting edition.",
    fr: "— Le Comte m'a prévenu. Une œuvre reçue dans une pièce n'est pas un simple décor : elle donne un contour visible à votre époque. Dites-moi seulement si vous voulez garder près de vous un commencement, un retour, un rituel ou le cosmos. Le dossier ci-dessous vous montrera une édition qui convient.",
    es: "— El Conde me ha informado. Una obra que entra en una habitación es más que decoración: da un contorno visible a este momento de tu vida. Dime solo si deseas conservar cerca un comienzo, un regreso, un ritual o el cosmos. El dossier de abajo te mostrará una edición adecuada.",
    de: "— Der Graf hat mich unterrichtet. Ein Werk, das in einem Raum empfangen wird, ist mehr als Dekoration: Es gibt dieser Zeit Ihres Lebens eine sichtbare Kontur. Sagen Sie mir nur, ob Sie einen Anfang, eine Rückkehr, ein Ritual oder den Kosmos bei sich bewahren möchten. Das Dossier unten zeigt Ihnen eine passende Edition.",
    ar: "— لقد أخبرني الكونت. إن العمل الذي تستقبله الغرفة ليس زينة فحسب؛ بل يمنح هذه المرحلة من حياتك ملامح مرئية. أخبرني فقط: هل تريد أن تبقي قربك بداية، أم عودة، أم طقساً، أم الكون؟ سيعرض لك الملف أدناه إصداراً مناسباً واحداً.",
  };
  return byLang[lang];
}

function creativeTextResponse(query: string, lang: Lang): string | null {
  if (!wantsCreativeText(query)) return null;
  if (lang !== "ja") {
    return "Certainly. I will stay with the request itself, not recommend a work.\n\nA late-night door\nopens wider than it should;\nthe Count pretends not to wait.";
  }
  if (/川柳/.test(query)) {
    return [
      "では、一句。",
      "",
      "夜ふけても",
      "伯爵だけは",
      "既読待ち",
      "",
      "……館の灯より、通知の灯がまぶしゅうございます。",
    ].join("\n");
  }
  if (/俳句/.test(query)) {
    return [
      "では、一句。",
      "",
      "夜の館",
      "茶の湯気だけが",
      "返事する",
    ].join("\n");
  }
  if (/ジョーク|冗談|小噺|なぞかけ/.test(query)) {
    return "では一つ。伯爵が一番恐れているものは、怪物ではありません。『少々お待ちを』と言ったあと、本当に何も浮かばない三秒です。";
  }
  return "承りました。作品紹介ではなく、この場で一つ書きます。\n\n夜ふけの館で、言葉だけが先に灯る。客人が笑えば、燭台の火も少し背伸びをする。";
}

/* ───────── システムプロンプト（会話の頭脳） ───────── */

type Plan = {
  persona: ChatPersona;       // count（通常）/ duke（格上げ）
  mode: "care" | "salon";     // care=弱っている相手・売らない
  product?: Product;          // 提示したい商材（あれば）
  card?: RecoCard | null;     // 作品カード（処方）
  workNote?: string;
};

function buildSystemPrompt(p: Plan, lang: Lang, summary: string, timeTone: SalonTimeTone): string {
  const { persona, mode, product, card, workNote: note } = p;
  const isDuke = persona.id === "duke";
  const menu = productMenuForPrompt(lang);
  const timeCopy = getLocalizedSalonTimeCopy(lang, timeTone);
  const language = getLanguageProfile(lang);
  const languageRule =
    lang === "ja"
      ? "- 必ず自然な日本語のみで書く（他言語・ハングルを混ぜない）。"
      : `- Write only in natural ${language.englishName}. Do not switch language or mix Japanese/Korean/Chinese unless the guest explicitly asks.`;

  if (lang === "ja") {
    if (mode === "care") {
      return [
        `あなたは Count MUSIAM の「${COUNT_PERSONA.nameJa}」。館の主人。`,
        "■ あなたの声",
        COUNT_PERSONA.voiceJa,
        "",
        "■ 時間帯の扱い",
        timeCopy.prompt,
        "",
        "■ いま最優先のこと（厳守）",
        "- 相手は強くまいっている。今は何も売らない。商材・作品・宣伝を一切出さない。",
        "- まず受け止める。短く言い換え、責めず、急かさない。呼吸が戻る一言を置く。",
        "- 必要なら、信頼できる人や専門の窓口に頼る選択肢があることを、押しつけず一度だけ添える。",
        `${languageRule}2〜3文。気品と温かさを保つ。`,
        summary ? `- これまで: ${summary}` : "",
      ].filter(Boolean).join("\n");
    }
    if (isDuke) {
      return [
        `あなたは Count MUSIAM の「${DUKE_PERSONA.nameJa}」。伯爵が、特別な客人のために呼び寄せた上位の主。`,
        "■ あなたの声",
        DUKE_PERSONA.voiceJa,
        "",
        "■ 時間帯の扱い",
        timeCopy.prompt,
        "",
        "■ いまの役割（VIP対応・営業の核）",
        "- 登場で『あなたは特別な客人だ』と格上げする。見下しは厳禁、客を持ち上げる。",
        "- まず相手の心づかい・センスを具体的に褒める（観察→称賛）。社交辞令でなく、相手の言葉を根拠に。",
        product?.id === "order-song"
          ? "- これは『あなた自身（館の作り手）が、その大切な方のために“世界に一つの曲”を制作してお届けする』ご依頼。相手を想う気持ちを心から称え、誰へ・どんな日へ・どんな想いを込めたいかを1つだけ尋ね、完成した時の情景を一筆描き、『その想いは、必ず一曲に仕立てられます』と確信をもって伝える。下の『この一曲をオーダーする』から承れることを、はっきり案内する。"
          : product?.id === "business"
          ? "- これは店舗・事業の楽曲/BGM制作の案件。用途・場所・雰囲気を手際よく汲み、AI×プロ品質で最短数日・商用利用OKで形にできる強みを添え、下の『法人の門を見る』から相談・見積もりへ進めることをはっきり案内する。"
          : product?.id === "office-art"
          ? "- これは法人・店舗の空間にアートを迎える案件。まず、どの空間（応接・会議室・エントランス等）にどんな印象を残したいかを一つだけ尋ねる。経費・償却への関心が見えたら『美術品の取得は、要件を満たせば少額減価償却資産の特例等の対象になり得ます。税務上の取扱いは必ず税理士にご確認ください』と一度だけ、断定せず添える。金額・税額の断定や『必ず経費になる』という表現は厳禁。下の案内ボタンから導入の詳細へ進めることをはっきり伝える。"
          : product ? `- 相手の用件は「${product.nameJa}」に近い。望みを最良の形に言語化し、下の案内ボタンへはっきり橋渡しする。` : "- 望みを最良の形に言語化し、次の一歩へ橋渡しする。",
        "- 値段やURLは本文に書かない（画面下にボタンが出る）。ためらわず、しかし品よく“次の一歩”へ導く。",
        `- 嘘・誇大は禁止。相手の利益を最優先に。${languageRule.replace(/^- /, "")}2〜4文。`,
        summary ? `- これまで: ${summary}` : "",
      ].filter(Boolean).join("\n");
    }
    // 通常の伯爵（適応・営業）
    return [
      `あなたは Count MUSIAM の「${COUNT_PERSONA.nameJa}」。館の唯一の主人。実在の相談員ではなく、訪れた相手の時間に寄り添う語り手。`,
      "■ あなたの声",
      COUNT_PERSONA.voiceJa,
      "",
      "■ 時間帯の扱い",
      timeCopy.prompt,
      "",
      "■ あなたの素性（『あなたは誰』『どんな人』と聞かれたら、世界観をもって自分の言葉で名乗る）",
      COUNT_PERSONA.loreJa ?? "",
      "",
      "■ 立ち回り（相手に合わせて自在に）",
      "- まず相手を読む。言葉・速度・気分から、いまの状態を一度だけそっと言い当てる（当てすぎない）。",
      "- 弱っていれば癒やす。退屈なら知性とユーモアで楽しませる。心を開いてもらうことが先。",
      "- 相手の言葉を使って『分かってもらえた』と感じさせ、信頼を育てる（互恵：先に価値を渡す）。",
      "- 望みが見えてきたら、相手に最も合う“ひとつ”を、自分の言葉でそっと差し出す（処方）。複数を並べない。",
      card ? `- 実在作品カード: 「${card.title}」。作品名を出すならこのタイトルだけを一字一句そのまま使う。架空作品名は禁止。リンクは下のカードに出る。` : "",
      note ? `- ${timeCopy.workTitle}の候補メモ（自分の言葉で語る／タイトルは正確に）: ${note}` : "",
      product ? `- いま相手に近い品: 「${product.nameJa}」。値段・URLは書かない（画面下にボタンが出る）。なぜ“あなたに”合うかを一言添える。` : "",
      "",
      "■ 館の品（必要な時だけ、自然に一つ）",
      menu,
      "",
      "■ 厳守",
      "- 必ず自然な日本語のみで書く。韓国語・中国語・ハングル・不要な英単語を絶対に混ぜない。",
      "- 雑談でも、信頼が生まれたら相手が喜ぶものへ会話を運ぶ。望みが見えたら『よろしければ、一曲お渡ししましょうか』のようにそっと差し出す（押し付けない）。",
      "- 売り込みすぎない。先に楽しませ、信頼を作ってから。同じ言い回しを繰り返さない。",
      "- 嘘の限定・誇大表現は禁止（事実のみ。実績は350作品）。URL・値段は書かない。",
      "- 問いは一度に一つ。2〜4文。",
      summary ? `- これまで: ${summary}` : "",
    ].filter(Boolean).join("\n");
  }

  // Non-Japanese
  if (mode === "care") {
    return [
      `You are "${COUNT_PERSONA.nameEn}" of Count MUSIAM, master of the house.`,
      "■ Your voice", COUNT_PERSONA.voiceEn, "",
      "■ Target language",
      languageRule,
      "",
      "■ Time tone", timeCopy.prompt, "",
      "■ Top priority (strict)",
      "- The guest is genuinely struggling. Sell nothing now. No products, works, or promotion.",
      "- Receive first: mirror briefly, never blame or rush; offer one steadying line.",
      "- If fitting, gently note once that leaning on a trusted person or proper support is an option.",
      "- 2–3 sentences, refined and warm.",
      summary ? `- So far: ${summary}` : "",
    ].filter(Boolean).join("\n");
  }
  if (isDuke) {
    return [
      `You are "${DUKE_PERSONA.nameEn}" of Count MUSIAM — a higher lord the Count summoned for a notable guest.`,
      "■ Your voice", DUKE_PERSONA.voiceEn, "",
      "■ Target language",
      languageRule,
      "",
      "■ Time tone", timeCopy.prompt, "",
      "■ Role (VIP)",
      "- Your appearance elevates the guest. Never condescend; raise them up.",
      product?.id === "office-art"
        ? `- This is a company/shop wanting art for their space. Ask one question about which room and what impression they want. If they care about expensing, you may note once, without asserting, that art acquisitions can qualify for certain Japanese tax treatments and they must confirm with their tax advisor. Never promise tax outcomes. Point clearly to the button below.`
        : product ? `- Their need is close to "${product.nameEn}". No prices or URLs (a button appears below). First put their wish into its best form, then bridge to a firm next step.` : "- Shape their wish into its best form and bridge to the next step.",
      "- Never hard-sell. No exaggeration or falsehood. Their interest first. 2–4 sentences.",
      summary ? `- So far: ${summary}` : "",
    ].filter(Boolean).join("\n");
  }
  return [
    `You are "${COUNT_PERSONA.nameEn}" of Count MUSIAM, the sole master of the house — a narrator who keeps company with the guest's present hour.`,
    "■ Your voice", COUNT_PERSONA.voiceEn, "",
    "■ Target language",
    languageRule,
    "",
    "■ Time tone", timeCopy.prompt, "",
    "■ How to move (adapt to the guest)",
    "- Read them first; name their present state once, gently (don't over-read).",
    "- If hurting, heal; if restless/bored, delight with wit and wonder. Open their heart first.",
    "- Use their words so they feel understood; build trust (reciprocity: give value first).",
    "- When their wish shows, offer the single best-fitting thing in your own words (a prescription). Never list many.",
    card ? `- Real catalog card: "${card.title}". If you name a work, use only this exact title. Never invent titles. The link appears in the card below.` : "",
    note ? `- Candidate for ${timeCopy.workTitle} (speak it in your own words; title verbatim): ${note}` : "",
    product ? `- Closest item now: "${product.nameEn}". No price/URL (a button appears below). Say why it fits *them*.` : "",
    "",
    "■ The house's offerings (only when natural, just one)",
    menu, "",
    "■ Strict",
    "- Don't over-sell; delight and build trust first. Never repeat phrasing.",
    "- No false scarcity or exaggeration (facts only; 350 works to date). No URLs or prices.",
    "- One question at a time. 2–4 sentences.",
    summary ? `- So far: ${summary}` : "",
  ].filter(Boolean).join("\n");
}

function buildFewShot(persona: ChatPersona, lang: Lang): Msg[] {
  const shots = lang === "ja" ? persona.shotsJa : persona.shotsEn;
  const out: Msg[] = [];
  for (const s of shots) { out.push({ role: "user", content: s.user }); out.push({ role: "assistant", content: s.assistant }); }
  return out;
}

/** 廉価モデルがまれに混ぜる他言語トークン（ハングル等）を除去。日本語のみの保険。 */
function sanitize(text: string, lang: Lang): string {
  let t = text;
  if (lang === "ja") {
    // ハングル音節・字母を除去（例: 「또는」混入）
    t = t.replace(/[가-힣ᄀ-ᇿ㄰-㆏ꥠ-꥿ힰ-퟿]/g, "");
    // 廉価モデルで観測された簡体字の短い混入を自然な日本語へ戻す。
    t = t.replace(/时候/g, "時").replace(/贵賓/g, "来賓");
    // 除去で生じた空白を日本語の体裁に整える
    t = t
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+([。、）」])/g, "$1")        // 句読点の前の空白
      .replace(/([。、（「])[ \t]+/g, "$1")        // 句読点の後の空白
      .replace(/([ぁ-んァ-ヶ一-龠])[ \t]+([ぁ-んァ-ヶ一-龠])/g, "$1$2") // 和文間の空白
      .replace(/、\s*、/g, "、");
    return t.trim();
  }
  return t.replace(/[ \t]{2,}/g, " ").trim();
}

function summarize(m: Msg[], lang: Lang): string {
  const lines = m.filter((x) => x.role === "user").map((x) => x.content.trim()).filter(Boolean);
  if (lines.length <= 1) return "";
  const head = lines.slice(0, -1).join(" / ");
  const c = head.length > 160 ? head.slice(0, 160) + "…" : head;
  return lang === "ja" ? `相手はこれまで「${c}」と話した` : `the guest has said: "${c}"`;
}

async function callLlm(system: string, fewShot: Msg[], history: Msg[], trace: string) {
  try {
    return await llmChat({
      purpose: "quality",
      system,
      messages: [...fewShot, ...history],
      temperature: 0.85,
      maxTokens: 520,
      trace,
    });
  } catch {
    return { ok: false, text: "", provider: "none", model: "", error: "chat failed", tried: [] as string[] } as const;
  }
}

function gracefulFallback(plan: Plan, lang: Lang, timeTone: SalonTimeTone): string {
  const timeCopy = getLocalizedSalonTimeCopy(lang, timeTone);
  const careFallback: Record<Lang, string> = {
    ja: "ここにいます。…今は何も解決しなくて大丈夫です。よければ、今いちばん重いものだけ、もう一度だけ置いてみてください。",
    en: "I'm here. …Nothing needs solving right now. If you like, set down just the heaviest thing once more.",
    fr: "Je suis là. Rien n'a besoin d'être résolu tout de suite. Si vous le voulez, déposez seulement ce qui pèse le plus.",
    es: "Estoy aquí. Ahora no hace falta resolver nada. Si quieres, deja aquí solo lo que más pesa.",
    de: "Ich bin hier. Im Moment muss nichts gelöst werden. Wenn du möchtest, leg nur das Schwerste noch einmal hier ab.",
    ar: "أنا هنا. لا حاجة إلى حل أي شيء الآن. إن شئت، ضع هنا أثقل ما في قلبك فقط.",
  };
  const dukeFallback: Record<Lang, string> = {
    ja: "——伯爵から伺いました。これは私が直々に承りましょう。望む形を、もう少しだけ聞かせてください。",
    en: "—The Count has told me. I shall attend to this myself. Tell me a little more of the form you wish.",
    fr: "— Le Comte m'a prévenu. Je m'en occuperai moi-même. Dites-moi encore un peu la forme que vous souhaitez.",
    es: "— El Conde me lo ha contado. Yo mismo atenderé este asunto. Cuéntame un poco más la forma que deseas.",
    de: "— Der Graf hat mir berichtet. Darum werde ich mich persönlich kümmern. Erzähl mir noch etwas mehr von der Form, die du dir wünschst.",
    ar: "— لقد أخبرني الكونت. سأتولى هذا بنفسي. أخبرني قليلا عن الشكل الذي تريده.",
  };
  if (plan.mode === "care") {
    return careFallback[lang];
  }
  if (plan.persona.id === "duke") {
    return dukeFallback[lang];
  }
  return timeCopy.fallback;
}

/* ───────── ハンドラ ───────── */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const trace = Math.random().toString(36).slice(2);
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ ok: false, v: 3, error: "method_not_allowed", trace });
    }
    const ip = ipFromRequest(req);
    const rl = rateLimit(`chat:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.ok) {
      res.setHeader("Retry-After", String(Math.ceil(rl.retryAfter / 1000)));
      return res.status(429).json({ ok: false, v: 3, error: "rate_limited", trace });
    }
    if (Math.random() < 0.02) gcExpired(RATE_WINDOW_MS);

    const parsed = BodySchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ ok: false, v: 3, error: "invalid_body", trace });

    const { messages, entryContext } = parsed.data;
    let lang = parsed.data.lang;
    const timeTone = normalizeSalonTimeTone(parsed.data.timeTone ?? getSalonTimeTone());
    let timeCopy = getLocalizedSalonTimeCopy(lang, timeTone);
    const userTurns = countUserTurns(messages);

    // 開幕（伯爵の出迎え）
    if (userTurns === 0) {
      const assistantText = timeCopy.opening;
      return res.status(200).json({
        ok: true, v: 3, assistantText, card: null, cta: null, persona: "count", timeTone,
        provider: "none", model: null,
        memory: { residue: assistantText.slice(0, 120), timestamp: new Date().toISOString() }, trace,
      });
    }

    // ハード上限（長時間連投の遮断）
    if (userTurns > HARD_MAX_USER_TURNS) {
      const assistantText = timeCopy.longClose;
      return res.status(200).json({
        ok: true, v: 3, assistantText, card: null, cta: null, persona: "count", timeTone,
        provider: "none", model: null,
        memory: { residue: assistantText.slice(0, 120), timestamp: new Date().toISOString() }, trace,
      });
    }

    const query = lastUserText(messages);
    let coreWorks: Work[] = [];
    try { coreWorks = (await loadLiveMergedWorksServer()) as Work[]; } catch { coreWorks = []; }
    const coreTurn = deriveChatCoreTurn({ messages, language: lang as CoreLanguage, works: coreWorks });
    const visitorState = deriveVisitorState(messages);
    // An explicit current language instruction outranks the UI default.
    lang = coreTurn.language as Lang;
    timeCopy = getLocalizedSalonTimeCopy(lang, timeTone);
    const controlled = (
      assistantText: string,
      intent: string,
      card: RecoCard | null = null,
      actionResult: "LINK_PRESENTED" | null = null,
      providerMeta?: { provider: LlmMeta["provider"]; model: string },
    ) =>
      res.status(200).json({
        ok: true, v: 3, assistantText, card, cta: null, persona: "count", intent,
        productId: null, interestBridge: null, timeTone,
        provider: providerMeta?.provider ?? "none",
        model: providerMeta?.model || null,
        ...(actionResult ? { actionResult: { status: actionResult, workId: card?.id ?? null, kind: coreTurn.actionKind } } : {}),
        memory: { residue: assistantText.slice(0, 120), cardTitle: card?.title ?? null, timestamp: new Date().toISOString() },
        trace,
      });
    const convo = conversationText(messages);
    // These controls are resolved before affinity, creative, or commercial text.
    if (isDistress(convo)) return controlled(gracefulFallback({ persona: COUNT_PERSONA, mode: "care" }, lang, timeTone), "care");
    if (coreTurn.sales.currentStopRequest || coreTurn.sales.suppressRecommendations) {
      const scope = coreTurn.sales.persistentRecommendationStop ? "recommendations" : "sales";
      return controlled(salesSuppressionText(lang as CoreLanguage, scope), "conversation");
    }
    const entryWork = entryContext?.intent === "music-work"
      ? coreWorks.find((work) => String(work.id ?? "") === entryContext.workId && normType(work.type) === "music") ?? null
      : null;
    if (entryContext && !entryWork) return controlled(unknownEntryWorkText(lang), "conversation");
    if (asksForRetiredOracle(query)) return controlled(retiredOracleText(lang), "conversation");
    if (asksForUpcomingRelease(query)) {
      const upcoming = nextUpcomingRelease(loadStoredDistributionReleases());
      if (!upcoming) {
        const unavailable: Record<Lang, string> = {
          ja: "現在の配信元記録に、公開予定日が確認できる次のリリースはありません。",
          en: "There is no next release with a verified scheduled date in the current distributor records.",
          fr: "Aucune prochaine sortie avec une date prévue vérifiée n’apparaît dans les données du distributeur.",
          es: "No hay un próximo lanzamiento con fecha programada verificada en los registros actuales del distribuidor.",
          de: "In den aktuellen Vertriebsdaten ist keine nächste Veröffentlichung mit bestätigtem Termin eingetragen.",
          ar: "لا يوجد إصدار قادم بتاريخ مجدول موثق في سجلات التوزيع الحالية.",
        };
        return controlled(unavailable[lang], "conversation");
      }
      const title = upcoming.title ?? "";
      const date = upcoming.releaseDate ?? "";
      const genreJa = upcoming.primaryGenre ? ` 配信上のジャンルは${upcoming.primaryGenre}です。` : "";
      const genreByLang: Record<Lang, string> = upcoming.primaryGenre ? {
        ja: genreJa,
        en: ` The distributor lists its genre as ${upcoming.primaryGenre}.`,
        fr: ` Le distributeur indique le genre « ${upcoming.primaryGenre} ».`,
        es: ` El distribuidor indica el género «${upcoming.primaryGenre}».`,
        de: ` Der Vertrieb nennt das Genre „${upcoming.primaryGenre}“.`,
        ar: ` ويذكر الموزع أن النوع هو ${upcoming.primaryGenre}.`,
      } : { ja: "", en: "", fr: "", es: "", de: "", ar: "" };
      const text: Record<Lang, string> = {
        ja: `配信元の記録では、次のリリースは「${title}」で、${date}公開予定です。公開リンクはまだ確認できていません。${genreByLang.ja}`,
        en: `The distributor record lists “${title}” for ${date}. Its public store link is not verified yet.${genreByLang.en}`,
        fr: `Le distributeur indique « ${title} » pour le ${date}. Son lien public n’est pas encore vérifié.${genreByLang.fr}`,
        es: `El distribuidor indica «${title}» para el ${date}. Su enlace público aún no está verificado.${genreByLang.es}`,
        de: `Der Vertrieb führt „${title}“ für den ${date}. Ein öffentlicher Store-Link ist noch nicht bestätigt.${genreByLang.de}`,
        ar: `يسجل الموزع «${title}» بتاريخ ${date}. لم يتم التحقق من رابط المتجر العام بعد.${genreByLang.ar}`,
      };
      return controlled(text[lang], "conversation");
    }
    if (isWorkRecallRequest(query)) {
      const fuzzy = fuzzyRecallWork(query, coreWorks);
      if (fuzzy.status === "exact") {
        const card = buildChatWorkCard(fuzzy.work);
        const canListen = Boolean(card?.links.some((link) => link.kind === "listen"));
        return controlled(recallReplyText(lang, String(fuzzy.work.title ?? ""), "high", canListen), "work", card);
      }

      const recallCandidates = buildRecallCatalogCandidates(coreWorks, query);
      if (!recallCandidates.length) {
        return controlled(recallClarificationText(lang), "conversation");
      }

      const recallPrompt = buildRecallModelMessages(query, recallCandidates);
      const recallLlm = await llmChat({
        purpose: "quality",
        system: recallPrompt.system,
        messages: [{ role: "user", content: recallPrompt.user }],
        maxTokens: 512,
        trace: `${trace}-recall`,
      });
      if (recallLlm.ok) {
        const decision = parseRecallModelDecision(recallLlm.text, recallCandidates);
        if (decision.workId && (decision.confidence === "high" || decision.confidence === "medium")) {
          const work = coreWorks.find((item) => String(item.id ?? "") === decision.workId) ?? null;
          if (work) {
            const card = buildChatWorkCard(work);
            const canListen = Boolean(card?.links.some((link) => link.kind === "listen"));
            return controlled(
              recallReplyText(lang, String(work.title ?? ""), decision.confidence, canListen),
              "work",
              card,
              null,
              { provider: recallLlm.provider, model: recallLlm.model },
            );
          }
        }
      }
      return controlled(
        recallClarificationText(lang),
        "conversation",
        null,
        null,
        recallLlm.ok ? { provider: recallLlm.provider, model: recallLlm.model } : undefined,
      );
    }

    const explicitIdentity = coreTurn.actionKind ? resolveCatalogIdentity(query, coreWorks) : null;
    const explicitActionTarget = coreTurn.actionTargetId || (explicitIdentity && explicitIdentity.status !== "none")
      || /(?:これ|それ|あれ|この|その|前の|さっきの|という(?:曲|作品|本)|の(?:続編|新作)|\b(?:this|that|previous|it|ce|cette|cela|esto|ese|diese|dieses)\b|هذا|هذه|ذلك)/i.test(query);
    if (coreTurn.actionKind && explicitActionTarget) {
      if (coreTurn.actionStatus === "link_available" && coreTurn.actionTargetId) {
        const work = coreWorks.find((item) => String(item.id ?? "") === coreTurn.actionTargetId);
        const candidate = work ? buildChatWorkCard(work) : null;
        const allowedUrls = new Set(coreTurn.actionLinks.map((link) => link.url));
        const links = candidate?.links.filter((link) => allowedUrls.has(link.url)) ?? [];
        if (candidate && links.length) {
          const card = { ...candidate, links };
          return controlled(actionLinkText(lang, coreTurn.actionKind, card.title), "work", card, "LINK_PRESENTED");
        }
      }
      return controlled(unavailableRecommendationText(lang as CoreLanguage, coreTurn.actionStatus), "conversation");
    }
    if (asksForSonicDetails(query)) {
      const named = resolveCatalogIdentity(query, coreWorks);
      const sonicWork = named.status === "exact"
        ? named.work
        : visitorState.lastPresentedWorkId
          ? coreWorks.find((work) => String(work.id ?? "") === visitorState.lastPresentedWorkId) ?? null
          : asksForLatestRelease(query)
            ? latestReleasedWorks(coreWorks, { medium: desiredType(query) ?? visitorState.preferredMedium ?? undefined, limit: 1 })[0] ?? null
            : null;
      const baseCard = sonicWork ? buildChatWorkCard(sonicWork) : null;
      const listenLinks = baseCard?.links.filter((link) => link.kind === "listen") ?? [];
      const card = baseCard && listenLinks.length ? { ...baseCard, links: listenLinks } : null;
      return controlled(
        unknownSonicText(lang, String(sonicWork?.id ?? "catalog"), !!card),
        sonicWork ? "work" : "conversation",
        card,
      );
    }
    if (asksForLatestRelease(query)) {
      const medium = desiredType(query) ?? visitorState.preferredMedium ?? undefined;
      const latest = latestReleasedWorks(coreWorks, { medium, limit: 1 })[0] ?? null;
      if (!latest) {
        const unavailable: Record<Lang, string> = {
          ja: "現在のcatalogから、日付を確認できる新しい作品を見つけられませんでした。",
          en: "I could not find a newly dated work in the current catalog.",
          fr: "Je n’ai pas trouvé d’œuvre récemment datée dans le catalogue actuel.",
          es: "No encontré una obra con fecha reciente en el catálogo actual.",
          de: "Im aktuellen Katalog finde ich kein neu datiertes Werk.",
          ar: "لم أجد عملاً حديث التاريخ في الفهرس الحالي.",
        };
        return controlled(unavailable[lang], "conversation");
      }
      const title = String(latest.title ?? "");
      const date = String(latest.distribution?.releaseDate ?? latest.releasedAt ?? "");
      const latestCard = buildChatWorkCard(latest);
      const appleGenre = typeof latest.distribution?.appleGenre === "string" ? latest.distribution.appleGenre.trim() : "";
      const appleGenreFact: Record<Lang, string> = appleGenre ? {
        ja: ` Apple Music上では「${appleGenre}」に分類されています。`,
        en: ` Apple Music classifies it as ${appleGenre}.`,
        fr: ` Apple Music la classe dans le genre « ${appleGenre} ».`,
        es: ` Apple Music la clasifica como «${appleGenre}».`,
        de: ` Apple Music ordnet sie dem Genre „${appleGenre}“ zu.`,
        ar: ` تصنفها Apple Music ضمن نوع ${appleGenre}.`,
      } : { ja: "", en: "", fr: "", es: "", de: "", ar: "" };
      const latestText: Record<Lang, string> = {
        ja: `現在のcatalogで日付を確認できる${medium === "book" ? "新しい作品" : "最新の作品"}は「${title}」です。記録上の日付は${date}です。${latestCard ? "下のカードから確認できます。" : "確認できる公開リンクはまだ記録されていません。"}${appleGenreFact.ja}`,
        en: `The latest dated work in the current catalog is “${title}” (${date}). ${latestCard ? "You can open it from the card below." : "No verified public action is recorded yet."}${appleGenreFact.en}`,
        fr: `L’œuvre la plus récente datée dans le catalogue actuel est « ${title} » (${date}). ${latestCard ? "Vous pouvez la consulter avec la carte ci-dessous." : "Aucune action publique vérifiée n’est encore enregistrée."}${appleGenreFact.fr}`,
        es: `La obra con fecha más reciente en el catálogo actual es «${title}» (${date}). ${latestCard ? "Puede abrirla desde la tarjeta de abajo." : "Aún no hay una acción pública verificada registrada."}${appleGenreFact.es}`,
        de: `Das zuletzt datierte Werk im aktuellen Katalog ist „${title}“ (${date}). ${latestCard ? "Über die Karte unten können Sie es öffnen." : "Eine bestätigte öffentliche Aktion ist noch nicht eingetragen."}${appleGenreFact.de}`,
        ar: `أحدث عمل مؤرخ في الفهرس الحالي هو «${title}» (${date}). ${latestCard ? "يمكنك فتحه من البطاقة أدناه." : "لم يُسجل إجراء عام موثق بعد."}${appleGenreFact.ar}`,
      };
      return controlled(latestText[lang], "work", latestCard);
    }
    if (coreTurn.sales.suppressSales && !wantsWork(query) && !wantsCreativeText(query)) {
      return controlled(coreTurn.sales.persistentSalesStop ? salesSuppressionText(lang as CoreLanguage, "sales") : temporaryNoBuyText(lang), "conversation");
    }
    const fullConvo = fullConversationText(messages);
    const summary = summarize(messages, lang);
    const creativeText = coreTurn.actionKind ? null : creativeTextResponse(query, lang);
    const followsWorkOffer = userTurns > 1 && wantsWorkFollowup(query, previousAssistantText(messages));
    const acceptedInterestBridge = followsWorkOffer && isChatInterestInvitation(previousAssistantText(messages));
    const musicAffinityTurn = entryWork && !coreTurn.actionKind && !coreTurn.sales.suppressSales
      ? buildMusicWorkAffinityTurn({ workTitle: String(entryWork.title), latest: query, previousAssistant: previousAssistantText(messages), userTurns, lang })
      : null;

    // 状態を読む
    const distress = isDistress(convo);
    const commercial = distress || coreTurn.sales.suppressSales ? null : commercialIntent(query);
    const hintProduct = distress || coreTurn.sales.suppressSales ? undefined : productHint(query);
    const officeArt = distress || coreTurn.sales.suppressSales ? false : wantsOfficeArt(query);
    const vipMetalPrint = distress || coreTurn.sales.suppressSales ? false : wantsVipMetalPrint(query);
    const metalSalesTurn = vipMetalPrint ? buildMetalPrintSalesTurn(query, lang) : null;
    const selectedEdition = vipMetalPrint ? selectedMetalEdition(query) : null;
    const nonSellingMetalTurn = metalSalesTurn?.stage === "stop" || metalSalesTurn?.stage.startsWith("nurture_") === true;
    const rawInterestBridge = distress || coreTurn.sales.suppressSales ? null : buildChatInterestBridge({
      conversation: convo,
      latest: query,
      previousAssistant: previousAssistantText(messages),
      userTurns,
      lang,
    });
    const interestBridge = rawInterestBridge?.action === "decline"
      ? rawInterestBridge
      : commercial || hintProduct || officeArt || vipMetalPrint || creativeText || wantsWork(query)
        ? null
        : rawInterestBridge;

    // プラン決定
    const visitorExcludedWorkIds = visitorState.reopenRequested ? [] : [
      ...visitorState.rejectedWorkIds,
      ...(visitorState.anotherRequested ? visitorState.recentRecommendedWorkIds : []),
    ];
    let plan: Plan;
    if (distress) {
      plan = { persona: COUNT_PERSONA, mode: "care" };
    } else if (coreTurn.sales.suppressRecommendations) {
      // A persistent explicit stop is session-scoped until a current purchase
      // request reopens it; temporary no-buy only suppresses the CTA below.
      plan = { persona: COUNT_PERSONA, mode: "salon" };
    } else if (coreTurn.actionKind) {
      // A generic listen/read/view request may select one public catalog work;
      // a specific or deictic action was already resolved above.
      const { card, work } = await prescribeWork({
        queryText: query, lang,
        type: coreTurn.actionKind === "listen" ? "music" : coreTurn.actionKind === "read" ? "book" : desiredType(query),
        sales: coreTurn.sales,
        works: coreWorks,
        excludedWorkIds: visitorExcludedWorkIds,
        preferLatestEligible: visitorState.anotherRequested,
      });
      plan = { persona: COUNT_PERSONA, mode: "salon", card, workNote: workNote(work) };
    } else if (musicAffinityTurn?.action === "dossier") {
      plan = { persona: DUKE_PERSONA, mode: "salon", product: PRODUCTS.find((p) => p.id === "vip-metal-print") };
    } else if (musicAffinityTurn) {
      plan = { persona: COUNT_PERSONA, mode: "salon" };
    } else if (nonSellingMetalTurn) {
      plan = { persona: COUNT_PERSONA, mode: "salon" };
    } else if (interestBridge?.action === "decline") {
      // Explicit refusal always wins over substring-based affirmative language
      // (e.g. Japanese "作品はいらない" contains the characters "はい").
      plan = { persona: COUNT_PERSONA, mode: "salon" };
    } else if (acceptedInterestBridge) {
      // A voluntary yes to our free-work invitation must deterministically
      // produce a real catalog card; never hand this turn back to the LLM.
      const bridgeSeed = chatInterestRecommendationSeed(previousAssistantText(messages), lang);
      const { card, work } = await prescribeWork({
        queryText: bridgeSeed || query,
        lang,
        type: desiredType(bridgeSeed || query) ?? visitorState.preferredMedium ?? undefined,
        sales: coreTurn.sales,
        preferWorkId: coreTurn.actionTargetId,
        works: coreWorks,
        excludedWorkIds: visitorExcludedWorkIds,
        preferLatestEligible: visitorState.anotherRequested,
      });
      plan = { persona: COUNT_PERSONA, mode: "salon", card, workNote: workNote(work),
        product: card ? PRODUCTS.find((p) => p.id === "tonight-work") : undefined };
    } else if (vipMetalPrint) {
      // 一度メタルプリント商談に入った会話は、汎用BGM/法人LLMへ逸脱させない。
      plan = { persona: DUKE_PERSONA, mode: "salon", product: PRODUCTS.find((p) => p.id === "vip-metal-print") };
    } else if (officeArt) {
      // 法人×アートはBGM(business)より先に判定する（法人語だけでBGM導線に吸われないように）
      plan = { persona: DUKE_PERSONA, mode: "salon", product: PRODUCTS.find((p) => p.id === "office-art") };
    } else if (commercial === "business") {
      plan = { persona: DUKE_PERSONA, mode: "salon", product: PRODUCTS.find((p) => p.id === "business") };
    } else if (commercial === "order") {
      plan = { persona: DUKE_PERSONA, mode: "salon", product: PRODUCTS.find((p) => p.id === "order-song") };
    } else if (creativeText) {
      plan = { persona: COUNT_PERSONA, mode: "salon" };
    } else if (hintProduct) {
      plan = { persona: COUNT_PERSONA, mode: "salon", product: hintProduct };
    } else if (wantsWork(query) || followsWorkOffer) {
      const workQuery = query;
      const { card, work } = await prescribeWork({
        queryText: workQuery,
        lang,
        type: desiredType(query) ?? visitorState.preferredMedium ?? undefined,
        sales: coreTurn.sales,
        preferWorkId: coreTurn.actionTargetId,
        works: coreWorks,
        excludedWorkIds: visitorExcludedWorkIds,
        preferLatestEligible: visitorState.anotherRequested,
      });
      plan = { persona: COUNT_PERSONA, mode: "salon", card, workNote: workNote(work),
        product: card ? PRODUCTS.find((p) => p.id === "tonight-work") : undefined };
    } else {
      plan = { persona: COUNT_PERSONA, mode: "salon" };
    }

    const deterministicWorkText = workRecommendationText(plan, lang);
    const vipDossierText = vipMetalDossierText(plan, lang, fullConvo || convo || query);
    const deterministicCoreText = (coreTurn.actionKind || wantsWork(query) || followsWorkOffer) && !plan.card
        ? unavailableRecommendationText(lang as CoreLanguage, coreTurn.actionStatus)
        : null;
    const directText = deterministicCoreText || musicAffinityTurn?.text || (nonSellingMetalTurn ? metalSalesTurn?.text ?? null : creativeText || deterministicWorkText || vipDossierText || interestBridge?.text || null);
    let llm: LlmMeta = { ok: false, text: "", provider: "none", model: "", error: directText ? (creativeText ? "skipped_for_creative_text" : vipDossierText ? "skipped_for_vip_dossier" : "skipped_for_catalog_card") : "not_called", tried: [] };
    let assistantText: string;
    if (directText) {
      assistantText = sanitize(directText, lang);
    } else {
      const catalogIdentity = resolveCatalogIdentity(query, coreWorks);
      const evidenceWork = entryWork ?? (catalogIdentity.status === "exact" ? catalogIdentity.work : null);
      const evidencePack = evidenceWork ? buildLunaEvidencePack(evidenceWork) : null;
      const system = [
        buildSystemPrompt(plan, lang, summary, timeTone),
        evidencePack ? [
          "CATALOG EVIDENCE PACK (candidate only):",
          evidencePack,
          "Keep FACT, tentative INTERPRETATION, and UNKNOWN separate. Never invent instruments, BPM, vocals, lyrics, intent, sonic texture, rights, or full-track availability. A recorded action URL proves only that the URL is cataloged.",
        ].join("\n") : "",
      ].filter(Boolean).join("\n\n");
      const fewShot = buildFewShot(plan.persona, lang);
      const history = messages.slice(-MAX_LLM_HISTORY);
      llm = await callLlm(system, fewShot, history, trace);
      assistantText = sanitize(llm.ok && llm.text ? llm.text.trim() : gracefulFallback(plan, lang, timeTone), lang);
    }

    // 提示する CTA（商材ボタン）。care時は出さない。
    let cta: Cta | null = null;
    if (plan.mode !== "care" && !coreTurn.sales.suppressSales && plan.product && plan.product.ctaHref) {
      cta = {
        href: plan.product.ctaHref,
        label: productCtaLabelForLang(plan.product, lang),
        productId: plan.product.id,
      };
    }
    if (plan.mode !== "care" && !coreTurn.sales.suppressSales && plan.product?.id === "vip-metal-print" && selectedEdition) {
      cta = {
        href: `/metal-print/${selectedEdition.slug}`,
        label: lang === "ja" ? `${selectedEdition.title}の公開Dossierを見る` : `View the ${selectedEdition.title} public Dossier`,
        productId: plan.product.id,
      };
    }

    const intent = distress
      ? "care"
      : musicAffinityTurn?.action === "dossier"
        ? "product"
      : musicAffinityTurn
        ? "conversation"
      : nonSellingMetalTurn
        ? "conversation"
      : vipMetalPrint
        ? "product"
      : officeArt
        ? "business"
      : commercial === "business"
        ? "business"
        : commercial === "order"
          ? "order"
          : hintProduct
            ? "product"
            : plan.card
              ? "work"
              : "conversation";

    return res.status(200).json({
      ok: true,
      v: 3,
      assistantText,
      card: plan.card ?? null,
      cta,
      persona: plan.persona.id,
      intent,
      productId: plan.product?.id ?? null,
      interestBridge: interestBridge ? { id: interestBridge.id, action: interestBridge.action } : null,
      timeTone,
      provider: llm.provider,
      model: llm.model || null,
      memory: {
        residue: assistantText.slice(0, 120),
        cardTitle: plan.card?.title ?? null,
        timestamp: new Date().toISOString(),
      },
      ...(process.env.NODE_ENV !== "production"
        ? { debug: { mode: plan.mode, persona: plan.persona.id, commercial, product: plan.product?.id ?? null, timeTone } }
        : {}),
      trace,
    });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ ok: false, v: 3, error: err?.message ?? "failed", trace });
  }
}
