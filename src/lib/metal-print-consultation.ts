export const METAL_SPACE_TYPES = ["home", "office", "hotel", "wellness", "other"] as const;
export const METAL_BUDGET_BANDS = ["330k_plus", "150k_330k", "under_150k", "undecided"] as const;
export const METAL_PURCHASE_TIMINGS = ["within_30d", "within_90d", "later", "exploring"] as const;
export const METAL_DECISION_ROLES = ["decision_maker", "influencer", "researcher"] as const;
export const METAL_ATTRIBUTION_FIELDS = ["source", "medium", "campaign", "content", "spaceSegment"] as const;

export type MetalPrintAttribution = Partial<Record<(typeof METAL_ATTRIBUTION_FIELDS)[number], string>>;

export type MetalPrintConsultation = {
  email: string;
  editionId: string;
  workTitle: string;
  spaceType: (typeof METAL_SPACE_TYPES)[number];
  budgetBand: (typeof METAL_BUDGET_BANDS)[number];
  purchaseTiming: (typeof METAL_PURCHASE_TIMINGS)[number];
  decisionRole: (typeof METAL_DECISION_ROLES)[number];
  dossierRequested: true;
  purchaseIntentIndicated: boolean;
  contactConsent: true;
} & MetalPrintAttribution;

export type ConsultationQualification = {
  stage: "qualified" | "nurture";
  qualified: boolean;
  pipelineValueJpy: number;
  reasons: string[];
};

export type MetalPrintPreflightDemandRow = {
  editionId: string;
  workTitle: string;
  verifiedRequests: number;
  readyForOfferPreflight: boolean;
};

export const METAL_PRINT_PREFLIGHT_PROMOTION_MIN = 3;

export function rankMetalPrintPreflightDemand(records: Array<Record<string, unknown>>): MetalPrintPreflightDemandRow[] {
  const counts = new Map<string, { editionId: string; workTitle: string; verifiedRequests: number }>();
  for (const record of records) {
    if (record.offerState !== "preflight_required" || typeof record.contactVerifiedAt !== "string") continue;
    const editionId = typeof record.editionId === "string" ? record.editionId : "";
    const workTitle = typeof record.workTitle === "string" ? record.workTitle : "";
    if (!editionId.startsWith("CATALOG-WORK:") || !workTitle) continue;
    const current = counts.get(editionId) ?? { editionId, workTitle, verifiedRequests: 0 };
    current.verifiedRequests += 1;
    counts.set(editionId, current);
  }
  return [...counts.values()]
    .map((row) => ({ ...row, readyForOfferPreflight: row.verifiedRequests >= METAL_PRINT_PREFLIGHT_PROMOTION_MIN }))
    .sort((a, b) => b.verifiedRequests - a.verifiedRequests || a.workTitle.localeCompare(b.workTitle));
}

export function qualifyMetalPrintConsultation(input: MetalPrintConsultation, offerState: "approved" | "preflight_required" = "approved"): ConsultationQualification {
  const reasons: string[] = [];
  if (offerState !== "approved") reasons.push("formal Offer requires artwork, cost and delivery preflight");
  if (input.budgetBand !== "330k_plus") reasons.push("budget below or not confirmed at primary offer");
  if (!(["within_30d", "within_90d"] as string[]).includes(input.purchaseTiming)) reasons.push("purchase timing is beyond 90 days or exploratory");
  if (input.decisionRole !== "decision_maker") reasons.push("decision authority is not confirmed");
  if (!input.purchaseIntentIndicated) reasons.push("provisional purchase intent is not indicated");
  if (!input.spaceType) reasons.push("installation space is missing");
  const qualified = reasons.length === 0;
  return { stage: qualified ? "qualified" : "nurture", qualified, pipelineValueJpy: qualified ? 330_000 : 0, reasons };
}

export function metalPrintConsultationExpiresAt(createdAt: Date, purchaseTiming: MetalPrintConsultation["purchaseTiming"]) {
  const days = purchaseTiming === "within_30d" ? 30 : 90;
  return new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
}
