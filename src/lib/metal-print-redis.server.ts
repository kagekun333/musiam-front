import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";
import { summarizeMetalPrintRevenue as summarizeRevenueRecords, type MetalPrintPaymentRecord } from "./metal-print-revenue";
import type { MetalFunnelEvent } from "./metal-print-funnel-client";
import type { ChatInterestEvent } from "./chat-interest-funnel-client";
import { rankMetalPrintPreflightDemand } from "./metal-print-consultation";

type Reservation = { editionId: string; serial: string; orderId: string; expiresAt: string };

const RESERVE_LUA = `
if redis.call('EXISTS', KEYS[4]) == 1 then return {-2, ''} end
for i = 1, 3 do
  if redis.call('EXISTS', KEYS[i]) == 0 then
    redis.call('SET', KEYS[i], ARGV[1], 'PXAT', ARGV[2])
    redis.call('SET', KEYS[4], i, 'PXAT', ARGV[2])
    return {i, ARGV[1]}
  end
end
return {0, ''}
`;

const RELEASE_LUA = `
local slot = redis.call('GET', KEYS[4])
if not slot then return 0 end
local slotKey = KEYS[tonumber(slot)]
local current = redis.call('GET', slotKey)
if current and string.find(current, ARGV[1], 1, true) then redis.call('DEL', slotKey) end
redis.call('DEL', KEYS[4])
return 1
`;

const CONFIRM_LUA = `
if redis.call('EXISTS', KEYS[5]) == 1 then return 2 end
if redis.call('EXISTS', KEYS[6]) == 1 then return 2 end
local slot = redis.call('GET', KEYS[4])
if not slot then return 0 end
local slotKey = KEYS[tonumber(slot)]
local current = redis.call('GET', slotKey)
if not current or not string.find(current, ARGV[1], 1, true) then return 0 end
redis.call('SET', slotKey, ARGV[2])
redis.call('SET', KEYS[5], ARGV[3])
redis.call('SET', KEYS[6], ARGV[3] .. '|' .. slot)
redis.call('HSET', KEYS[7], ARGV[4], ARGV[5])
if ARGV[6] ~= '' then redis.call('SADD', KEYS[8], ARGV[6]) end
redis.call('HSET', KEYS[9], ARGV[4], ARGV[7])
redis.call('DEL', KEYS[4])
return 1
`;

const FULFILL_LUA = `
if redis.call('EXISTS', KEYS[2]) == 1 then return 2 end
local current = redis.call('GET', KEYS[1])
if not current or not string.find(current, ARGV[1], 1, true) then return 0 end
local payment = redis.call('HGET', KEYS[3], ARGV[1])
if not payment then return -1 end
local record = cjson.decode(payment)
if record.status ~= 'paid' then return -2 end
if record.fulfillmentState == 'fulfilled' then return 2 end
record.fulfillmentState = 'fulfilled'
record.fulfilledAt = ARGV[3]
record.trackingReferenceHash = ARGV[4]
record.fulfillmentEvidenceSha256 = ARGV[5]
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], 'processed')
redis.call('HSET', KEYS[3], ARGV[1], cjson.encode(record))
redis.call('HSET', KEYS[4], ARGV[1], ARGV[6])
redis.call('HDEL', KEYS[5], ARGV[1])
return 1
`;

const MARK_VENDOR_ORDER_LUA = `
if redis.call('EXISTS', KEYS[2]) == 1 then return 2 end
local payment = redis.call('HGET', KEYS[3], ARGV[1])
if not payment then return -1 end
local paymentRecord = cjson.decode(payment)
if paymentRecord.status ~= 'paid' or paymentRecord.fulfillmentState == 'fulfilled' then return -2 end
local queued = redis.call('HGET', KEYS[1], ARGV[1])
if not queued then return -3 end
local record = cjson.decode(queued)
if record.status == 'PRODUCTION_IN_PROGRESS' then return 2 end
if record.status ~= 'PAID_AWAITING_VENDOR_ORDER' then return -4 end
record.status = 'PRODUCTION_IN_PROGRESS'
record.vendorOrderedAt = ARGV[2]
record.expectedDispatchAt = ARGV[3]
record.vendorOrderEvidenceSha256 = ARGV[4]
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(record))
redis.call('SET', KEYS[2], 'processed')
return 1
`;

const REFUND_LUA = `
if redis.call('EXISTS', KEYS[2]) == 1 then return 2 end
local current = redis.call('GET', KEYS[1])
if not current or not string.find(current, ARGV[1], 1, true) then return 0 end
local payment = redis.call('HGET', KEYS[3], ARGV[1])
if not payment then return -1 end
local record = cjson.decode(payment)
record.refundedAmountJpy = tonumber(ARGV[3])
record.refundedAt = ARGV[4]
local fullRefund = record.refundedAmountJpy >= record.amountJpy
if fullRefund then
  record.status = 'refunded'
else
  record.status = 'partially_refunded'
end
if fullRefund then
  if record.fulfillmentState == 'fulfilled' then
    redis.call('SET', KEYS[1], ARGV[2])
  else
    redis.call('DEL', KEYS[1])
  end
end
redis.call('SET', KEYS[2], 'processed')
redis.call('HSET', KEYS[3], ARGV[1], cjson.encode(record))
if fullRefund and record.consultationId then
  redis.call('SREM', KEYS[4], record.consultationId)
end
if fullRefund then redis.call('HDEL', KEYS[5], ARGV[1]) end
return 1
`;

