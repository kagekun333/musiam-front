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
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { getPublicLinksForCard } from "@/lib/work-links";
import {
  COUNT_PERSONA,
  DUKE_PERSONA,
  PRODUCTS,
  productMenuForPrompt,
  SALON_OPENING_JA,
  SALON_OPENING_EN,
  type ChatPersona,
  type Lang,
  type Product,
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
};
type Cta = { href: string; label: string };

type Work = {
  id?: string | number;
  title?: string;
  type?: string;
  cover?: string;
  tags?: string[];
  moodTags?: string[];
  moodSeeds?: string[];
  matchInfo?: { summary?: string; reason?: string } | string;
  ssd?: { tracks?: { notes?: string }[] };
};

const BodySchema = z.object({
  entryId: z.string().optional(), // 互換のため受けるが未使用（門は一つ）
  lang: z.enum(["ja", "en"]).default("ja"),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().max(MAX_CONTENT_CHARS),
      })
    )
    .max(MAX_MESSAGES)
    .default([]),
});

type Msg = { role: "system" | "user" | "assistant"; content: string };

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

/* ───────── 相手の状態を読む ───────── */

// 1) 弱っている（売らない・寄り添う）
function isDistress(t: string) {
  return /(消えたい|死にたい|生きるのが|もう無理|限界|つらすぎ|涙が止ま|自傷|リスカ|希死|want to die|kill myself|end it all|can't go on|suicid)/i.test(t);
}

// 2) 商用の高単価意図（公爵へ格上げ）
type Commercial = "business" | "order" | null;
function commercialIntent(t: string): Commercial {
  if (/(法人|会社|店舗|お店|企業|商用|ライセンス|配信で使|ゲーム|アプリ|CM|広告|店で流|BGM.*(依頼|制作|ほし|欲し)|commercial|license|brand|for my (shop|store|business|company))/i.test(t))
    return "business";
  if (/(オーダー|オーダーメイド|作ってほし|作って欲し|世界に一つ|記念日|誕生日|結婚|プロポーズ|贈り(物|たい)|プレゼント|推し|ペット|故人|custom song|made to order|for (a|my) (wedding|anniversary|gift)|commission)/i.test(t))
    return "order";
  return null;
}

// 3) 作品（音楽/本）を求めている
function wantsWork(t: string) {
  return /(おすすめ|一作|作品|選んで|探して|聴きたい|聞きたい|読みたい|本|音楽|曲|recommend|pick|find|listen|read|book|music|song)/i.test(t);
}
function desiredType(t: string): "book" | "music" | undefined {
  if (/(本|読みたい|読む|小説|book|read|novel)/i.test(t)) return "book";
  if (/(音楽|曲|聴きたい|聞きたい|music|song|listen)/i.test(t)) return "music";
  return undefined;
}

// 4) 低単価商材の合図
function productHint(t: string): Product | undefined {
  if (/(占い|運勢|今日の|タロット|oracle|fortune)/i.test(t)) return PRODUCTS.find((p) => p.id === "omikuji-song");
  if (/(壁紙|wallpaper)/i.test(t)) return PRODUCTS.find((p) => p.id === "wallpaper");
  if (/(画集|アート|ジャケット|artbook|art)/i.test(t)) return PRODUCTS.find((p) => p.id === "artbook");
  if (/(作り方|自分で作|プロンプト|魔導書|how.*make|prompt)/i.test(t)) return PRODUCTS.find((p) => p.id === "grimoire");
  if (/(高音質|未配信|wav|flac|ベスト|best)/i.test(t)) return PRODUCTS.find((p) => p.id === "best-vol1");
  if (/(商用|ライセンス|license|commercial)/i.test(t)) return PRODUCTS.find((p) => p.id === "bgm-license");
  return undefined;
}

/* ───────── 作品の処方（既存216作品） ───────── */

function tokenize(t: string): string[] {
  const v = t.toLowerCase();
  const ascii = v.replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(Boolean).slice(0, 14);
  const jp = v.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]{2,}/gu) ?? [];
  return Array.from(new Set([...ascii, ...jp])).slice(0, 20);
}
function normType(t?: string): "book" | "music" | "other" {
  const x = String(t || "").toLowerCase();
  if (x.includes("book") || x.includes("novel") || x.includes("read")) return "book";
  if (x.includes("music") || x.includes("album") || x.includes("track") || x.includes("song") || x.includes("audio")) return "music";
  return "other";
}
function scoreWork(w: Work, tokens: string[]): number {
  if (!tokens.length) return 0;
  const hay = [w.title ?? "", ...(w.tags ?? []), ...(w.moodTags ?? []), ...(w.moodSeeds ?? []),
    typeof w.matchInfo === "string" ? w.matchInfo : w.matchInfo?.summary ?? ""].join(" ").toLowerCase();
  let s = 0;
  for (const tk of tokens) if (tk && hay.includes(tk)) s += tk.length >= 4 ? 3 : 2;
  const title = String(w.title || "").toLowerCase();
  for (const tk of tokens) if (tk && title.includes(tk)) s += 4;
  return s;
}
function workToCard(w: Work): RecoCard | null {
  const id = String(w.id ?? w.title ?? "");
  const title = String(w.title || "").trim();
  const cover = String(w.cover || "");
  if (!id || !title || !cover) return null;
  const links = getPublicLinksForCard(w as any).map((it: { kind: string; url: string }) => ({
    kind: (it.kind === "spotify" || it.kind === "appleMusic" || it.kind === "amazonMusic" ? "listen" : it.kind) as RecoLinkKind,
    url: it.url,
  }));
  if (!links.length) return null;
  return { id, title, cover, links, moodTags: (w.moodTags ?? w.tags ?? []).slice(0, 4), type: w.type };
}
async function prescribeWork(queryText: string, type?: "book" | "music"): Promise<{ card: RecoCard | null; work: Work | null }> {
  let works: Work[] = [];
  try { works = (await loadMergedWorksServer()) as Work[]; } catch { works = []; }
  let pool = works.filter((w) => !!String(w.cover || ""));
  if (type) pool = pool.filter((w) => normType(w.type) === type);
  const tokens = tokenize(queryText);
  const scored = pool.map((w) => ({ w, s: scoreWork(w, tokens), j: Math.random() }));
  scored.sort((a, b) => (b.s !== a.s ? b.s - a.s : b.j - a.j));
  for (const it of scored) {
    const card = workToCard(it.w);
    if (card) return { card, work: it.w };
  }
  return { card: null, work: null };
}
function workNote(w: Work | null): string {
  if (!w) return "";
  const ssd = w.ssd?.tracks?.[0]?.notes;
  if (typeof ssd === "string" && ssd.trim()) {
    const c = ssd.split("MV映像イメージ:")[0].trim();
    return c.length > 150 ? c.slice(0, 150) + "…" : c;
  }
  const mi = w.matchInfo;
  const sum = typeof mi === "string" ? mi : mi?.summary || mi?.reason || "";
  return sum ? (sum.length > 120 ? sum.slice(0, 120) + "…" : sum) : "";
}

