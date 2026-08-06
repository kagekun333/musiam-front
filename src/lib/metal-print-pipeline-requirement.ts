export type PipelineRequirementInput = {
  targetGrossPaidYen: number;
  unitPriceYen: number;
  maturedQualified: number;
  maturedPaid: number;
  fallbackCloseRate?: number;
  minimumObservedCohort?: number;
};

export function wilsonLowerBound(successes: number, trials: number, z = 1.96) {
  if (trials <= 0) return 0;
  const boundedSuccesses = Math.max(0, Math.min(successes, trials));
  const p = boundedSuccesses / trials;
  const denominator = 1 + (z * z) / trials;
  const centre = p + (z * z) / (2 * trials);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * trials)) / trials);
  return Math.max(0, (centre - margin) / denominator);
}

export function calculatePipelineRequirement(input: PipelineRequirementInput) {
  const fallbackCloseRate = input.fallbackCloseRate ?? 0.1;
  const minimumObservedCohort = input.minimumObservedCohort ?? 30;
  const observedRateEligible = input.maturedQualified >= minimumObservedCohort;
  const observedCloseRateLowerBound = observedRateEligible
    ? wilsonLowerBound(input.maturedPaid, input.maturedQualified)
    : null;
  const planningCloseRate = Math.min(
    fallbackCloseRate,
    observedCloseRateLowerBound ?? fallbackCloseRate,
  );
  const paidOrdersNeeded = Math.ceil(input.targetGrossPaidYen / input.unitPriceYen);
  const requiredQualifiedProspects = planningCloseRate > 0
    ? Math.ceil(paidOrdersNeeded / planningCloseRate)
    : Number.POSITIVE_INFINITY;

  return {
    source: observedRateEligible ? "95% Wilson lower bound capped by fallback" : "conservative fallback",
    observedRateEligible,
    observedCloseRateLowerBound,
    planningCloseRate,
    paidOrdersNeeded,
    requiredQualifiedProspects,
    requiredQualifiedPipelineYen: Number.isFinite(requiredQualifiedProspects)
      ? requiredQualifiedProspects * input.unitPriceYen
      : null,
  };
}