const CONSULTATION_LUA = `
local previousId = redis.call('GET', KEYS[2])
if previousId then
  if redis.call('SISMEMBER', KEYS[6], previousId) == 1 then return 3 end
  redis.call('ZREM', KEYS[3], previousId)
  redis.call('ZREM', KEYS[4], previousId)
  redis.call('ZREM', KEYS[5], previousId)
  redis.call('DEL', 'metal-print:consultation:' .. previousId)
end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('SET', KEYS[2], ARGV[2])
if ARGV[3] == 'qualified' then
  redis.call('ZADD', KEYS[3], ARGV[4], ARGV[2])
else
  redis.call('ZADD', KEYS[4], ARGV[4], ARGV[2])
end
return previousId and 2 or 1
`;

const COHORT_SUMMARY_LUA = `
local now = tonumber(ARGV[1])
local expired = redis.call('ZCOUNT', KEYS[1], 0, now)
local paidIds = redis.call('SMEMBERS', KEYS[2])
local paidActive = 0
local paidVerified = 0
for _, id in ipairs(paidIds) do
  local expiry = redis.call('ZSCORE', KEYS[1], id)
  if expiry then
    paidVerified = paidVerified + 1
    if tonumber(expiry) > now then paidActive = paidActive + 1 end
  end
end
return {expired + paidActive, paidVerified}
`;

const VERIFY_CONTACT_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local record = cjson.decode(raw)
if record.contactVerifiedAt then return 2 end
if record.expiresAt ~= ARGV[1] then return -1 end
record.contactVerifiedAt = ARGV[2]
redis.call('SET', KEYS[1], cjson.encode(record))
if record.stage == 'qualified' then redis.call('ZADD', KEYS[2], ARGV[3], record.consultationId) end
return 1
`;

const ACCEPT_DOSSIER_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local record = cjson.decode(raw)
if not record.contactVerifiedAt then return -1 end
if record.expiresAt ~= ARGV[1] then return -2 end
if tonumber(ARGV[2]) <= tonumber(ARGV[3]) then return -3 end
if record.dossierAcceptedAt and record.purchaseIntentConfirmedAt and record.proofDisclosureAcceptedAt and record.madeToOrderTermsAcceptedAt then return 2 end
record.dossierAcceptedAt = ARGV[4]
record.purchaseIntentConfirmedAt = ARGV[4]
record.proofDisclosureAcceptedAt = ARGV[4]
record.madeToOrderTermsAcceptedAt = ARGV[4]
redis.call('SET', KEYS[1], cjson.encode(record))
return 1
`;

let redis: Redis | null = null;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis is not configured");
  }
  if (!redis) redis = new Redis({ url, token });
  return redis;
}

function keys(editionId: string, orderId: string, eventId?: string, paymentIntentId?: string) {
  const prefix = `metal-print:${editionId}`;
  return [
    `${prefix}:serial:1`,
    `${prefix}:serial:2`,
    `${prefix}:serial:3`,
    `metal-print:order:${orderId}`,
    `metal-print:event:${eventId ?? "none"}`,
    `metal-print:payment:${paymentIntentId ?? "none"}`,
  ];
}

export async function reserveMetalPrint(editionId: string, orderId: string, expiresAt: Date): Promise<Reservation> {
  const reservationBase = JSON.stringify({ status: "reserved", editionId, orderId });
  const result = await getRedis().eval<[string, string], [number, string]>(
    RESERVE_LUA,
    keys(editionId, orderId).slice(0, 4),
    [reservationBase, String(expiresAt.getTime())],
  );
  const serialNumber = Number(result[0]);
  if (serialNumber === -2) throw new Error(`order already reserved: ${orderId}`);
  if (serialNumber === 0) throw new Error(`edition sold out: ${editionId}`);
  return { editionId, serial: `${serialNumber}/3`, orderId, expiresAt: expiresAt.toISOString() };
}

export async function releaseMetalPrintReservation(editionId: string, orderId: string): Promise<void> {
  await getRedis().eval(RELEASE_LUA, keys(editionId, orderId).slice(0, 4), [orderId]);
}

