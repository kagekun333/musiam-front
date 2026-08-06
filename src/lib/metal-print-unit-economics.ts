export type EconomicsEvidenceClass = "FORMAL_QUOTE" | "PAID_INVOICE" | "MEASURED_ACTUAL";

export type MetalPrintEconomicsInput = {
  priceYen: number;
  productionYen: number;
  shippingYen: number;
  packagingYen: number;
  customsDutyYen: number;
  indirectTaxLiabilityYen: number;
  paymentFeeRate: number;
  paymentFixedFeeYen: number;
  replacementRate: number;
  customerAcquisitionCostYen: number;
  fxRiskReserveYen: number;
};

export function calculateMetalPrintUnitEconomics(input: MetalPrintEconomicsInput) {
  const landedCostYen = input.productionYen
    + input.shippingYen
    + input.packagingYen
    + input.customsDutyYen;
  const paymentFeeYen = Math.ceil(input.priceYen * input.paymentFeeRate + input.paymentFixedFeeYen);
  const replacementReserveYen = Math.ceil(landedCostYen * input.replacementRate);
  const totalVariableCostYen = landedCostYen
    + input.indirectTaxLiabilityYen
    + paymentFeeYen
    + replacementReserveYen
    + input.customerAcquisitionCostYen
    + input.fxRiskReserveYen;
  const contributionYen = input.priceYen - totalVariableCostYen;
  const contributionMarginRate = contributionYen / input.priceYen;
  const maximumCacAt60MarginYen = Math.floor(
    input.priceYen * 0.4
      - landedCostYen
      - input.indirectTaxLiabilityYen
      - paymentFeeYen
      - replacementReserveYen
      - input.fxRiskReserveYen,
  );

  return {
    landedCostYen,
    paymentFeeYen,
    replacementReserveYen,
    totalVariableCostYen,
    contributionYen,
    contributionMarginRate,
    maximumCacAt60MarginYen,
    margin60Pass: contributionMarginRate >= 0.6,
  };
}
