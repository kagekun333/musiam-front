import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculatePipelineRequirement } from "../src/lib/metal-print-pipeline-requirement";
import { calculateMetalPrintUnitEconomics } from "../src/lib/metal-print-unit-economics";
import { getMetalPrintApprovedOfferCapacity } from "../src/lib/metal-print-offers.server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assurancePath = path.join(root, "ops", "metal-print-vip", "assurance.json");
const assurance = JSON.parse(fs.readFileSync(assurancePath, "utf8"));
const mission = JSON.parse(fs.readFileSync(
  path.join(root, "ops", "metal-print-vip", "mission.json"),
  "utf8",
));
const economicsEvidence = JSON.parse(fs.readFileSync(
  path.join(root, "ops", "metal-print-vip", "economics-evidence-ledger.json"),
  "utf8",
));
const economicsActuals = JSON.parse(fs.readFileSync(
  path.join(root, "ops", "metal-print-vip", "economics-actuals-evidence.json"),
  "utf8",
));
const vendorEvidence = JSON.parse(fs.readFileSync(
  path.join(root, "ops", "metal-print-vip", "vendor-evidence-ledger.json"),
  "utf8",
));
const proofEvidence = JSON.parse(fs.readFileSync(
  path.join(root, "ops", "metal-print-vip", "proof-evidence-ledger.json"),
  "utf8",
));
const pipelineEvidence = JSON.parse(fs.readFileSync(
  path.join(root, "ops", "metal-print-vip", "pipeline-evidence-snapshot.json"),
  "utf8",
));
const revenueEvidence = JSON.parse(fs.readFileSync(
  path.join(root, "ops", "metal-print-vip", "revenue-evidence-snapshot.json"),
  "utf8",
));
const productionConnection = JSON.parse(fs.readFileSync(
  path.join(root, "ops", "metal-print-vip", "production-connection-state.json"),
  "utf8",
));
const providerConnectivity = JSON.parse(fs.readFileSync(
  path.join(root, "ops", "metal-print-vip", "production-provider-connectivity-evidence.json"),
  "utf8",
));
const funnelEvidence = JSON.parse(fs.readFileSync(
  path.join(root, "ops", "metal-print-vip", "first-party-funnel-snapshot.json"),
  "utf8",
));
const productionE2ePath = path.join(root, "ops", "metal-print-vip", "production-sales-e2e-evidence.json");
const productionE2eEvidence = fs.existsSync(productionE2ePath)
  ? JSON.parse(fs.readFileSync(productionE2ePath, "utf8"))
  : null;

type Gate = { id: string; required: boolean; pass: boolean; evidence: string };
const economics = assurance.economics;
const demand = assurance.demand;
const supply = assurance.supply;
const system = assurance.salesSystem;
const threshold = assurance.goThresholds;

const target = economics.targetGrossPaidYen;
const pipelineSnapshotAgeMs = Date.now() - Date.parse(pipelineEvidence.generatedAt);
const pipelineSnapshotLive = pipelineEvidence.evidenceClass === "DURABLE_CONSULTATION_RECORDS"
  && Number.isFinite(pipelineSnapshotAgeMs)
  && pipelineSnapshotAgeMs >= 0
  && pipelineSnapshotAgeMs <= 24 * 60 * 60 * 1000;
const qualifiedProspects = pipelineSnapshotLive ? Number(pipelineEvidence.qualified) : 0;
const qualifiedPipelineValueYen = pipelineSnapshotLive ? Number(pipelineEvidence.pipelineValueJpy) : 0;
const dossierAccepted = pipelineSnapshotLive ? Number(pipelineEvidence.dossierAccepted ?? 0) : 0;
const purchaseIntent = pipelineSnapshotLive ? Number(pipelineEvidence.purchaseIntent ?? 0) : 0;
const pipelineCoverage = qualifiedPipelineValueYen / target;
const revenueSnapshotAgeMs = Date.now() - Date.parse(revenueEvidence.generatedAt);
const revenueSnapshotLive = revenueEvidence.evidenceClass === "DURABLE_STRIPE_PAYMENT_LEDGER"
  && revenueEvidence.month === new Date().toISOString().slice(0, 7)
  && Number.isFinite(revenueSnapshotAgeMs)
  && revenueSnapshotAgeMs >= 0
  && revenueSnapshotAgeMs <= 24 * 60 * 60 * 1000;