export async function confirmMetalPrintPayment(input: {
  editionId: string;
  orderId: string;
  eventId: string;
  paymentIntentId: string;
  amountJpy: number;
  paidAt: string;
  consultationId?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  dossierAcceptedAt?: string;
  purchaseIntentConfirmedAt?: string;
  proofDisclosureAcceptedAt?: string;
  madeToOrderTermsAcceptedAt?: string;
}): Promise<"confirmed" | "duplicate"> {
  const paidValue = JSON.stringify({ status: "paid", ...input });
  const paymentMap = `${input.editionId}|${input.orderId}`;
  const paymentRecord: MetalPrintPaymentRecord = {
    paymentIntentId: input.paymentIntentId,
    editionId: input.editionId,
    orderId: input.orderId,
    consultationId: input.consultationId,
    amountJpy: input.amountJpy,
    refundedAmountJpy: 0,
    paidAt: input.paidAt,
    fulfillmentState: "unfulfilled",
    status: "paid",
    source: input.source,
    medium: input.medium,
    campaign: input.campaign,
    content: input.content,
    dossierAcceptedAt: input.dossierAcceptedAt,
    purchaseIntentConfirmedAt: input.purchaseIntentConfirmedAt,
    proofDisclosureAcceptedAt: input.proofDisclosureAcceptedAt,
    madeToOrderTermsAcceptedAt: input.madeToOrderTermsAcceptedAt,
  };
  const vendorOrderCandidate = {
    id: `vendor_order_${createHash("sha256").update(`vendor-order:v1\0${input.paymentIntentId}`).digest("hex").slice(0, 24)}`,
    editionId: input.editionId,
    paidAt: input.paidAt,
    amountJpy: input.amountJpy,
    status: "PAID_AWAITING_VENDOR_ORDER",
    requiredAction: "Prepare the locked vendor packet, verify destination and landed-cost ceiling, then place exactly one made-to-order unit using collected customer funds.",
    evidenceBoundary: "This queue proves a paid order requires production action. It does not prove a vendor purchase, shipment, delivery or fulfillment.",
  };
  const result = await getRedis().eval<string[], number>(
    CONFIRM_LUA,
    [...keys(input.editionId, input.orderId, input.eventId, input.paymentIntentId), "metal-print:payments", "metal-print:consultations:paid", "metal-print:vendor-order-queue"],
    [input.orderId, paidValue, paymentMap, input.paymentIntentId, JSON.stringify(paymentRecord), input.consultationId ?? "", JSON.stringify(vendorOrderCandidate)],
  );
  if (result === 2) return "duplicate";
  if (result !== 1) throw new Error(`active reservation missing: ${input.orderId}`);
  return "confirmed";
}

export async function applyMetalPrintRefund(input: {
  eventId: string;
  paymentIntentId: string;
  amountRefundedJpy: number;
  refundedAt: string;
}): Promise<"refunded" | "duplicate"> {
  const client = getRedis();
  const paymentKey = `metal-print:payment:${input.paymentIntentId}`;
  const mapping = await client.get<string>(paymentKey);
  if (!mapping) throw new Error(`payment mapping missing: ${input.paymentIntentId}`);
  const [editionId, orderId, serialNumber] = mapping.split("|");
  if (!editionId || !orderId || !/^[123]$/.test(serialNumber)) throw new Error("invalid payment mapping");
  const slotKey = `metal-print:${editionId}:serial:${serialNumber}`;
  const eventKey = `metal-print:event:${input.eventId}`;
  const retired = JSON.stringify({ status: "refunded_retired", editionId, orderId, paymentIntentId: input.paymentIntentId });
  const result = await client.eval<string[], number>(
    REFUND_LUA,
    [slotKey, eventKey, "metal-print:payments", "metal-print:consultations:paid", "metal-print:vendor-order-queue"],
    [input.paymentIntentId, retired, String(input.amountRefundedJpy), input.refundedAt],
  );
  if (result === 2) return "duplicate";
  if (result === -1) throw new Error(`payment ledger missing: ${input.paymentIntentId}`);
  if (result !== 1) throw new Error(`paid serial missing: ${input.paymentIntentId}`);
  return "refunded";
}

export async function markMetalPrintFulfilled(input: {
  eventId: string;
  paymentIntentId: string;
  fulfilledAt: string;
  trackingReferenceHash: string;
  fulfillmentEvidenceSha256: string;
}): Promise<"fulfilled" | "duplicate"> {
  const client = getRedis();
  const mapping = await client.get<string>(`metal-print:payment:${input.paymentIntentId}`);
  if (!mapping) throw new Error(`payment mapping missing: ${input.paymentIntentId}`);
  const [editionId, orderId, serialNumber] = mapping.split("|");
  if (!editionId || !orderId || !/^[123]$/.test(serialNumber)) throw new Error("invalid payment mapping");
  const fulfilled = JSON.stringify({ status: "fulfilled", editionId, orderId, paymentIntentId: input.paymentIntentId, fulfilledAt: input.fulfilledAt });
  const proofCandidate = {
    id: `proof_candidate_${createHash("sha256").update(`proof-review:v1\0${input.paymentIntentId}`).digest("hex").slice(0, 24)}`,
    editionId,
    fulfilledAt: input.fulfilledAt,
    fulfillmentEvidenceSha256: input.fulfillmentEvidenceSha256,
    status: "AWAITING_RECEIPT_REVIEW",
    requiredHumanEvidence: ["receipt photos", "same-process confirmation", "eight quality scores", "ACCEPT or REVISE decision"],
    evidenceBoundary: "Fulfillment creates a review candidate only. It is not an approved physical proof until a Human reviews the received object and explicitly accepts it.",
  };
  const result = await client.eval<string[], number>(
    FULFILL_LUA,
    [`metal-print:${editionId}:serial:${serialNumber}`, `metal-print:event:${input.eventId}`, "metal-print:payments", "metal-print:proof-review-candidates", "metal-print:vendor-order-queue"],
    [input.paymentIntentId, fulfilled, input.fulfilledAt, input.trackingReferenceHash, input.fulfillmentEvidenceSha256, JSON.stringify(proofCandidate)],
  );
  if (result === 2) return "duplicate";
  if (result === -1) throw new Error(`payment ledger missing: ${input.paymentIntentId}`);
  if (result === -2) throw new Error(`payment is not fulfillable: ${input.paymentIntentId}`);
  if (result !== 1) throw new Error(`paid serial missing: ${input.paymentIntentId}`);
  return "fulfilled";
}

