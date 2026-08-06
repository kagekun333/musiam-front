export type MetalPrintActualOrderEvidence = {
  evidenceId: string;
  editionId: string;
  region: "JP" | "US" | "EU";
  paidAt: string;
  fulfilledAt: string;
  grossPaidYen: number;
  orderReferenceHmac: string;
  vendorInvoiceSha256: string;
  productionYen: number;
  shippingYen: number;
  packagingYen: number;
  customsDutyYen: number;
  indirectTaxLiabilityYen: number;
  stripeSettlementSha256: string;
  fulfillmentEvidenceSha256: string;
  trackingReferenceHash: string;
  physicalProofId?: string;
  stripeFeeYen: number;
  fxCostYen: number;
  replacementRequired: boolean;
  replacementCostYen: number;
  reviewToken: string;
};

export type MetalPrintCacCohortEvidence = {
  cohortId: string;
  maturedAt: string;
  uniquePaidCustomerHmacs: string[];
  attributedAcquisitionSpendYen: number;
  measuredOperatingCostYen: number;
  evidenceSha256: string;
  reviewToken: string;
};

export type MetalPrintEconomicsActualLedger = {
  schemaVersion: 1;
  orders: MetalPrintActualOrderEvidence[];
  cacCohorts: MetalPrintCacCohortEvidence[];
  privacy: string;
};

const sha256 = /^[a-f0-9]{64}$/;
const hmac = /^[a-f0-9]{64}$/;
const nonNegativeInteger = (value: number) => Number.isInteger(value) && value >= 0;