const funnelSnapshotAgeMs = Date.now() - Date.parse(funnelEvidence.generatedAt);
const funnelSnapshotLive = funnelEvidence.evidenceClass === "FIRST_PARTY_REDIS_OBSERVED"
  && funnelEvidence.mode === "production"
  && Number.isFinite(funnelSnapshotAgeMs)
  && funnelSnapshotAgeMs >= 0
  && funnelSnapshotAgeMs <= 24 * 60 * 60 * 1000;
const providerConnectivityAgeMs = Date.now() - Date.parse(providerConnectivity.generatedAt);
const providerConnectivityPassed = providerConnectivity.evidenceClass === "LIVE_PROVIDER_READ_AND_EPHEMERAL_REDIS_CANARY"
  && providerConnectivity.stripeApiReachable === true
  && providerConnectivity.matchingEnabledEndpoint === true
  && providerConnectivity.redisRoundTripPassed === true
  && providerConnectivity.canaryDeleted === true
  && Number.isFinite(providerConnectivityAgeMs)
  && providerConnectivityAgeMs >= 0
  && providerConnectivityAgeMs <= 7 * 24 * 60 * 60 * 1000;
const productionE2eAgeMs = productionE2eEvidence ? Date.now() - Date.parse(productionE2eEvidence.generatedAt) : Number.NaN;
const productionE2ePassed = productionE2eEvidence?.evidenceClass === "LIVE_ZERO_PAYMENT_CHECKOUT_EXPIRY_SIGNED_WEBHOOK_REDIS"
  && productionE2eEvidence.stripeCheckoutCreated === true
  && productionE2eEvidence.checkoutExpiredWithoutPayment === true
  && productionE2eEvidence.customerCreated === false
  && productionE2eEvidence.signedWebhookReceived === true
  && productionE2eEvidence.durableRedisReceiptRead === true
  && productionE2eEvidence.reservationReleaseRanBeforeReceipt === true
  && Number.isFinite(productionE2eAgeMs)
  && productionE2eAgeMs >= 0
  && productionE2eAgeMs <= 7 * 24 * 60 * 60 * 1000;

const maturedQualified = pipelineSnapshotLive ? Number(pipelineEvidence.maturedQualified ?? 0) : 0;
const maturedPaid = pipelineSnapshotLive ? Number(pipelineEvidence.maturedQualifiedPaid ?? 0) : 0;
const minimumObservedCohort = Number(demand.minimumMaturedCohortForObservedRate ?? 30);
const fallbackCloseRate = Number(demand.fallbackQualifiedToPaidRate ?? 0.1);
const pipelineRequirement = calculatePipelineRequirement({
  targetGrossPaidYen: target,
  unitPriceYen: economics.primaryUnitPriceYen,
  maturedQualified,
  maturedPaid,
  minimumObservedCohort,
  fallbackCloseRate,
});
const { planningCloseRate, requiredQualifiedProspects } = pipelineRequirement;