export async function markMetalPrintVendorOrderPlaced(input: {
  eventId: string;
  paymentIntentId: string;
  vendorOrderedAt: string;
  expectedDispatchAt: string;
  vendorOrderEvidenceSha256: string;
}): Promise<"production_in_progress" | "duplicate"> {
  const result = await getRedis().eval<string[], number>(
    MARK_VENDOR_ORDER_LUA,
    ["metal-print:vendor-order-queue", `metal-print:event:${input.eventId}`, "metal-print:payments"],
    [input.paymentIntentId, input.vendorOrderedAt, input.expectedDispatchAt, input.vendorOrderEvidenceSha256],
  );
  if (result === 2) return "duplicate";
  if (result === -1) throw new Error("payment ledger missing");
  if (result === -2) throw new Error("payment is not production eligible");
  if (result === -3) throw new Error("vendor-order queue missing");
  if (result !== 1) throw new Error("vendor-order transition failed");
  return "production_in_progress";
}

export async function summarizeMetalPrintProofReviewCandidates() {
  const values = await getRedis().hvals("metal-print:proof-review-candidates") as unknown[];
  const candidates = values.flatMap((value) => {
    try {
      const candidate = (typeof value === "string" ? JSON.parse(value) : value) as Record<string, unknown>;
      if (typeof candidate.id !== "string" || typeof candidate.editionId !== "string" || candidate.status !== "AWAITING_RECEIPT_REVIEW") return [];
      return [{ id: candidate.id, editionId: candidate.editionId, fulfilledAt: candidate.fulfilledAt, status: candidate.status }];
    } catch {
      return [];
    }
  });
  return {
    awaitingReceiptReview: candidates.length,
    candidates,
    evidenceBoundary: "These are fulfilled-order review candidates, not approved proofs. Human receipt review and explicit ACCEPT remain mandatory.",
  };
}

export async function summarizeMetalPrintVendorOrderQueue(now = Date.now()) {
  const client = getRedis();
  const [queued, notifications] = await Promise.all([
    client.hgetall<Record<string, Record<string, unknown>>>("metal-print:vendor-order-queue"),
    client.hgetall<Record<string, { ok?: boolean }>>("metal-print:vendor-order-notifications"),
  ]);
  const activePaymentIds = Object.keys(queued ?? {});
  const candidates = Object.values(queued ?? {}).flatMap((value) => {
    try {
      const candidate = (typeof value === "string" ? JSON.parse(value) : value) as Record<string, unknown>;
      if (typeof candidate.id !== "string" || typeof candidate.editionId !== "string" || typeof candidate.paidAt !== "string" || !["PAID_AWAITING_VENDOR_ORDER", "PRODUCTION_IN_PROGRESS"].includes(String(candidate.status))) return [];
      const ageHours = Math.max(0, (now - Date.parse(candidate.paidAt)) / 3_600_000);
      const awaitingVendorOrder = candidate.status === "PAID_AWAITING_VENDOR_ORDER";
      const expectedDispatchAt = typeof candidate.expectedDispatchAt === "string" ? candidate.expectedDispatchAt : null;
      return [{ id: candidate.id, editionId: candidate.editionId, paidAt: candidate.paidAt, ageHours, stale: awaitingVendorOrder && ageHours >= 24, status: candidate.status, expectedDispatchAt, dispatchOverdue: candidate.status === "PRODUCTION_IN_PROGRESS" && expectedDispatchAt !== null && Date.parse(expectedDispatchAt) < now }];
    } catch {
      return [];
    }
  }).sort((a, b) => b.ageHours - a.ageHours);
  return {
    awaitingVendorOrder: candidates.filter((candidate) => candidate.status === "PAID_AWAITING_VENDOR_ORDER").length,
    productionInProgress: candidates.filter((candidate) => candidate.status === "PRODUCTION_IN_PROGRESS").length,
    staleOver24h: candidates.filter((candidate) => candidate.stale).length,
    dispatchOverdue: candidates.filter((candidate) => candidate.dispatchOverdue).length,
    notificationFailures: activePaymentIds.filter((paymentId) => notifications?.[paymentId]?.ok !== true).length,
    candidates,
    evidenceBoundary: "Awaiting records prove paid orders require action. Production records require a vendor-order evidence hash but do not prove shipment or fulfillment.",
  };
}

