import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMetalPrintSalesTurn, type MetalSalesStage } from "../src/lib/metal-print-sales-conversation";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file: string) => JSON.parse(read(file));
const assertions: { label: string; pass: boolean }[] = [];
const check = (label: string, pass: unknown) => assertions.push({ label, pass: Boolean(pass) });

const stageCases: Array<[MetalSalesStage, string]> = [
  ["discover_space", "限定メタルプリントが欲しい"],
  ["discover_effect", "自宅の書斎の壁に限定メタルプリントが欲しい"],
  ["discover_size", "自宅の書斎に宇宙を感じる限定メタルプリントが欲しい"],
  ["discover_region", "自宅の書斎に宇宙を感じる作品が欲しい。壁幅は180cm"],
  ["discover_budget", "自宅の書斎に宇宙を感じる作品が欲しい。壁幅180cm、配送は日本"],
  ["discover_timing", "自宅の書斎に宇宙を感じる作品。壁幅180cm、日本、予算33万円"],
  ["discover_authority", "自宅の書斎に宇宙を感じる作品。壁幅180cm、日本、予算33万円、30日以内"],
  ["close_to_dossier", "自宅の書斎に宇宙を感じるDeus sive Natura。壁幅180cm、日本、予算33万円、30日以内、私が購入を決めます"],
  ["handle_price", "33万円は高すぎませんか"],
  ["handle_proof", "実物を見てから決めたい"],
  ["handle_size", "60cmは大きすぎないか不安"],
  ["handle_delivery", "海外への送料と納期はどうなる"],
  ["handle_cancellation", "注文後にキャンセルできますか"],
  ["handle_comparison", "二つの作品で迷っています。違いは何ですか"],
  ["handle_comparison", "WhiteWallへ直接注文するのと比べ、33万円の差額を証拠で説明できますか"],
  ["handle_evidence", "作者署名、真正性証明、WhiteWall認定、実物写真を提示できますか"],
  ["stop", "購入しません。Dossierも不要です。営業連絡を止めてください"],
];

// 14 intents x representative phrasing variants = 56 deterministic sales cases.
const variants = ["", "。教えてください", "と思っています", "です", "。購入を検討中です"];
let conversationCases = 0;
for (const [expected, source] of stageCases) {
  for (const suffix of variants.slice(0, 4)) {
    const turn = buildMetalPrintSalesTurn(`${source}${suffix}`, "ja");
    conversationCases += 1;
    check(`conversation:${expected}:${conversationCases}:actual=${turn.stage}`, turn.stage === expected && (turn.text.match(/[？?]/g) ?? []).length <= 1);
  }
}

const close = buildMetalPrintSalesTurn("自宅の書斎に宇宙を感じるDeus sive Natura。壁幅180cm、日本、予算33万円、30日以内、私が購入を決めます", "ja");
check("close marks Dossier-ready", close.readyForDossier && close.stage === "close_to_dossier");
check("non-close does not mark Dossier-ready", !buildMetalPrintSalesTurn("メタルプリントが欲しい", "ja").readyForDossier);