const approvedScenario = economicsEvidence.scenarios.find(
  (scenario: { id: string }) => scenario.id === economicsEvidence.approvedScenarioId,
);
const quoteScenario = economicsEvidence.scenarios.find(
  (scenario: { id: string }) => scenario.id === economicsEvidence.quoteScenarioId,
);
const requiredRegionSet = new Set<string>(economicsEvidence.requiredRegions);
const quotedRegions = new Set<string>(quoteScenario?.regions?.map((region: { region: string }) => region.region) ?? []);
const allRequiredRegionsQuoted = [...requiredRegionSet].every((region) => quotedRegions.has(region));
const approvedRegions = new Set<string>(approvedScenario?.regions?.map((region: { region: string }) => region.region) ?? []);
const allRequiredRegionsCovered = [...requiredRegionSet].every((region) => approvedRegions.has(region));
const quotedRegionEconomics = quoteScenario?.regions?.map((region: Record<string, number | string>) => ({
  region: region.region,
  evidenceClass: region.evidenceClass,
  customerAcquisitionCostEvidenceClass: region.customerAcquisitionCostEvidenceClass,
  ...calculateMetalPrintUnitEconomics({
    priceYen: economics.primaryUnitPriceYen,
    productionYen: Number(region.productionYen),
    shippingYen: Number(region.shippingYen),
    packagingYen: Number(region.packagingYen),
    customsDutyYen: Number(region.customsDutyYen),
    indirectTaxLiabilityYen: Number(region.indirectTaxLiabilityYen),
    paymentFeeRate: Number(region.paymentFeeRate),
    paymentFixedFeeYen: Number(region.paymentFixedFeeYen),
    replacementRate: Number(region.replacementRate),
    customerAcquisitionCostYen: Number(region.customerAcquisitionCostYen),
    fxRiskReserveYen: Number(region.fxRiskReserveYen),
  }),
})) ?? [];
const regionEconomics = approvedScenario?.regions?.map((region: Record<string, number | string>) => ({
  region: region.region,
  evidenceClass: region.evidenceClass,
  ...calculateMetalPrintUnitEconomics({
    priceYen: economics.primaryUnitPriceYen,
    productionYen: Number(region.productionYen),
    shippingYen: Number(region.shippingYen),
    packagingYen: Number(region.packagingYen),
    customsDutyYen: Number(region.customsDutyYen),
    indirectTaxLiabilityYen: Number(region.indirectTaxLiabilityYen),
    paymentFeeRate: Number(region.paymentFeeRate),
    paymentFixedFeeYen: Number(region.paymentFixedFeeYen),
    replacementRate: Number(region.replacementRate),
    customerAcquisitionCostYen: Number(region.customerAcquisitionCostYen),
    fxRiskReserveYen: Number(region.fxRiskReserveYen),
  }),
})) ?? [];
const contributionMarginRate: number | null = regionEconomics.length > 0 && allRequiredRegionsCovered
  ? Math.min(...regionEconomics.map((region: { contributionMarginRate: number }) => region.contributionMarginRate))
  : null;
const comparableVendorQuotes = vendorEvidence.vendors.filter(
  (vendor: { comparableQuote: boolean }) => vendor.comparableQuote,
).length;
const approvedPhysicalProofs = proofEvidence.proofs.filter(
  (proof: { approved: boolean }) => proof.approved,
).length;
const observedEconomicsPassed = Object.values(economicsActuals.gates).every((value) => value === true);
const approvedOfferCapacity = getMetalPrintApprovedOfferCapacity();
const approvedOfferUnits = approvedOfferCapacity.approvedOfferUnits;
const requiredPaidUnits = Number(mission.objective.monthlyPaidUnitMin);
const maximumApprovedOfferGrossYen = approvedOfferCapacity.maximumApprovedOfferGrossYen;

