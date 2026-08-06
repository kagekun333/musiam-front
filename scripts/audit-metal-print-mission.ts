import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const opsRoot = path.join(root, "ops", "metal-print-vip");

const mission = JSON.parse(fs.readFileSync(path.join(opsRoot, "mission.json"), "utf8"));
const state = JSON.parse(fs.readFileSync(path.join(opsRoot, "state.json"), "utf8"));
const paidSales = state.sales.filter((sale: { paymentStatus: string }) => sale.paymentStatus === "paid");
const grossPaid = paidSales.reduce((sum: number, sale: { priceYen: number }) => sum + sale.priceYen, 0);
const decisiveUsed = paidSales.filter((sale: { priceYen: number }) => sale.priceYen === mission.pricing.decisiveCloseYen).length;
const soldOutEditions = state.editionLocks.filter((edition: { unitsPaid: number; unitLimit: number }) => edition.unitsPaid === edition.unitLimit).length;
const targets = mission.weeklyTargets;

let bottleneck = "edition_locks";
let nextAction = "4 Editionの権利・実物仕様・原価・納期をlockし、live activation候補パックを作る。";
if (state.phase !== "live" && state.assetReadiness?.status !== "verified") {
  bottleneck = state.assetReadiness?.status === "awaiting_proof" ? "rights_and_print_proof" : "print_master_assets";
  nextAction = state.assetReadiness?.status === "awaiting_proof"
    ? "4候補の権利、印刷会社の実物proof、物理仕様、原価、納期を確認してEdition offer lockへ進む。"
    : "原画ソースをzero-copyで接続し、4候補の原画・権利・実物仕様・原価・納期を確認してからEdition lockへ進む。";
}
if (state.phase === "live") {
  const steps: [keyof typeof targets, string, string][] = [
    ["namedProspects", "named_prospects", "対象コレクターの定義と許諾済み導線を見直す。"],
    ["previewOptIns", "preview_opt_in", "Previewの価値と主CTAを一変数で改善する。"],
    ["dossierOpened", "dossier_open", "実物証拠・仕様・来歴を先に見せる。"],
    ["purchaseIntent", "purchase_intent", "価格以外の不安を解き、Close価格で明確に案内する。"],
  ];
  const hit = steps.find(([key]) => state.funnel[key] < targets[key]);
  if (hit) {
    bottleneck = hit[1];
    nextAction = hit[2];
  } else if (paidSales.length < targets.paidInFull) {
    bottleneck = "payment_completion";
    nextAction = decisiveUsed < mission.pricing.decisiveCloseUnitCap
      ? "価格だけが最後の障壁である購入意向者へ、半額枠の使用可否を判定する。"
      : "半額枠は使い切ったため、¥300,000以上の成約で決済不安を解く。";
  } else {
    bottleneck = "none";
    nextAction = "販売・返金・Edition残数を監査し、次の週次サイクルへ進む。";
  }
}

const report = {
  mission: mission.missionId,
  phase: state.phase,
  decision: state.phase === "live" ? "OPERATE" : "HOLD",
  grossPaidYen: grossPaid,
  paidUnits: paidSales.length,
  targetGrossPaidYen: mission.objective.monthlyGrossPaidMinYen,
  decisiveCloseUnits: { used: decisiveUsed, remaining: mission.pricing.decisiveCloseUnitCap - decisiveUsed },
  soldOutEditions: { count: soldOutEditions, target: mission.objective.soldOutEditionTarget },
  assetReadiness: state.assetReadiness ?? null,
  bottleneck,
  nextAction
};

console.log(JSON.stringify(report, null, 2));
