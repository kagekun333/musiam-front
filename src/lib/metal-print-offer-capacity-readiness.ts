export type ExpansionEditionReadiness = {
  sourceMountAvailable: boolean;
  printMasterCandidateGenerated: boolean;
};

export function deriveMetalPrintOfferCapacityStatus(editions: ExpansionEditionReadiness[]) {
  if (editions.length !== 3) throw new Error("exactly three expansion Editions required");
  const allMounted = editions.every((edition) => edition.sourceMountAvailable);
  const allCandidates = editions.every((edition) => edition.printMasterCandidateGenerated);
  return {
    allMounted,
    allCandidates,
    status: allCandidates ? "HUMAN_APPROVAL_REQUIRED" as const : allMounted ? "MASTER_GENERATION_REQUIRED" as const : "HUMAN_APPROVAL_NOT_YET_ELIGIBLE" as const,
  };
}