const gates: Gate[] = [
  { id: "economics_inputs", required: true, pass: contributionMarginRate !== null, evidence: "approved JP/US/EU POD quote scenario: live API/platform quote or measured invoice, indirect tax, payment fee, replacement reserve, measured CAC and FX; negotiated contract not required" },
  { id: "economics_region_coverage", required: true, pass: Boolean(quoteScenario) && allRequiredRegionsQuoted, evidence: `${quotedRegions.size}/${requiredRegionSet.size} required regions have live platform quotes` },
  { id: "contribution_margin", required: true, pass: contributionMarginRate !== null && contributionMarginRate >= economics.targetContributionMarginRateMin, evidence: `target >= ${economics.targetContributionMarginRateMin}` },
  { id: "observed_unit_economics", required: true, pass: observedEconomicsPassed, evidence: `${economicsActuals.observed.paidFulfilledOrders}/${economicsActuals.thresholds.paidFulfilledOrdersMin} paid fulfilled orders; ${economicsActuals.observed.stripeSettlementSamples}/${economicsActuals.thresholds.stripeSettlementSamplesMin} Stripe settlements; ${economicsActuals.observed.maturedPaidCustomers}/${economicsActuals.thresholds.maturedPaidCustomersForMeasuredCacMin} matured paid CAC cohort; ${economicsActuals.observed.fulfilledUnitsObserved}/${economicsActuals.thresholds.fulfilledUnitsForReplacementObservationMin} fulfilled replacement cohort` },
  { id: "interviews", required: demand.interviewsRequired === true, pass: demand.interviewsRequired !== true, evidence: "separate demand interviews disabled; sales response is the market signal" },
  { id: "pipeline_snapshot_live", required: true, pass: pipelineSnapshotLive, evidence: `${pipelineEvidence.evidenceClass}; age=${Number.isFinite(pipelineSnapshotAgeMs) ? Math.round(pipelineSnapshotAgeMs / 3_600_000) : "invalid"}h` },
  { id: "funnel_measurement_live", required: true, pass: funnelSnapshotLive, evidence: `${funnelEvidence.evidenceClass}; mode=${funnelEvidence.mode}; age=${Number.isFinite(funnelSnapshotAgeMs) ? Math.round(funnelSnapshotAgeMs / 3_600_000) : "invalid"}h; verification traffic isolated` },
  { id: "qualified_pipeline_count", required: true, pass: qualifiedProspects >= requiredQualifiedProspects, evidence: `${qualifiedProspects}/${Number.isFinite(requiredQualifiedProspects) ? requiredQualifiedProspects : "unbounded"} at ${(planningCloseRate * 100).toFixed(2)}% conservative close rate` },
  { id: "pipeline_4x_minimum", required: true, pass: pipelineCoverage >= demand.minimumPipelineCoverage, evidence: `${pipelineCoverage.toFixed(2)}x/${demand.minimumPipelineCoverage}x` },
  { id: "pipeline_10x_strong", required: true, pass: pipelineCoverage >= demand.requiredPipelineCoverage, evidence: `${pipelineCoverage.toFixed(2)}x/${demand.requiredPipelineCoverage}x` },
  { id: "dossier_accepted", required: true, pass: dossierAccepted >= threshold.dossierAcceptedMin, evidence: `${dossierAccepted}/${threshold.dossierAcceptedMin} explicit active consultation records` },
  { id: "purchase_intent", required: true, pass: purchaseIntent >= threshold.purchaseIntentMin, evidence: `${purchaseIntent}/${threshold.purchaseIntentMin} explicit active consultation records` },
  { id: "vendor_quotes", required: true, pass: comparableVendorQuotes >= threshold.vendorQuotesComparableMin, evidence: `${comparableVendorQuotes}/${threshold.vendorQuotesComparableMin} comparable live API, platform checkout, formal quote or paid-invoice benchmarks; negotiated supplier contract not required` },
  { id: "physical_proof", required: true, pass: approvedPhysicalProofs >= threshold.proofsApprovedMin, evidence: `${approvedPhysicalProofs}/${threshold.proofsApprovedMin} Human-approved physical proofs` },
  { id: "production_capacity", required: true, pass: supply.productionCapacityUnitsConfirmed >= threshold.productionCapacityUnitsMin, evidence: `${supply.productionCapacityUnitsConfirmed}/${threshold.productionCapacityUnitsMin}` },
  { id: "approved_offer_capacity", required: true, pass: approvedOfferUnits >= requiredPaidUnits && maximumApprovedOfferGrossYen >= target, evidence: `${approvedOfferUnits}/${requiredPaidUnits} units in time-valid Human-approved Offers; maximum approved gross ¥${maximumApprovedOfferGrossYen.toLocaleString("en-US")}/¥${target.toLocaleString("en-US")}` },
  { id: "supply_terms", required: true, pass: supply.replacementPolicyConfirmed && supply.deliverySlaConfirmed, evidence: "replacement policy and delivery SLA" },
  { id: "local_sales_e2e", required: true, pass: system.localCheckoutE2ePassed && system.localWebhookE2ePassed && system.localInventoryE2ePassed && system.localRefundE2ePassed, evidence: "offer lock, checkout reservation, webhook, inventory, fulfillment, refund" },
  { id: "provider_config", required: true, pass: productionConnection.readyForSandboxE2e === true || providerConnectivityPassed, evidence: providerConnectivityPassed
    ? `live Stripe API, enabled required-event webhook and Redis canary; age=${Math.round(providerConnectivityAgeMs / 3_600_000)}h`
    : "configured Stripe mode plus live API/endpoint evidence no older than 7 days or sandbox configuration, and Upstash connectivity; values never logged" },
  { id: "production_sales_e2e", required: true, pass: productionE2ePassed || (system.productionCheckoutAdapterPassed && system.productionWebhookSignaturePassed && system.productionPersistencePassed), evidence: productionE2ePassed
    ? `zero-payment live Checkout expiry, signed webhook and durable Redis receipt; age=${Math.round(productionE2eAgeMs / 3_600_000)}h`
    : "provider checkout, signed webhook, durable production persistence" },
  { id: "revenue_snapshot_live", required: true, pass: revenueSnapshotLive, evidence: `${revenueEvidence.evidenceClass}; month=${revenueEvidence.month}; age=${Number.isFinite(revenueSnapshotAgeMs) ? Math.round(revenueSnapshotAgeMs / 3_600_000) : "invalid"}h` },
  { id: "fulfillment_owner", required: true, pass: system.fulfillmentOwnerConfirmed, evidence: "named fulfillment owner" }
];