export async function saveMetalPrintVendorOrderNotification(input: {
  paymentIntentId: string;
  attemptedAt: string;
  ok: boolean;
  error?: string;
}) {
  await getRedis().hset("metal-print:vendor-order-notifications", { [input.paymentIntentId]: input });
}

export type MetalPrintProductionVerificationReceipt = {
  runId: string;
  eventId: string;
  eventType: "checkout.session.expired";
  checkoutSessionId: string;
  editionId: string;
  orderId: string;
  receivedAt: string;
};

export async function recordMetalPrintProductionVerification(
  receipt: MetalPrintProductionVerificationReceipt,
): Promise<void> {
  await getRedis().set(
    `metal-print:production-verification:${receipt.runId}`,
    receipt,
    { ex: 24 * 60 * 60 },
  );
}

export async function getMetalPrintProductionVerification(
  runId: string,
): Promise<MetalPrintProductionVerificationReceipt | null> {
  return await getRedis().get<MetalPrintProductionVerificationReceipt>(
    `metal-print:production-verification:${runId}`,
  );
}

export async function summarizeMetalPrintRevenue(month: string) {
  const values = await getRedis().hvals("metal-print:payments") as unknown[];
  const records = values.map((value: unknown) => typeof value === "string" ? JSON.parse(value) : value) as MetalPrintPaymentRecord[];
  return summarizeRevenueRecords(records, month);
}

export async function saveMetalPrintConsultation(input: {
  consultationId: string;
  identityHash: string;
  createdAt: string;
  expiresAt: string;
  email: string;
  editionId: string;
  workTitle: string;
  spaceType: string;
  budgetBand: string;
  purchaseTiming: string;
  decisionRole: string;
  dossierRequested: true;
  purchaseIntentIndicated: boolean;
  offerState: "approved" | "preflight_required";
  stage: "qualified" | "nurture";
  pipelineValueJpy: number;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  spaceSegment?: string;
}): Promise<void> {
  const key = `metal-print:consultation:${input.consultationId}`;
  const identityKey = `metal-print:consultation-identity:${input.identityHash}`;
  const qualifiedKey = "metal-print:consultations:qualified";
  const nurtureKey = "metal-print:consultations:nurture";
  const qualifiedCohortKey = "metal-print:consultations:qualified-cohort";
  const result = await getRedis().eval<string[], number>(
    CONSULTATION_LUA,
    [key, identityKey, qualifiedKey, nurtureKey, qualifiedCohortKey, "metal-print:consultations:paid"],
    [JSON.stringify(input), input.consultationId, input.stage, String(new Date(input.expiresAt).getTime())],
  );
  if (result === 3) throw new Error("paid consultation cannot be replaced");
  if (result !== 1 && result !== 2) throw new Error(`consultation save failed: ${input.consultationId}`);
}

export async function getMetalPrintConsultation(consultationId: string) {
  return getRedis().get<{
    consultationId: string;
    editionId: string;
    workTitle: string;
    stage: "qualified" | "nurture";
    expiresAt: string;
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    spaceSegment?: string;
    contactVerifiedAt?: string;
    dossierAcceptedAt?: string;
    purchaseIntentConfirmedAt?: string;
    proofDisclosureAcceptedAt?: string;
    madeToOrderTermsAcceptedAt?: string;
  }>(`metal-print:consultation:${consultationId}`);
}

export async function acceptMetalPrintDossier(input: { consultationId: string; expiresAt: string; acceptedAt: string }) {
  const result = await getRedis().eval<string[], number>(
    ACCEPT_DOSSIER_LUA,
    [`metal-print:consultation:${input.consultationId}`],
    [input.expiresAt, String(new Date(input.expiresAt).getTime()), String(Date.now()), input.acceptedAt],
  );
  if (result === 2) return "duplicate" as const;
  if (result !== 1) throw new Error(`Dossier acceptance failed: ${result}`);
  return "accepted" as const;
}

export async function verifyMetalPrintConsultationContact(input: { consultationId: string; expiresAt: string; verifiedAt: string }) {
  const result = await getRedis().eval<string[], number>(
    VERIFY_CONTACT_LUA,
    [`metal-print:consultation:${input.consultationId}`, "metal-print:consultations:qualified-cohort"],
    [input.expiresAt, input.verifiedAt, String(new Date(input.expiresAt).getTime())],
  );
  if (result === 2) return "duplicate" as const;
  if (result !== 1) throw new Error("consultation contact verification failed");
  return "verified" as const;
}

export async function saveMetalPrintConsultationNotification(input: {
  consultationId: string;
  attemptedAt: string;
  expiresAt: string;
  ok: boolean;
  error?: string;
}) {
  await getRedis().set(`metal-print:consultation-notification:${input.consultationId}`, input, {
    pxat: new Date(input.expiresAt).getTime(),
  });
}

export async function saveMetalPrintContactVerificationDelivery(input: {
  consultationId: string;
  attemptedAt: string;
  expiresAt: string;
  ok: boolean;
  error?: string;
}) {
  await getRedis().set(`metal-print:consultation-contact-verification:${input.consultationId}`, input, {
    pxat: new Date(input.expiresAt).getTime(),
  });
}

