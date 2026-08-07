import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rankSalesWorks, recommendationReason, type SalesMatchWork } from "../src/lib/chat-sales";
import { buildChatInterestBridge, chatInterestRecommendationSeed, isChatInterestInvitation } from "../src/lib/chat-interest-bridge";
import { buildMusicWorkAffinityTurn } from "../src/lib/music-work-affinity";
import { wantsWorkFollowup } from "../src/pages/api/chat-experience-v3";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[validate-chat-sales] ${message}`);
}

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const ssdJson = readJson("public/works/works-ssd.json");
const works = (Array.isArray(ssdJson) ? ssdJson : ssdJson.items ?? ssdJson.works ?? []) as SalesMatchWork[];
assert(works.length > 0, "works-ssd.json に作品がありません");

const scenarios = [
  { query: "眠る前に聴く静かな音楽がほしい", reason: "眠る前の静けさ" },
  { query: "仕事に集中できる邪魔しない曲", reason: "集中を保つ流れ" },
  { query: "旅に出たくなる音楽", reason: "旅の景色を運ぶ広がり" },
  { query: "故郷を思い出す懐かしい曲", reason: "記憶に触れる余韻" },
  { query: "退屈なので景色が変わる刺激的な一作がほしい", reason: "いつもの景色をずらす意外性" },
];

for (const scenario of scenarios) {
  const first = rankSalesWorks(works, scenario.query)[0];
  const second = rankSalesWorks(works, scenario.query)[0];
  assert(first, `推薦候補がありません: ${scenario.query}`);
  assert(first.score > 0, `意図スコアが0です: ${scenario.query}`);
  assert(first.reasons.includes(scenario.reason), `推薦理由が欠落しています: ${scenario.reason}`);
  assert(String(first.work.id) === String(second.work.id), `同じ入力の推薦結果が安定していません: ${scenario.query}`);
}

const jaReason = recommendationReason(["眠る前の静けさ"], "ja");
const enReason = recommendationReason(["眠る前の静けさ"], "en");
assert(jaReason.includes("眠る前の静けさ"), "日本語の推薦理由が個別化されていません");
assert(!/[ぁ-んァ-ヶ一-龠]/.test(enReason), "英語の推薦理由に日本語が混ざっています");

const chatUi = readText("src/pages/chat.tsx");
const chatApi = readText("src/pages/api/chat-experience-v3.ts");
const metalPage = readText("src/app/vip-metal-print/page.tsx");
const home = readText("src/components/realm/RealmHome.tsx");
const posthogSnapshot = readText("scripts/snapshot-metal-print-funnel.ts");
const chatInterestClient = readText("src/lib/chat-interest-funnel-client.ts");
const chatInterestRoute = readText("src/app/api/chat-interest/event/route.ts");
const redisServer = readText("src/lib/metal-print-redis.server.ts");
const dailyCron = readText("src/app/api/cron/metal-print-ops/route.ts");
const nextConfig = readText("next.config.js");
const mergedLoader = readText("src/lib/loadMergedWorksServer.ts");
for (const event of [
  "salon_open",
  "salon_starter_click",
  "salon_send",
  "salon_reply",
  "salon_work_show",
  "salon_work_click",
  "salon_cta_show",
  "salon_cta_click",
  "salon_lead",
  "salon_interest_bridge_show",
  "salon_interest_bridge_accept",
  "salon_interest_bridge_decline",
]) {
  assert(chatUi.includes(`"${event}"`), `営業ファネルイベントが欠落しています: ${event}`);
}

const tiredBridge = buildChatInterestBridge({ conversation: "なんか疲れた。\n仕事のことばかり考えてしまう。", latest: "仕事のことばかり考えてしまう。", previousAssistant: "それは頭が休まりませんね。", userTurns: 2, lang: "ja" });
assert(tiredBridge?.action === "explore" && tiredBridge.id === "rest", "疲れた雑談を理解する探索質問へ移れていません");
assert(tiredBridge?.text.includes("静けさと温かさ"), "作品を出す前に相手の選好を聞けていません");
assert(!isChatInterestInvitation(tiredBridge?.text ?? ""), "探索段階で作品提案へ飛んでいます");
const invitedBridge = buildChatInterestBridge({ conversation: "なんか疲れた。\n仕事のことばかり考えてしまう。\n静かな方がいい", latest: "静かな方がいい", previousAssistant: tiredBridge?.text ?? "", userTurns: 3, lang: "ja" });
assert(invitedBridge?.action === "offer" && invitedBridge.id === "rest", "選好回答の後に低圧の作品提案へ移れていません");
assert(invitedBridge?.text.includes("無料で見られます"), "関心形成が無料体験として提示されていません");
assert(invitedBridge?.text.includes("頭を休ませる音の景色"), "相手の言葉から体験価値への具体的な橋がありません");
assert(invitedBridge?.text.includes("雑談に戻りましょう"), "提案を断っても会話を失わない安全性が伝わりません");
assert(chatInterestRecommendationSeed(invitedBridge?.text ?? "", "ja") === "眠る前に聴く静かで落ち着く音楽", "招待テーマが推薦検索へ保持されません");
assert(isChatInterestInvitation(invitedBridge?.text ?? ""), "新しい誘い文を次ターンの承諾判定へ引き継げません");
assert(wantsWorkFollowup("見てみたいです", invitedBridge?.text ?? ""), "自然な閲覧承諾を作品カード経路へ渡せません");
assert(wantsWorkFollowup("はい、見せてください", invitedBridge?.text ?? ""), "丁寧な閲覧承諾を作品カード経路へ渡せません");
assert(!wantsWorkFollowup("今日はやめておきます", invitedBridge?.text ?? ""), "非承諾を作品カード経路へ渡しています");
assert(!wantsWorkFollowup("作品はいらないです", invitedBridge?.text ?? ""), "拒否文中の『はい』を承諾として誤検出しています");
assert(!/(購入|価格|限定版|メタルプリント)/.test(invitedBridge?.text ?? ""), "関心形成前に商品営業へ飛んでいます");
assert(buildChatInterestBridge({ conversation: "なんか疲れた。", latest: "なんか疲れた。", previousAssistant: "", userTurns: 1, lang: "ja" }) === null, "初回の疲労発言へ早すぎる作品提案をしています");
assert(buildChatInterestBridge({ conversation: "今日は天気がいい。\n散歩した。", latest: "散歩した。", previousAssistant: "いい時間ですね。", userTurns: 2, lang: "ja" }) === null, "作品と結びつかない雑談へ機械的に提案しています");
assert(buildChatInterestBridge({ conversation: "疲れた。メタルプリントは不要", latest: "メタルプリントは不要", previousAssistant: "", userTurns: 2, lang: "ja" }) === null, "明示拒否後に作品提案しています");
const declinedBridge = buildChatInterestBridge({ conversation: "疲れた。仕事が離れない", latest: "作品はいらない", previousAssistant: "無料で見られる一作を置いてみましょうか？", userTurns: 3, lang: "ja" });
assert(declinedBridge?.action === "decline" && declinedBridge.text.includes("重ねません"), "作品提案の拒否を尊重できていません");

const affinityExplore = buildMusicWorkAffinityTurn({
  workTitle: "ENA",
  latest: "静かな音が残りました",
  previousAssistant: "ようこそ。",
  userTurns: 1,
  lang: "ja",
});
assert(affinityExplore.action === "explore", "音楽流入の初回が感情探索になっていません");
assert(affinityExplore.text.includes("どの瞬間") && affinityExplore.text.includes("心に残りましたか"), "音楽への愛情を聞く具体的な問いがありません");
assert(!/(33万円|購入|限定3|販売確定)/.test(affinityExplore.text), "音楽流入の初回から販売へ飛んでいます");

const affinityPermission = buildMusicWorkAffinityTurn({
  workTitle: "ENA",
  latest: "青いジャケットと余韻です",
  previousAssistant: affinityExplore.text,
  userTurns: 2,
  lang: "ja",
});
assert(affinityPermission.action === "permission", "共感回答の後に空間化の許可を取れていません");
assert(affinityPermission.text.includes("作品固有Dossierの準備相談"), "承諾判定に必要なDossier許可文がありません");
assert(affinityPermission.text.includes("販売確定") && affinityPermission.text.includes("価格の話には進みません"), "販売前の境界が明示されていません");

const affinityDossier = buildMusicWorkAffinityTurn({
  workTitle: "ENA",
  latest: "はい、見てみたいです",
  previousAssistant: affinityPermission.text,
  userTurns: 3,
  lang: "ja",
});
assert(affinityDossier.action === "dossier", "明示承諾後に作品固有Dossier相談へ進めません");
assert(affinityDossier.text.includes("メタルプリント候補") && affinityDossier.text.includes("購入義務ではありません"), "未承認作品を確定商品として扱う危険があります");

const affinityDecline = buildMusicWorkAffinityTurn({
  workTitle: "ENA",
  latest: "作品はいらないです",
  previousAssistant: affinityPermission.text,
  userTurns: 3,
  lang: "ja",
});
assert(affinityDecline.action === "decline", "音楽流入の明示拒否を尊重できていません");
assert(!/(相談欄|購入|価格|メタルプリント候補)/.test(affinityDecline.text), "拒否後に営業CTAを残しています");

const golden = readJson("docs/chat-golden-set.json");
const workScenario = golden.scenarios?.find((scenario: { id?: string }) => scenario.id === "want-work-music");
assert(workScenario?.expect?.expectCard === true, "作品希望シナリオがカード提示を必須にしていません");
const vipMetalScenario = golden.scenarios?.find((scenario: { id?: string }) => scenario.id === "vip-metal-dossier-duke");
assert(vipMetalScenario?.expect?.expectPersona === "duke", "VIPメタルプリントが公爵へ格上げされません");
assert(vipMetalScenario?.expect?.expectCta === true, "VIPメタルプリントのDossier CTAが必須化されていません");
assert(chatApi.includes("vipMetalDossierText"), "VIP Dossierの決定論的応答がありません");
assert(chatApi.includes("buildMetalPrintSalesTurn"), "VIP営業ステートが接続されていません");
assert(chatApi.includes("buildMusicWorkAffinityTurn") && chatApi.includes('entryContext?.intent === "music-work"'), "音楽作品流入の共感ステートがAPIへ接続されていません");
assert(chatApi.includes('musicAffinityTurn?.action === "dossier"') && chatApi.includes('? "product"\n      : musicAffinityTurn\n        ? "conversation"'), "Dossier承諾前後のintent計測が逆転する危険があります");
assert(chatApi.includes("acceptedInterestBridge") && chatApi.includes("A voluntary yes to our free-work invitation"), "無料作品への承諾が決定論的card経路へ固定されていません");
assert(chatApi.indexOf('interestBridge?.action === "decline"') < chatApi.indexOf("acceptedInterestBridge)"), "明示拒否が閲覧承諾より後に評価されています");
assert(chatApi.includes("見てみたい|見てみる|見せて|見たい"), "自然な日本語の作品閲覧承諾を認識できません");
assert(chatApi.includes("音の景色|聴きたい") && chatApi.includes("soundscape|listen"), "音の体験を約束した後に本を推薦する形式逸脱を防げません");
assert(chatApi.includes("skipped_for_vip_dossier"), "VIP Dossierが外部LLM呼び出しを回避していません");
assert(chatUi.includes('params.get("intent") === "metal-print"'), "メタルプリント流入専用starterがありません");
assert(chatUi.includes('params.get("intent") === "music-work"') && chatUi.includes("entryContext: musicWorkEntry"), "音楽作品流入文脈がChat APIへ保持されません");
assert(chatUi.includes('"metal_music_affinity_entry"') && chatUi.includes('"metal_music_affinity_dossier_accept"'), "音楽流入からDossier承諾までを計測できません");
assert(redisServer.includes('"metal_music_affinity_entry"') && redisServer.includes('"metal_music_affinity_dossier_accept"'), "音楽流入の成果が日次ファネル集計に含まれていません");
assert(chatUi.includes('!musicWorkEntry && !metalPrintEntry && cta?.productId !== "vip-metal-print"'), "作品別Dossier相談中に一般メール登録が競合します");
assert(chatUi.includes("CATALOG-WORK:${campaignWorkId}"), "全作品の指定が相談IDへ保持されません");
assert(chatUi.includes('sourceIntent: sourceIntent ?? "direct"') && chatUi.includes('sourceIntent === "metal-print"'), "メタルプリント流入計測がありません");
assert(chatUi.includes('sourceContent === "ABI-LW01-05"') && chatUi.includes("静けさと力強さなら、今は静けさがほしい"), "Launch Wave 05の投稿文脈がChat starterへ継承されません");
assert(metalPage.includes('href="/works"'), "VIPページの主CTAが全作品カタログへ接続されていません");
assert(metalPage.includes("getApprovedMetalPrintOffer"), "VIPページの販売表示が承認台帳に接続されていません");
assert(metalPage.includes("robots: { index: true, follow: true }"), "VIPページが検索流入を拒否しています");
assert(home.includes('href="/chat?intent=metal-print&'), "ホームにメタルプリント専用Chat入口がありません");
assert(home.includes('metric("metal_print_home_entry"'), "ホームのメタルプリント流入計測がありません");
assert(posthogSnapshot.includes("interestBridgeAcceptRate") && posthogSnapshot.includes("salon_interest_bridge_decline"), "雑談→作品関心の承諾・拒否率を集計できません");
assert(chatInterestClient.includes("chat_interest_bridge_accept") && chatInterestClient.includes("anonymousSessionId"), "first-party関心形成イベントが匿名計測されません");
assert(chatInterestClient.includes('params.get("utm_source")') && chatInterestClient.includes('params.get("utm_content")'), "関心形成が配信UTMへ帰属されません");
assert(chatInterestRoute.includes("invalid_origin") && chatInterestRoute.includes("rate_limited"), "関心形成event routeのorigin/rate gateがありません");
assert(redisServer.includes("summarizeChatInterestFunnel") && redisServer.includes("no email, IP, conversation text"), "匿名関心形成集計またはprivacy境界がありません");
assert(redisServer.includes('chat-interest:funnel:placements') && redisServer.includes("byPlacement"), "関心形成を配置別に集計できません");
assert(dailyCron.includes("summarizeChatInterestFunnel(30)"), "日次Cronが関心形成の承諾率を読めません");
assert(nextConfig.includes("'/api/chat-experience-v3': ['./public/works/works.json', './public/works/works-ssd.json']"), "本番Chat functionに作品catalogがtraceされません");
assert(mergedLoader.includes('import masterJson from "../../public/works/works.json"') && !mergedLoader.includes("process.cwd()"), "作品catalogがserverless実行時filesystemへ依存しています");

console.log(`[validate-chat-sales] ${scenarios.length} recommendation intents + funnel contract passed.`);