const paidTargetReached = revenueSnapshotLive && revenueEvidence.netNonRefundedYen >= target;
const failedRequired = gates.filter((gate) => gate.required && !gate.pass);
let decision = "HOLD";
if (failedRequired.length === 0) decision = paidTargetReached ? "TARGET_PROVEN" : "STRONG_GO";

const closeRateScenarios = [0.25, 0.2, 0.15, 0.1, 0.08].map((rate) => ({
  qualifiedToPaidRate: rate,
  qualifiedNeededFor10Paid: Math.ceil(10 / rate),
  coverageAtPrimaryPrice: Math.ceil(10 / rate) * economics.primaryUnitPriceYen / target
}));

console.log(JSON.stringify({
  decision,
  honestClaim: decision === "TARGET_PROVEN"
    ? "月商300万円の実績が決済データで確認済み"
    : decision === "STRONG_GO"
      ? "必要証拠が揃い、月商300万円を狙う強い実行条件が成立"
      : "月商300万円を余裕で達成できるとはまだ断言不可",
  failedRequiredGates: failedRequired,
  contributionMarginRate,
  economicsEvidenceBoundary: {
    launchStressTestPassed: contributionMarginRate !== null && contributionMarginRate >= economics.targetContributionMarginRateMin,
    observedUnitEconomicsPassed: observedEconomicsPassed,
    actuals: economicsActuals.observed,
  },
  regionEconomics,
  quotedRegionEconomics,
  comparableVendorQuotes,
  approvedPhysicalProofs,
  approvedOfferCapacity: {
    approvedEditionIds: approvedOfferCapacity.approvedEditionIds,
    approvedOfferUnits,
    requiredPaidUnits,
    maximumApprovedOfferGrossYen,
    targetGrossPaidYen: target,
  },
  pipelineCoverage,
  pipelineEvidenceClass: pipelineEvidence.evidenceClass,
  funnelEvidenceClass: funnelEvidence.evidenceClass,
  funnelMetrics: funnelSnapshotLive ? funnelEvidence.metrics : null,
  qualifiedProspects,
  qualifiedPipelineValueYen,
  dossierAccepted,
  purchaseIntent,
  revenueEvidenceClass: revenueEvidence.evidenceClass,
  netNonRefundedYen: revenueSnapshotLive ? revenueEvidence.netNonRefundedYen : null,
  pipelineRequirement: {
    ...pipelineRequirement,
    maturedQualified,
    maturedPaid,
  },
  closeRateStressTest: closeRateScenarios
}, null, 2));

if (decision === "HOLD") process.exitCode = 2;