export function summarizeMetalPrintEconomicsActuals(ledger: MetalPrintEconomicsActualLedger) {
  if (ledger.schemaVersion !== 1) throw new Error("unsupported economics actual ledger schema");
  const orderIds = new Set<string>();
  const orderReferenceHmacs = new Set<string>();
  for (const order of ledger.orders) {
    if (!/^ACTUAL-[A-Z0-9-]{6,80}$/.test(order.evidenceId) || orderIds.has(order.evidenceId)) throw new Error("invalid or duplicate actual-order evidenceId");
    orderIds.add(order.evidenceId);
    if (!hmac.test(order.orderReferenceHmac) || orderReferenceHmacs.has(order.orderReferenceHmac)) throw new Error(`${order.evidenceId}: invalid or duplicate order-reference HMAC`);
    orderReferenceHmacs.add(order.orderReferenceHmac);
    if (order.reviewToken !== `APPROVE_ECONOMICS_ACTUAL:${order.evidenceId}`) throw new Error(`${order.evidenceId}: Human review token missing`);
    if (!sha256.test(order.vendorInvoiceSha256) || !sha256.test(order.stripeSettlementSha256) || !sha256.test(order.fulfillmentEvidenceSha256) || !sha256.test(order.trackingReferenceHash)) throw new Error(`${order.evidenceId}: evidence SHA-256 missing`);
    if (order.physicalProofId !== undefined && !/^proof_[A-Za-z0-9_-]{8,100}$/.test(order.physicalProofId)) throw new Error(`${order.evidenceId}: invalid physical proof reference`);
    if (!Number.isFinite(Date.parse(order.paidAt)) || !Number.isFinite(Date.parse(order.fulfilledAt)) || Date.parse(order.fulfilledAt) < Date.parse(order.paidAt)) throw new Error(`${order.evidenceId}: invalid payment/fulfillment time`);
    for (const value of [order.grossPaidYen, order.productionYen, order.shippingYen, order.packagingYen, order.customsDutyYen, order.indirectTaxLiabilityYen, order.stripeFeeYen, order.fxCostYen, order.replacementCostYen]) {
      if (!nonNegativeInteger(value)) throw new Error(`${order.evidenceId}: monetary values must be non-negative integer JPY`);
    }
    if (order.grossPaidYen === 0) throw new Error(`${order.evidenceId}: zero-gross order cannot prove actual economics`);
    if (order.productionYen === 0) throw new Error(`${order.evidenceId}: zero production cost cannot prove fulfilled actual economics`);
    if (order.stripeFeeYen === 0) throw new Error(`${order.evidenceId}: zero Stripe fee cannot prove actual settlement economics`);
    if (!order.replacementRequired && order.replacementCostYen !== 0) throw new Error(`${order.evidenceId}: replacement cost without replacement`);
  }

  const cohortIds = new Set<string>();
  const paidCustomerHmacs = new Set<string>();
  let attributedAcquisitionSpendYen = 0;
  let measuredOperatingCostYen = 0;
  for (const cohort of ledger.cacCohorts) {
    if (!/^CAC-[A-Z0-9-]{6,80}$/.test(cohort.cohortId) || cohortIds.has(cohort.cohortId)) throw new Error("invalid or duplicate CAC cohortId");
    cohortIds.add(cohort.cohortId);
    if (cohort.reviewToken !== `APPROVE_ECONOMICS_CAC:${cohort.cohortId}`) throw new Error(`${cohort.cohortId}: Human review token missing`);
    if (!sha256.test(cohort.evidenceSha256) || !Number.isFinite(Date.parse(cohort.maturedAt))) throw new Error(`${cohort.cohortId}: invalid evidence`);
    if (!nonNegativeInteger(cohort.attributedAcquisitionSpendYen) || !nonNegativeInteger(cohort.measuredOperatingCostYen)) throw new Error(`${cohort.cohortId}: invalid CAC costs`);
    for (const identity of cohort.uniquePaidCustomerHmacs) {
      if (!hmac.test(identity) || paidCustomerHmacs.has(identity)) throw new Error(`${cohort.cohortId}: invalid or duplicate paid-customer HMAC`);
      paidCustomerHmacs.add(identity);
    }
    attributedAcquisitionSpendYen += cohort.attributedAcquisitionSpendYen;
    measuredOperatingCostYen += cohort.measuredOperatingCostYen;
  }

  const totalGrossPaidYen = ledger.orders.reduce((total, order) => total + order.grossPaidYen, 0);
  const totalObservedVariableCostYen = ledger.orders.reduce((total, order) => total + order.productionYen + order.shippingYen + order.packagingYen + order.customsDutyYen + order.indirectTaxLiabilityYen + order.stripeFeeYen + order.fxCostYen + order.replacementCostYen, 0);
  const measuredCustomerAcquisitionCostYen = paidCustomerHmacs.size > 0
    ? Math.ceil((attributedAcquisitionSpendYen + measuredOperatingCostYen) / paidCustomerHmacs.size)
    : null;
  const totalObservedCostIncludingCacYen = totalObservedVariableCostYen + attributedAcquisitionSpendYen + measuredOperatingCostYen;
  const measuredContributionMarginRate = totalGrossPaidYen > 0 ? (totalGrossPaidYen - totalObservedCostIncludingCacYen) / totalGrossPaidYen : null;
  const replacementUnitsObserved = ledger.orders.filter((order) => order.replacementRequired).length;

  return {
    paidFulfilledOrders: ledger.orders.length,
    vendorPaidInvoices: ledger.orders.length,
    stripeSettlementSamples: ledger.orders.length,
    maturedPaidCustomers: paidCustomerHmacs.size,
    attributedAcquisitionSpendYen: paidCustomerHmacs.size > 0 ? attributedAcquisitionSpendYen : null,
    measuredOperatingCostYen: paidCustomerHmacs.size > 0 ? measuredOperatingCostYen : null,
    measuredCustomerAcquisitionCostYen,
    fulfilledUnitsObserved: ledger.orders.length,
    replacementUnitsObserved,
    measuredReplacementRate: ledger.orders.length > 0 ? replacementUnitsObserved / ledger.orders.length : null,
    totalGrossPaidYen,
    totalObservedVariableCostYen,
    totalObservedCostIncludingCacYen,
    measuredContributionMarginRate,
  };
}