const adversarialHistory = [
  "user: メタルプリントを買う気はありません",
  "assistant: どこへ迎えますか？",
  "user: 自宅ですが33万円を払う理由が分かりません",
  "assistant: 上限予算はどれですか？",
  "user: 上限は15万円未満です。実物proofが未承認なら検討できません",
].join("\n");
check("latest proof objection supersedes old price objection", buildMetalPrintSalesTurn(adversarialHistory, "ja").stage === "handle_proof");
check("latest size objection supersedes old price objection", buildMetalPrintSalesTurn(`${adversarialHistory}\nassistant: 光を教えてください\nuser: 壁幅90cmで60cmは大きすぎないか不安です`, "ja").stage === "handle_size");
check("latest stop supersedes every prior objection", buildMetalPrintSalesTurn(`${adversarialHistory}\nuser: 購入しません。営業連絡を止めてください`, "ja").stage === "stop");
check("explicit sales end is terminal", buildMetalPrintSalesTurn(`${adversarialHistory}\nuser: 営業を終了して、これ以上質問しないでください`, "ja").stage === "stop");
check("declined private consultation is terminal", buildMetalPrintSalesTurn(`${adversarialHistory}\nuser: 非公開相談や購入には進みません`, "ja").stage === "stop");
const evidencePause = buildMetalPrintSalesTurn(`${adversarialHistory}\nuser: 現段階では非公開相談や購入には進みません。証拠が揃ったら再検討します`, "ja");
check("evidence pause respects customer-led restart", evidencePause.stage === "stop" && evidencePause.text.includes("ご自身で再検討を望まれた時だけ"));
check("size method answers exact mockup objection", buildMetalPrintSalesTurn(`${adversarialHistory}\nuser: 壁幅90cmで60cm角の実寸判断方法を教えてください`, "ja").stage === "handle_size");
check("low budget prevents false close", buildMetalPrintSalesTurn("自宅、静けさ、壁幅90cm、日本、上限15万円未満、90日以内、私が決めます", "ja").stage === "nurture_budget");
const dossierAccessStage = buildMetalPrintSalesTurn("user: メタルプリントを検討\nuser: Dossierを見るだけなら個人情報不要ですか。取消条件も確認できますか", "ja").stage;
check(`Dossier access question is answered directly actual=${dossierAccessStage}`, dossierAccessStage === "handle_dossier_access");

const worksMaster = json("public/works/works.json");
const works = worksMaster.items ?? [];
check("catalog has at least 401 works", works.length >= 401);
check("every catalog work has id/title/cover", works.every((work: any) => work.id != null && work.title && work.cover));

const workPage = read("src/app/works/[id]/page.tsx");
const chatUi = read("src/pages/chat.tsx");
const consultationRoute = read("src/app/api/metal-print/consultation/route.ts");
const checkoutRoute = read("src/app/api/metal-print/checkout/route.ts");
const chatApi = read("src/pages/api/chat-experience-v3.ts");
check("all-catalog work page passes workId", workPage.includes("workId=${encodeURIComponent(String(work.id))}"));
check("chat preserves catalog workId", chatUi.includes("CATALOG-WORK:${campaignWorkId}"));
check("catalog candidate is server-validated", consultationRoute.includes('editionId.startsWith("CATALOG-WORK:")') && consultationRoute.includes("loadMergedWorksServer"));
check("catalog candidate checkout remains closed", checkoutRoute.includes("getApprovedMetalPrintOffer") && checkoutRoute.includes("offer_not_approved"));
check("approved checkout requires qualified consultation", checkoutRoute.includes("qualified_consultation_required") && checkoutRoute.includes("dossierAcceptedAt"));
check("chat uses deterministic sales state", chatApi.includes("buildMetalPrintSalesTurn"));
check("selected work gets direct public Dossier CTA", chatApi.includes("selectedMetalEdition") && chatApi.includes("/metal-print/${selectedEdition.slug}"));
check("distress guard precedes VIP sales", chatApi.indexOf("if (distress)") < chatApi.indexOf("else if (vipMetalPrint)"));
check("metal context precedes generic business routing", chatApi.indexOf('else if (vipMetalPrint)') < chatApi.indexOf('else if (officeArt)'));
check("stop removes product CTA", chatApi.includes('metalSalesTurn?.stage === "stop"') && chatApi.includes('plan = { persona: COUNT_PERSONA, mode: "salon" }'));

const passed = assertions.filter((item) => item.pass).length;
const score = Math.round((passed / assertions.length) * 100);
for (const item of assertions.filter((item) => !item.pass)) console.error(`FAIL ${item.label}`);
console.log(`[validate-metal-print-sales-readiness] ${score}/100 — ${passed}/${assertions.length} controls passed; ${conversationCases} sales conversation cases`);
if (score !== 100 || conversationCases < 50) process.exitCode = 1;