export async function summarizeMetalPrintConsultations() {
  const client = getRedis();
  const now = Date.now();
  await Promise.all([
    client.zremrangebyscore("metal-print:consultations:qualified", 0, now),
    client.zremrangebyscore("metal-print:consultations:nurture", 0, now),
  ]);
  const [qualified, nurture, cohort, activeQualifiedIds, activeNurtureIds] = await Promise.all([
    client.zcard("metal-print:consultations:qualified"),
    client.zcard("metal-print:consultations:nurture"),
    client.eval<[string], [number, number]>(
      COHORT_SUMMARY_LUA,
      ["metal-print:consultations:qualified-cohort", "metal-print:consultations:paid"],
      [String(now)],
    ),
    client.zrange<string[]>("metal-print:consultations:qualified", 0, -1),
    client.zrange<string[]>("metal-print:consultations:nurture", 0, -1),
  ]);
  const activeIds = [...activeQualifiedIds, ...activeNurtureIds];
  const [records, notifications, contactVerificationDeliveries] = activeIds.length ? await Promise.all([
    Promise.all(activeIds.map((id) => client.get<Record<string, unknown>>(`metal-print:consultation:${id}`))),
    Promise.all(activeIds.map((id) => client.get<{ ok?: boolean }>(`metal-print:consultation-notification:${id}`))),
    Promise.all(activeIds.map((id) => client.get<{ ok?: boolean }>(`metal-print:consultation-contact-verification:${id}`))),
  ]) : [[], [], []];
  const notificationFailures = notifications.filter((notification) => notification?.ok !== true).length;
  const contactVerificationFailures = contactVerificationDeliveries.filter((delivery) => delivery?.ok !== true).length;
  const contactVerificationSent = contactVerificationDeliveries.filter((delivery) => delivery?.ok === true).length;
  const verifiedRecords = records.filter((record) => typeof record?.contactVerifiedAt === "string");
  const unverified = records.length - verifiedRecords.length;
  const qualifiedVerified = verifiedRecords.filter((record) => record?.stage === "qualified").length;
  const nurtureVerified = verifiedRecords.filter((record) => record?.stage !== "qualified").length;
  const preflightRequested = verifiedRecords.filter((record) => record?.offerState === "preflight_required").length;
  const preflightDemandByWork = rankMetalPrintPreflightDemand(verifiedRecords.filter((record): record is Record<string, unknown> => Boolean(record)));
  const offerPreflightCandidates = preflightDemandByWork.filter((row) => row.readyForOfferPreflight);
  const dossierAccepted = verifiedRecords.filter((record) => typeof record?.dossierAcceptedAt === "string").length;
  const purchaseIntent = verifiedRecords.filter((record) => typeof record?.purchaseIntentConfirmedAt === "string").length;
  const byCampaign: Record<string, { qualified: number; nurture: number }> = {};
  const byPlacement: Record<string, { campaign: string; locale: "ja" | "en" | "unknown"; source: string; content: string; qualified: number; nurture: number; dossierAccepted: number; purchaseIntent: number; pipelineValueJpy: number }> = {};
  for (const record of verifiedRecords) {
    if (!record) continue;
    const campaign = typeof record.campaign === "string" && record.campaign ? record.campaign : "direct";
    const bucket = byCampaign[campaign] ?? { qualified: 0, nurture: 0 };
    if (record.stage === "qualified") bucket.qualified += 1;
    else bucket.nurture += 1;
    byCampaign[campaign] = bucket;
    const source = typeof record.source === "string" && record.source ? record.source : "direct";
    const content = typeof record.content === "string" && record.content ? record.content : "none";
    const placementKey = JSON.stringify([campaign, source, content]);
    const placement = byPlacement[placementKey] ?? {
      campaign,
      locale: campaignLocale(campaign),
      source,
      content,
      qualified: 0,
      nurture: 0,
      dossierAccepted: 0,
      purchaseIntent: 0,
      pipelineValueJpy: 0,
    };
    if (typeof record.dossierAcceptedAt === "string") placement.dossierAccepted += 1;
    if (typeof record.purchaseIntentConfirmedAt === "string") placement.purchaseIntent += 1;
    if (record.stage === "qualified") {
      placement.qualified += 1;
      placement.pipelineValueJpy += 330_000;
    } else placement.nurture += 1;
    byPlacement[placementKey] = placement;
  }
  const pipelineValueJpy = qualifiedVerified * 330_000;
  const targetRevenueJpy = 3_000_000;
  return {
    qualified: qualifiedVerified,
    nurture: nurtureVerified,
    preflightRequested,
    preflightDemandByWork,
    offerPreflightCandidates,
    unverified,
    total: qualifiedVerified + nurtureVerified,
    pipelineValueJpy,
    coverageMultiple: pipelineValueJpy / targetRevenueJpy,
    minimum4xPassed: pipelineValueJpy >= targetRevenueJpy * 4,
    strong10xPassed: pipelineValueJpy >= targetRevenueJpy * 10,
    dossierAccepted,
    purchaseIntent,
    maturedQualified: Number(cohort[0]),
    maturedQualifiedPaid: Number(cohort[1]),
    byCampaign,
    byPlacement,
    notificationFailures,
    contactVerificationSent,
    contactVerificationFailures,
    deduplication: "latest consultation per HMAC identity; only email-verified active records count; unapproved catalog requests remain preflight demand with zero pipeline value; Dossier acceptance and purchase intent require a separate post-review confirmation",
    expiryPolicy: "within_30d expires after 30 days; all other records expire after 90 days",
  };
}

