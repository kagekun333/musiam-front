type ExpansionApproval = {
  editionId: string;
  amountJpy: number;
  masterSha256: string;
  approvalToken: string;
};

type ExpansionCandidate = {
  status: string;
  eligibleEditionCount: number;
  plannedApprovedOfferUnits: number;
  approvals: ExpansionApproval[];
  humanDecisionRequired: boolean;
};

type ApprovalRegistry = {
  schemaVersion: number;
  approvedAt: string;
  status: string;
  approvedEditionIds: string[];
  editionApprovals: Array<{
    editionId: string;
    amountJpy: number;
    approvalToken: string;
    approvedAt: string;
    masterSha256?: string;
  }>;
  offer: { currency: string; amountJpy: number; editionSize: number };
  [key: string]: unknown;
};

export function buildExpandedMetalPrintApprovalRegistry(input: {
  candidate: ExpansionCandidate;
  registry: ApprovalRegistry;
  suppliedApprovalTokens: string[];
  approvedAt: string;
  knownEditionIds: string[];
  requiredApprovedUnits: number;
}) {
  const { candidate, registry, suppliedApprovalTokens, approvedAt, knownEditionIds, requiredApprovedUnits } = input;
  if (candidate.status !== "HUMAN_APPROVAL_REQUIRED" || candidate.humanDecisionRequired !== true) throw new Error("expansion approvals are not mechanically eligible");
  if (candidate.eligibleEditionCount !== 3 || candidate.approvals.length !== 3) throw new Error("exactly three eligible expansion Editions are required");
  if (!Number.isFinite(Date.parse(approvedAt))) throw new Error("approvedAt must be a valid ISO timestamp");
  if (registry.offer.currency !== "jpy" || registry.offer.amountJpy !== 330_000 || registry.offer.editionSize !== 3) throw new Error("shared Offer contract changed");
  const known = new Set(knownEditionIds);
  const existing = new Set(registry.approvedEditionIds);
  const supplied = new Set(suppliedApprovalTokens);
  if (supplied.size !== suppliedApprovalTokens.length) throw new Error("duplicate approval token supplied");
  if (new Set(candidate.approvals.map((approval) => approval.editionId)).size !== candidate.approvals.length) throw new Error("duplicate candidate Edition");
  for (const approval of candidate.approvals) {
    const expectedToken = `APPROVE_METAL_PRINT_OFFER:${approval.editionId}:${registry.offer.amountJpy}`;
    if (!known.has(approval.editionId)) throw new Error(`unknown Edition: ${approval.editionId}`);
    if (existing.has(approval.editionId)) throw new Error(`Edition already approved: ${approval.editionId}`);
    if (approval.amountJpy !== registry.offer.amountJpy || approval.approvalToken !== expectedToken) throw new Error(`candidate approval contract invalid: ${approval.editionId}`);
    if (!/^[a-f0-9]{64}$/.test(approval.masterSha256)) throw new Error(`master SHA-256 invalid: ${approval.editionId}`);
    if (!supplied.has(expectedToken)) throw new Error(`exact Human approval token missing: ${approval.editionId}`);
  }
  if (supplied.size !== candidate.approvals.length) throw new Error("unexpected approval token supplied");

  const appended = candidate.approvals.map((approval) => ({
    editionId: approval.editionId,
    amountJpy: approval.amountJpy,
    approvalToken: approval.approvalToken,
    approvedAt,
    masterSha256: approval.masterSha256,
  }));
  const editionApprovals = [...registry.editionApprovals, ...appended];
  const approvedEditionIds = editionApprovals.map((approval) => approval.editionId);
  const approvedUnits = approvedEditionIds.length * registry.offer.editionSize;
  if (approvedUnits < requiredApprovedUnits || approvedUnits !== candidate.plannedApprovedOfferUnits) throw new Error("expanded Offer capacity does not meet the approved-unit contract");
  return {
    ...registry,
    approvedAt,
    approvedEditionIds,
    editionApprovals,
    evidenceBoundary: "Only Editions with exact Human approval tokens and hash-bound mechanically eligible masters are open for controlled made-to-order sales. This does not approve physical print quality, a vendor payment, fulfillment or revenue.",
  };
}

type CatalogCandidate = {
  status: string;
  items: Array<{
    editionId: string;
    workId: string;
    workTitle: string;
    amountJpy: number;
    editionSize: number;
    mechanicallyEligible: boolean;
    approvalToken: string | null;
    master: null | { sha256: string };
  }>;
};

export function buildCatalogMetalPrintApprovalRegistry(input: {
  candidate: CatalogCandidate;
  registry: ApprovalRegistry;
  suppliedApprovalTokens: string[];
  approvedAt: string;
}) {
  const { candidate, registry, suppliedApprovalTokens, approvedAt } = input;
  if (candidate.status !== "HUMAN_APPROVAL_REQUIRED") throw new Error("catalog approvals are not mechanically eligible");
  if (!Number.isFinite(Date.parse(approvedAt))) throw new Error("approvedAt must be a valid ISO timestamp");
  if (registry.offer.currency !== "jpy" || registry.offer.amountJpy !== 330_000 || registry.offer.editionSize !== 3) throw new Error("shared Offer contract changed");
  if (candidate.items.length < 1) throw new Error("at least one catalog Edition is required");
  const supplied = new Set(suppliedApprovalTokens);
  if (supplied.size !== suppliedApprovalTokens.length) throw new Error("duplicate approval token supplied");
  if (new Set(candidate.items.map((item) => item.editionId)).size !== candidate.items.length) throw new Error("duplicate catalog Edition");
  const existing = new Set(registry.approvedEditionIds);
  for (const item of candidate.items) {
    if (!item.editionId.startsWith("CATALOG-WORK:") || item.editionId !== `CATALOG-WORK:${item.workId}`) throw new Error(`catalog identity mismatch: ${item.editionId}`);
    if (!item.workTitle.trim()) throw new Error(`catalog title missing: ${item.editionId}`);
    if (existing.has(item.editionId)) throw new Error(`Edition already approved: ${item.editionId}`);
    if (!item.mechanicallyEligible || !item.master || !/^[a-f0-9]{64}$/.test(item.master.sha256)) throw new Error(`master is not eligible: ${item.editionId}`);
    const expectedToken = `APPROVE_METAL_PRINT_OFFER:${item.editionId}:${registry.offer.amountJpy}`;
    if (item.amountJpy !== registry.offer.amountJpy || item.editionSize !== registry.offer.editionSize || item.approvalToken !== expectedToken) throw new Error(`catalog approval contract invalid: ${item.editionId}`);
    if (!supplied.has(expectedToken)) throw new Error(`exact Human approval token missing: ${item.editionId}`);
  }
  if (supplied.size !== candidate.items.length) throw new Error("unexpected approval token supplied");
  const appended = candidate.items.map((item) => ({
    editionId: item.editionId,
    amountJpy: item.amountJpy,
    approvalToken: item.approvalToken as string,
    approvedAt,
    masterSha256: item.master!.sha256,
    workId: item.workId,
    workTitle: item.workTitle,
  }));
  const editionApprovals = [...registry.editionApprovals, ...appended];
  return {
    ...registry,
    approvedAt,
    approvedEditionIds: editionApprovals.map((approval) => approval.editionId),
    editionApprovals,
    evidenceBoundary: "Only hash-bound Editions with exact Human approval tokens are open for controlled made-to-order sales. This does not prove physical quality, payment, fulfillment or revenue.",
  };
}
