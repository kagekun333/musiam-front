import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { METAL_PRINT_VIP_EDITIONS } from "../src/lib/metal-print-vip";
import { getApprovedMetalPrintOffer } from "../src/lib/metal-print-offers.server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const opsRoot = path.join(root, "ops", "metal-print-vip");

type Mission = {
  status: string;
  objective: {
    monthlyGrossPaidMinYen: number;
    monthlyPaidUnitMin: number;
    soldOutEditionTarget: number;
    unitsPerEdition: number;
    monthlyInventoryCapacity: number;
  };
  pricing: { anchorYen: number; closeYen: number; decisiveCloseYen: number; decisiveCloseUnitCap: number };
  authority: Record<string, string>;
};

type State = {
  phase: string;
  editionLocks: { editionId: string; workTitle?: string; salePermissionStatus?: string; unitLimit: number; unitsPaid: number; lockStatus: string }[];
  assetReadiness?: {
    status: "source_mount_unavailable" | "awaiting_proof" | "verified";
    provisionalMinimumLongSidePx: number;
    shortlistMasterLongSidePx: number;
  };
  sales: { editionId: string; priceYen: number; paymentStatus: "pending" | "paid" | "refunded" }[];
  decisiveCloseUnitsUsed: number;
};

type EditionTemplate = {
  editions: { editionId: string; editionSize: number; serials: string[]; lockStatus: string }[];
};

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(opsRoot, name), "utf8")) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[validate-metal-print-mission] ${message}`);
}

const mission = readJson<Mission>("mission.json");
const state = readJson<State>("state.json");
const editionTemplate = readJson<EditionTemplate>("edition-locks.template.json");
const { objective, pricing } = mission;

assert(objective.unitsPerEdition === 3, "unitsPerEdition must stay at 3 for this mission");
assert(objective.monthlyInventoryCapacity === objective.soldOutEditionTarget * objective.unitsPerEdition, "inventory capacity must equal sold-out editions × units per edition");
assert(state.editionLocks.length === objective.soldOutEditionTarget, "state must include every target edition");
assert(editionTemplate.editions.length === objective.soldOutEditionTarget, "edition-lock template must include every target edition");
assert(state.assetReadiness, "state must record print-master readiness");
assert(["source_mount_unavailable", "awaiting_proof", "verified"].includes(state.assetReadiness.status), "unknown print-master readiness status");
assert(state.assetReadiness.provisionalMinimumLongSidePx >= 3000, "provisional master threshold is too low");
assert(state.assetReadiness.shortlistMasterLongSidePx >= state.assetReadiness.provisionalMinimumLongSidePx, "candidate master does not meet the provisional threshold");
assert(pricing.anchorYen > pricing.closeYen && pricing.closeYen > pricing.decisiveCloseYen, "pricing tiers must descend anchor > close > decisive");
assert(pricing.decisiveCloseUnitCap >= 0 && pricing.decisiveCloseUnitCap <= objective.monthlyInventoryCapacity, "decisive-close cap is out of range");

const worstCaseGross =
  (objective.monthlyInventoryCapacity - pricing.decisiveCloseUnitCap) * pricing.closeYen
  + pricing.decisiveCloseUnitCap * pricing.decisiveCloseYen;
assert(worstCaseGross >= objective.monthlyGrossPaidMinYen, `discount budget breaks the monthly target: worst case ¥${worstCaseGross.toLocaleString()}`);

const distinctEditionIds = new Set(state.editionLocks.map((edition) => edition.editionId));
assert(distinctEditionIds.size === state.editionLocks.length, "edition IDs must be unique");
for (const edition of state.editionLocks) {
  assert(edition.unitLimit === objective.unitsPerEdition, `${edition.editionId} does not have exactly 3 units`);
  assert(edition.unitsPaid >= 0 && edition.unitsPaid <= edition.unitLimit, `${edition.editionId} paid units are out of range`);
  assert(edition.salePermissionStatus === "confirmed_by_owner_2026-07-18", `${edition.editionId} is missing owner sale permission`);
}
for (const edition of editionTemplate.editions) {
  assert(edition.editionSize === objective.unitsPerEdition, `${edition.editionId} template must be exactly 3 units`);
  assert(edition.serials.join(",") === "1/3,2/3,3/3", `${edition.editionId} template serials are invalid`);
}

const paidSales = state.sales.filter((sale) => sale.paymentStatus === "paid");
const actualDecisiveCloseCount = paidSales.filter((sale) => sale.priceYen === pricing.decisiveCloseYen).length;
assert(actualDecisiveCloseCount === state.decisiveCloseUnitsUsed, "decisive-close usage does not match paid sales");
assert(actualDecisiveCloseCount <= pricing.decisiveCloseUnitCap, "decisive-close budget exceeded");
for (const sale of paidSales) {
  assert(distinctEditionIds.has(sale.editionId), `sale references unknown edition: ${sale.editionId}`);
  assert([pricing.anchorYen, pricing.closeYen, pricing.decisiveCloseYen].includes(sale.priceYen), `sale has an unapproved price: ¥${sale.priceYen}`);
}

if (mission.status === "candidate_not_live" || state.phase === "setup") {
  assert(mission.authority.autonomousPricing === "disabled_pending_live_activation", "candidate mission must not expose autonomous live pricing");
  assert(paidSales.length === 0, "candidate mission cannot contain paid sales");
}
if (state.phase === "live") {
  assert(state.assetReadiness.status === "verified", "live sales require verified print masters");
}

assert(METAL_PRINT_VIP_EDITIONS.length >= objective.soldOutEditionTarget, "public Dossier capacity fell below the monthly mission floor");
for (const edition of METAL_PRINT_VIP_EDITIONS) {
  const localCover = edition.cover.startsWith("/");
  const remoteCover = /^https:\/\/(m\.media-amazon\.com|images-na\.ssl-images-amazon\.com)\//.test(edition.cover);
  assert(localCover || remoteCover, `${edition.id} preview cover must be an approved local or Amazon source`);
  if (localCover) assert(fs.existsSync(path.join(root, "public", edition.cover)), `${edition.id} preview cover is missing: ${edition.cover}`);
  assert(Boolean(getApprovedMetalPrintOffer(edition.id)), `${edition.id} formal Offer is not approved`);
}

const approvedOfferUnits = METAL_PRINT_VIP_EDITIONS.reduce(
  (total, edition) => total + (getApprovedMetalPrintOffer(edition.id) ? edition.format.editionSize : 0),
  0,
);
const maximumApprovedOfferGrossYen = METAL_PRINT_VIP_EDITIONS.reduce((total, edition) => {
  const offer = getApprovedMetalPrintOffer(edition.id);
  return total + (offer ? offer.amountJpy * edition.format.editionSize : 0);
}, 0);
if (mission.status !== "candidate_not_live" && state.phase === "live") {
  assert(approvedOfferUnits >= objective.monthlyPaidUnitMin, `live mission has only ${approvedOfferUnits}/${objective.monthlyPaidUnitMin} approved Offer units`);
  assert(maximumApprovedOfferGrossYen >= objective.monthlyGrossPaidMinYen, `live approved Offers cap gross at ¥${maximumApprovedOfferGrossYen.toLocaleString()}`);
}

console.log(`[validate-metal-print-mission] PASS — inventoryCapacity=${objective.monthlyInventoryCapacity}, approvedOfferCapacity=${approvedOfferUnits}, approvedOfferGrossCap=¥${maximumApprovedOfferGrossYen.toLocaleString()}, decisiveCap=${pricing.decisiveCloseUnitCap}, worstCaseGross=¥${worstCaseGross.toLocaleString()}`);