const FUNNEL_EVENTS: MetalFunnelEvent[] = ["metal_home_view", "metal_home_cta_click", "metal_dossier_view", "metal_chat_start", "metal_salon_open", "metal_first_message", "metal_duke", "metal_edition_selected", "metal_consultation_submitted"];

type PlacementDimension = { campaign: string; locale: "ja" | "en" | "unknown"; source: string; content: string };

export function isMetalPrintVerificationTraffic(input: { campaign: string; source: string; medium?: string }) {
  return input.campaign.startsWith("verification_") || input.source === "e2e" || input.medium === "verification";
}

function campaignLocale(campaign: string): PlacementDimension["locale"] {
  if (campaign.includes("metal_print_inbound_en")) return "en";
  if (campaign.includes("metal_print_inbound")) return "ja";
  return "unknown";
}

function placementDimension(input: { campaign: string; source: string; content: string }): PlacementDimension {
  return {
    campaign: input.campaign,
    locale: campaignLocale(input.campaign),
    source: input.source,
    content: input.content,
  };
}

function placementStorageKey(namespace: string, dimension: PlacementDimension, event: MetalFunnelEvent) {
  return `${namespace}:placement:${encodeURIComponent(JSON.stringify([dimension.campaign, dimension.source, dimension.content]))}:${event}`;
}

export async function recordMetalPrintFunnelEvent(input: {
  event: MetalFunnelEvent;
  anonymousSessionId: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  spaceSegment: string;
  occurredAt: number;
}) {
  const client = getRedis();
  const namespace = isMetalPrintVerificationTraffic(input) ? "metal-print:funnel-verification" : "metal-print:funnel";
  const eventKey = `${namespace}:${input.event}`;
  const campaignKey = `${namespace}:campaign:${input.campaign}:${input.event}`;
  const placement = placementDimension(input);
  const placementKey = placementStorageKey(namespace, placement, input.event);
  const member = `${input.anonymousSessionId}|${input.source}|${input.medium}|${input.content}|${input.spaceSegment}`;
  const cutoff = input.occurredAt - 45 * 24 * 60 * 60 * 1000;
  await Promise.all([
    client.zadd(eventKey, { score: input.occurredAt, member }),
    client.zadd(campaignKey, { score: input.occurredAt, member }),
    client.zadd(placementKey, { score: input.occurredAt, member: input.anonymousSessionId }),
    client.sadd(`${namespace}:campaigns`, input.campaign),
    client.sadd(`${namespace}:placements`, JSON.stringify(placement)),
    client.zremrangebyscore(eventKey, 0, cutoff),
    client.zremrangebyscore(campaignKey, 0, cutoff),
    client.zremrangebyscore(placementKey, 0, cutoff),
  ]);
}

export async function summarizeMetalPrintFunnel(days = 30, mode: "production" | "verification" = "production") {
  const client = getRedis();
  const namespace = mode === "verification" ? "metal-print:funnel-verification" : "metal-print:funnel";
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const [campaigns, placementMembers] = await Promise.all([
    client.smembers(`${namespace}:campaigns`) as Promise<string[]>,
    client.smembers(`${namespace}:placements`) as Promise<unknown[]>,
  ]);
  const placements = placementMembers.flatMap((member) => {
    try {
      const value = (typeof member === "string" ? JSON.parse(member) : member) as PlacementDimension;
      if (!value?.campaign || !value?.source || !value?.content) return [];
      if (mode === "production" && isMetalPrintVerificationTraffic(value)) return [];
      return [value];
    } catch {
      return [];
    }
  });
  const byPlacement = Object.fromEntries(await Promise.all(placements.map(async (placement) => {
    const key = JSON.stringify([placement.campaign, placement.source, placement.content]);
    const placementMetrics = Object.fromEntries(await Promise.all(FUNNEL_EVENTS.map(async (event) => [event, await client.zcount(placementStorageKey(namespace, placement, event), since, "+inf")] as const)));
    return [key, { ...placement, locale: campaignLocale(placement.campaign), metrics: placementMetrics }] as const;
  })));
  const observedPlacements = Object.values(byPlacement);
  const metrics = Object.fromEntries(FUNNEL_EVENTS.map((event) => [event, {
    sessions: observedPlacements.reduce((sum, placement) => sum + Number(placement.metrics[event] ?? 0), 0),
  }]));
  const observedCampaigns = campaigns.filter((campaign) => observedPlacements.some((placement) => placement.campaign === campaign));
  const byCampaign = Object.fromEntries(observedCampaigns.map((campaign) => [campaign, Object.fromEntries(FUNNEL_EVENTS.map((event) => [
    event,
    observedPlacements.filter((placement) => placement.campaign === campaign).reduce((sum, placement) => sum + Number(placement.metrics[event] ?? 0), 0),
  ]))]));
  return { days, mode, metrics, byCampaign, byPlacement, privacy: "Anonymous UUID and bounded campaign dimensions only; no email, IP, or conversation text is stored." };
}

