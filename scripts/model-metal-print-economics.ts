import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const model = JSON.parse(fs.readFileSync(path.join(root, "ops", "metal-print-vip", "economics-assumptions.json"), "utf8"));
const rows: Array<Record<string, number | string | boolean>> = [];

for (const priceYen of model.pricesYen as number[]) {
  for (const fulfillmentYen of model.sensitivity.unitProductionAndFulfillmentYen as number[]) {
    for (const acquisitionYen of model.sensitivity.customerAcquisitionCostYen as number[]) {
      for (const replacementRate of model.sensitivity.replacementReserveRate as number[]) {
        const paymentFeeYen = Math.round(priceYen * model.publicEvidence.domesticCardFeeRate);
        const replacementReserveYen = Math.round(fulfillmentYen * replacementRate);
        const contributionYen = priceYen - fulfillmentYen - acquisitionYen - replacementReserveYen - paymentFeeYen;
        const contributionMarginRate = contributionYen / priceYen;
        rows.push({
          priceYen,
          fulfillmentYen,
          acquisitionYen,
          replacementRate,
          paymentFeeYen,
          replacementReserveYen,
          contributionYen,
          contributionMarginRate: Number(contributionMarginRate.toFixed(4)),
          margin60Pass: contributionMarginRate >= 0.6
        });
      }
    }
  }
}

const byPrice = Object.fromEntries((model.pricesYen as number[]).map((priceYen) => {
  const matches = rows.filter((row) => row.priceYen === priceYen);
  const contributions = matches.map((row) => Number(row.contributionYen));
  return [priceYen, {
    scenarios: matches.length,
    margin60Pass: matches.filter((row) => row.margin60Pass).length,
    minimumContributionYen: Math.min(...contributions),
    maximumContributionYen: Math.max(...contributions)
  }];
}));

console.log(JSON.stringify({ evidenceAsOf: model.evidenceAsOf, warning: model.warning, byPrice }, null, 2));
