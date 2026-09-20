import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { POST } from "../src/app/api/metal-print/webhook/route";
import {
  isMetalPrintCheckoutMetadata,
  isMetalPrintRefundMetadata,
  isMetalPrintVerificationMetadata,
  routeMetalPrintCheckoutWebhook,
} from "../src/lib/metal-print-webhook-identity";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(path.join(root, "src/app/api/metal-print/webhook/route.ts"), "utf8");
const checkout = fs.readFileSync(path.join(root, "src/app/api/metal-print/checkout/route.ts"), "utf8");

const unrelatedMetadata = {};
const metalMetadata = {
  product: "vip-metal-print",
  editionId: "VIP-METAL-2026-07-NATURA",
  orderId: "order_test",
};
const incompleteMetalMetadata = { product: "vip-metal-print", editionId: "only-edition" };
const verificationMetadata = {
  product: "vip-metal-print-verification",
  verification: "true",
  verificationRunId: "verify_1234567890123456",
  editionId: "VIP-METAL-2026-07-NATURA",
  orderId: "verification_test",
};

assert.equal(isMetalPrintCheckoutMetadata(unrelatedMetadata), false, "unrelated Checkout must not be classified as metal print");
assert.equal(isMetalPrintRefundMetadata(unrelatedMetadata), false, "unrelated refund must not be classified as metal print");
assert.equal(isMetalPrintCheckoutMetadata(metalMetadata), true, "valid metal-print Checkout must remain eligible");
assert.equal(isMetalPrintRefundMetadata(metalMetadata), true, "valid metal-print refund must remain eligible");
assert.equal(isMetalPrintCheckoutMetadata(incompleteMetalMetadata), false, "incomplete metal-print identity must fail closed");
assert.equal(isMetalPrintVerificationMetadata(verificationMetadata), true, "existing signed verification expiry must remain eligible");
assert.equal(isMetalPrintCheckoutMetadata(verificationMetadata), false, "verification Checkout must not be treated as a paid metal-print Checkout");

assert.equal(routeMetalPrintCheckoutWebhook("checkout.session.completed", unrelatedMetadata), "ignore_non_metal_print", "unrelated completed Checkout must be ignored");
assert.equal(routeMetalPrintCheckoutWebhook("checkout.session.completed", metalMetadata), "process_metal_print", "valid completed Checkout must reach metal-print processing");
assert.equal(routeMetalPrintCheckoutWebhook("checkout.session.completed", incompleteMetalMetadata), "ignore_non_metal_print", "incomplete completed Checkout must fail closed");
assert.equal(routeMetalPrintCheckoutWebhook("checkout.session.expired", unrelatedMetadata), "ignore_non_metal_print", "unrelated expired Checkout must be ignored");
assert.equal(routeMetalPrintCheckoutWebhook("checkout.session.expired", verificationMetadata), "process_verification_expiry", "valid verification expiry must retain its isolated flow");

assert.ok(checkout.includes('metadata: { product: "vip-metal-print"'), "Checkout must preserve the existing product identifier");
assert.ok(checkout.includes('payment_intent_data: { metadata: { product: "vip-metal-print"'), "PaymentIntent must preserve the existing product identifier");
assert.ok(checkout.includes("editionId, orderId"), "Checkout must preserve the existing edition/order identifiers");
assert.ok(route.includes("request.text()"), "signature verification must use the raw request body");
assert.ok(route.includes("routeMetalPrintCheckoutWebhook"), "Checkout events must use the tested routing gate before processing");
assert.ok(route.includes("recordMetalPrintProductionVerification"), "existing verification expiry must retain its isolated record flow");
assert.ok(route.includes("isMetalPrintRefundMetadata"), "refund events must be classified before processing");
assert.ok(route.includes("paymentIntents.retrieve(paymentIntentId)"), "refund classification must use the existing PaymentIntent identifier");
assert.ok(route.includes('reason: "non_metal_print_event"'), "non-metal events must be acknowledged as ignored");
assert.ok(route.includes("Lookup failures intentionally propagate"), "refund lookup failures must remain retryable");
assert.ok(route.includes('error: "event_processing_failed"'), "Stripe lookup failures must return a retryable 5xx response");

const stripe = new Stripe("sk_test_placeholder");
const secret = "whsec_metal_print_webhook_test";
const payload = JSON.stringify({ id: "evt_test", object: "event", type: "checkout.session.expired", data: { object: {} } });
const header = stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: 1_783_900_000 });
assert.equal(stripe.webhooks.constructEvent(payload, header, secret, 10 ** 10).id, "evt_test");
assert.throws(() => stripe.webhooks.constructEvent(`${payload} `, header, secret, 10 ** 10), /signature/i);

async function main() {
  process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
  process.env.STRIPE_METAL_PRINT_WEBHOOK_SECRET = secret;

  async function postSignedEvent(event: Record<string, unknown>) {
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
    timestamp: Math.floor(Date.now() / 1000),
  });
    return POST(new Request("http://localhost/api/metal-print/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body,
    }));
  }

  const invalidSignatureResponse = await POST(new Request("http://localhost/api/metal-print/webhook", {
    method: "POST",
    headers: { "stripe-signature": "invalid" },
    body: payload,
  }));
  assert.equal(invalidSignatureResponse.status, 400, "invalid signatures must not enter webhook processing");

  const unrelatedCompletedResponse = await postSignedEvent({
    id: "evt_unrelated_completed",
    object: "event",
    created: 1_783_900_000,
    type: "checkout.session.completed",
    data: { object: { metadata: unrelatedMetadata } },
  });
  assert.equal(unrelatedCompletedResponse.status, 200);
  assert.deepEqual(await unrelatedCompletedResponse.json(), { ok: true, ignored: true, reason: "non_metal_print_event" });

  const unrelatedExpiredResponse = await postSignedEvent({
    id: "evt_unrelated_expired",
    object: "event",
    created: 1_783_900_000,
    type: "checkout.session.expired",
    data: { object: { metadata: unrelatedMetadata } },
  });
  assert.equal(unrelatedExpiredResponse.status, 200);
  assert.deepEqual(await unrelatedExpiredResponse.json(), { ok: true, ignored: true, reason: "non_metal_print_event" });

  const validCompletedResponse = await postSignedEvent({
    id: "evt_metal_completed",
    object: "event",
    created: 1_783_900_000,
    type: "checkout.session.completed",
    data: { object: { metadata: metalMetadata } },
  });
  assert.equal(validCompletedResponse.status, 500, "valid Metal Print identity must enter existing processing, not ignored routing");
  assert.deepEqual(await validCompletedResponse.json(), { ok: false, error: "event_processing_failed" });

  console.log("metal-print webhook routing: PASS — non-metal Checkout/refund events fail closed and signed events remain verifiable");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