export async function saveMetalPrintOpsHealth(date: string, health: Record<string, unknown>) {
  const client = getRedis();
  await Promise.all([
    client.set("metal-print:ops:last", health),
    client.hset("metal-print:ops:daily", { [date]: health }),
  ]);
}

const CHAT_INTEREST_EVENTS: ChatInterestEvent[] = ["chat_interest_bridge_show", "chat_interest_bridge_accept", "chat_interest_bridge_decline"];

export async function recordChatInterestFunnelEvent(input: { event: ChatInterestEvent; bridgeId: string; anonymousSessionId: string; source: string; campaign: string; content: string; occurredAt: number }) {
  const client = getRedis();
  const cutoff = input.occurredAt - 45 * 24 * 60 * 60 * 1000;
  const eventKey = `chat-interest:funnel:${input.event}`;
  const themeKey = `chat-interest:funnel:theme:${input.bridgeId}:${input.event}`;
  const placement = JSON.stringify([input.campaign, input.source, input.content]);
  const placementKey = `chat-interest:funnel:placement:${input.campaign}:${input.source}:${input.content}:${input.event}`;
  await Promise.all([
    client.zadd(eventKey, { score: input.occurredAt, member: input.anonymousSessionId }),
    client.zadd(themeKey, { score: input.occurredAt, member: input.anonymousSessionId }),
    client.sadd("chat-interest:funnel:themes", input.bridgeId),
    client.sadd("chat-interest:funnel:placements", placement),
    client.zadd(placementKey, { score: input.occurredAt, member: input.anonymousSessionId }),
    client.zremrangebyscore(eventKey, 0, cutoff),
    client.zremrangebyscore(themeKey, 0, cutoff),
    client.zremrangebyscore(placementKey, 0, cutoff),
  ]);
}

export async function summarizeChatInterestFunnel(days = 30) {
  const client = getRedis();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const [themes, placementMembers] = await Promise.all([
    client.smembers("chat-interest:funnel:themes") as Promise<string[]>,
    client.smembers("chat-interest:funnel:placements") as Promise<string[]>,
  ]);
  const metrics = Object.fromEntries(await Promise.all(CHAT_INTEREST_EVENTS.map(async (event) => [event, { sessions: await client.zcount(`chat-interest:funnel:${event}`, since, "+inf") }] as const)));
  const byTheme = Object.fromEntries(await Promise.all(themes.map(async (theme) => [theme, Object.fromEntries(await Promise.all(CHAT_INTEREST_EVENTS.map(async (event) => [event, await client.zcount(`chat-interest:funnel:theme:${theme}:${event}`, since, "+inf")] as const)))] as const)));
  const placements = placementMembers.flatMap((member) => {
    try {
      const [campaign, source, content] = JSON.parse(member) as string[];
      return campaign && source && content ? [{ campaign, source, content }] : [];
    } catch { return []; }
  });
  const byPlacement = Object.fromEntries(await Promise.all(placements.map(async (placement) => {
    const key = JSON.stringify([placement.campaign, placement.source, placement.content]);
    const placementMetrics = Object.fromEntries(await Promise.all(CHAT_INTEREST_EVENTS.map(async (event) => [event, await client.zcount(`chat-interest:funnel:placement:${placement.campaign}:${placement.source}:${placement.content}:${event}`, since, "+inf")] as const)));
    return [key, { ...placement, metrics: placementMetrics }] as const;
  })));
  const shows = metrics.chat_interest_bridge_show.sessions;
  const accepts = metrics.chat_interest_bridge_accept.sessions;
  const declines = metrics.chat_interest_bridge_decline.sessions;
  return {
    days,
    metrics,
    byTheme,
    byPlacement,
    rates: {
      acceptRate: shows > 0 ? accepts / shows : null,
      declineRate: shows > 0 ? declines / shows : null,
    },
    privacy: "Anonymous UUID, bounded bridge theme and bounded UTM source/campaign/content only; no email, IP, conversation text, work title or purchase data is stored.",
  };
}

export async function getMetalPrintOpsHealth() {
  const client = getRedis();
  const [last, daily] = await Promise.all([
    client.get<Record<string, unknown>>("metal-print:ops:last"),
    client.hgetall<Record<string, Record<string, unknown>>>("metal-print:ops:daily"),
  ]);
  return { last, daily: daily ?? {} };
}

export async function getOrSetMetalPrintSprintStartDate(date: string, hasRealTraffic: boolean) {
  const client = getRedis();
  const key = "metal-print:ops:sprint-start-date";
  if (hasRealTraffic) await client.set(key, date, { nx: true });
  return client.get<string>(key);
}