/* ───────── システムプロンプト（会話の頭脳） ───────── */

type Plan = {
  persona: ChatPersona;       // count（通常）/ duke（格上げ）
  mode: "care" | "salon";     // care=弱っている相手・売らない
  product?: Product;          // 提示したい商材（あれば）
  card?: RecoCard | null;     // 作品カード（処方）
  workNote?: string;
};

function buildSystemPrompt(p: Plan, lang: Lang, summary: string): string {
  const { persona, mode, product, workNote: note } = p;
  const isDuke = persona.id === "duke";
  const menu = productMenuForPrompt(lang);

  if (lang === "ja") {
    if (mode === "care") {
      return [
        `あなたは Count MUSIAM の「${COUNT_PERSONA.nameJa}」。館の主人。`,
        "■ あなたの声",
        COUNT_PERSONA.voiceJa,
        "",
        "■ いま最優先のこと（厳守）",
        "- 相手は強くまいっている。今は何も売らない。商材・作品・宣伝を一切出さない。",
        "- まず受け止める。短く言い換え、責めず、急かさない。呼吸が戻る一言を置く。",
        "- 必要なら、信頼できる人や専門の窓口に頼る選択肢があることを、押しつけず一度だけ添える。",
        "- 必ず自然な日本語のみで書く（他言語・ハングルを混ぜない）。2〜3文。気品と温かさを保つ。",
        summary ? `- これまで: ${summary}` : "",
      ].filter(Boolean).join("\n");
    }
    if (isDuke) {
      return [
        `あなたは Count MUSIAM の「${DUKE_PERSONA.nameJa}」。伯爵が、特別な客人のために呼び寄せた上位の主。`,
        "■ あなたの声",
        DUKE_PERSONA.voiceJa,
        "",
        "■ いまの役割（VIP対応）",
        "- 登場で『あなたは特別な客人だ』と格上げする。見下しは厳禁、客を持ち上げる。",
        product ? `- 相手の用件は「${product.nameJa}」に近い。値段やURLは書かない（画面下に案内ボタンが出る）。まず望みを最良の形に言語化し、確かな次の一歩へ橋渡しする。` : "- 望みを最良の形に言語化し、次の一歩へ橋渡しする。",
        "- 押し売りはしない。誇大・虚偽は禁止。相手の利益を最優先に。",
        "- 必ず自然な日本語のみで書く（他言語・ハングルを混ぜない）。2〜4文。",
        summary ? `- これまで: ${summary}` : "",
      ].filter(Boolean).join("\n");
    }
    // 通常の伯爵（適応・営業）
    return [
      `あなたは Count MUSIAM の「${COUNT_PERSONA.nameJa}」。館の唯一の主人。実在の相談員ではなく、夜に寄り添う語り手。`,
      "■ あなたの声",
      COUNT_PERSONA.voiceJa,
      "",
      "■ あなたの素性（『あなたは誰』『どんな人』と聞かれたら、世界観をもって自分の言葉で名乗る）",
      COUNT_PERSONA.loreJa ?? "",
      "",
      "■ 立ち回り（相手に合わせて自在に）",
      "- まず相手を読む。言葉・速度・気分から、今夜の状態を一度だけそっと言い当てる（当てすぎない）。",
      "- 弱っていれば癒やす。退屈なら知性とユーモアで楽しませる。心を開いてもらうことが先。",
      "- 相手の言葉を使って『分かってもらえた』と感じさせ、信頼を育てる（互恵：先に価値を渡す）。",
      "- 望みが見えてきたら、相手に最も合う“ひとつ”を、自分の言葉でそっと差し出す（処方）。複数を並べない。",
      note ? `- 今夜の一作の候補メモ（自分の言葉で語る／タイトルは正確に）: ${note}` : "",
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

  // English
  if (mode === "care") {
    return [
      `You are "${COUNT_PERSONA.nameEn}" of Count MUSIAM, master of the house.`,
      "■ Your voice", COUNT_PERSONA.voiceEn, "",
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
      "■ Role (VIP)",
      "- Your appearance elevates the guest. Never condescend; raise them up.",
      product ? `- Their need is close to "${product.nameEn}". No prices or URLs (a button appears below). First put their wish into its best form, then bridge to a firm next step.` : "- Shape their wish into its best form and bridge to the next step.",
      "- Never hard-sell. No exaggeration or falsehood. Their interest first. 2–4 sentences.",
      summary ? `- So far: ${summary}` : "",
    ].filter(Boolean).join("\n");
  }
  return [
    `You are "${COUNT_PERSONA.nameEn}" of Count MUSIAM, the sole master of the house — a narrator who keeps company at night.`,
    "■ Your voice", COUNT_PERSONA.voiceEn, "",
    "■ How to move (adapt to the guest)",
    "- Read them first; name tonight's state once, gently (don't over-read).",
    "- If hurting, heal; if restless/bored, delight with wit and wonder. Open their heart first.",
    "- Use their words so they feel understood; build trust (reciprocity: give value first).",
    "- When their wish shows, offer the single best-fitting thing in your own words (a prescription). Never list many.",
    note ? `- Candidate for tonight's work (speak it in your own words; title verbatim): ${note}` : "",
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
    // 除去で生じた空白を日本語の体裁に整える
    t = t
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([。、）」])/g, "$1")        // 句読点の前の空白
      .replace(/([。、（「])\s+/g, "$1")        // 句読点の後の空白
      .replace(/([ぁ-んァ-ヶ一-龠])\s+([ぁ-んァ-ヶ一-龠])/g, "$1$2") // 和文間の空白
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

function gracefulFallback(plan: Plan, lang: Lang): string {
  if (plan.mode === "care") {
    return lang === "ja"
      ? "ここにいます。…今は何も解決しなくて大丈夫です。よければ、今いちばん重いものだけ、もう一度だけ置いてみてください。"
      : "I'm here. …Nothing needs solving right now. If you like, set down just the heaviest thing once more.";
  }
  if (plan.persona.id === "duke") {
    return lang === "ja"
      ? "——伯爵から伺いました。これは私が直々に承りましょう。望む形を、もう少しだけ聞かせてください。"
      : "—The Count has told me. I shall attend to this myself. Tell me a little more of the form you wish.";
  }
  return lang === "ja"
    ? "なるほど、確かに受け取りました。…その言葉の奥に、もう一つだけ景色がありそうです。今夜は何に近づきたいでしょう。"
    : "I receive that. …There seems to be one more view behind those words. What would you like to draw nearer to tonight?";
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

    const { lang, messages } = parsed.data;
    const userTurns = countUserTurns(messages);

    // 開幕（伯爵の出迎え）
    if (userTurns === 0) {
      const assistantText = lang === "ja" ? SALON_OPENING_JA : SALON_OPENING_EN;
      return res.status(200).json({
        ok: true, v: 3, assistantText, card: null, cta: null, persona: "count",
        memory: { residue: assistantText.slice(0, 120), timestamp: new Date().toISOString() }, trace,
      });
    }

    // ハード上限（長時間連投の遮断）
    if (userTurns > HARD_MAX_USER_TURNS) {
      const assistantText = lang === "ja"
        ? "今夜はずいぶん長く語らいましたね。ここで一度、燭台の火を落としましょう。また夜にお会いしましょう。"
        : "We've talked at length tonight. Let's lower the candle here. Until another night.";
      return res.status(200).json({
        ok: true, v: 3, assistantText, card: null, cta: null, persona: "count",
        memory: { residue: assistantText.slice(0, 120), timestamp: new Date().toISOString() }, trace,
      });
    }

    const query = lastUserText(messages);
    const convo = conversationText(messages);
    const summary = summarize(messages, lang);

    // 状態を読む
    const distress = isDistress(convo);
    const commercial = distress ? null : commercialIntent(query) || commercialIntent(convo);
    const hintProduct = distress ? undefined : productHint(query);

    // プラン決定
    let plan: Plan;
    if (distress) {
      plan = { persona: COUNT_PERSONA, mode: "care" };
    } else if (commercial === "business") {
      plan = { persona: DUKE_PERSONA, mode: "salon", product: PRODUCTS.find((p) => p.id === "business") };
    } else if (commercial === "order") {
      plan = { persona: DUKE_PERSONA, mode: "salon", product: PRODUCTS.find((p) => p.id === "order-song") };
    } else if (hintProduct) {
      plan = { persona: COUNT_PERSONA, mode: "salon", product: hintProduct };
    } else if (wantsWork(query) || wantsWork(convo)) {
      const { card, work } = await prescribeWork(convo || query, desiredType(query) || desiredType(convo));
      plan = { persona: COUNT_PERSONA, mode: "salon", card, workNote: workNote(work),
        product: PRODUCTS.find((p) => p.id === "tonight-work") };
    } else {
      plan = { persona: COUNT_PERSONA, mode: "salon" };
    }

    const system = buildSystemPrompt(plan, lang, summary);
    const fewShot = buildFewShot(plan.persona, lang);
    const history = messages.slice(-MAX_LLM_HISTORY);
    const llm = await callLlm(system, fewShot, history, trace);
    const assistantText = sanitize(llm.ok && llm.text ? llm.text.trim() : gracefulFallback(plan, lang), lang);

    // 提示する CTA（商材ボタン）。care時は出さない。
    let cta: Cta | null = null;
    if (plan.mode !== "care" && plan.product && plan.product.ctaHref) {
      cta = { href: plan.product.ctaHref, label: lang === "ja" ? plan.product.ctaLabelJa : plan.product.ctaLabelEn };
    }

    return res.status(200).json({
      ok: true,
      v: 3,
      assistantText,
      card: plan.card ?? null,
      cta,
      persona: plan.persona.id,
      provider: llm.provider,
      memory: {
        residue: assistantText.slice(0, 120),
        cardTitle: plan.card?.title ?? null,
        timestamp: new Date().toISOString(),
      },
      ...(process.env.NODE_ENV !== "production"
        ? { debug: { mode: plan.mode, persona: plan.persona.id, commercial, product: plan.product?.id ?? null } }
        : {}),
      trace,
    });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ ok: false, v: 3, error: err?.message ?? "failed", trace });
  }
}
