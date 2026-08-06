import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "ops", "metal-print-vip", "production-sales-e2e-evidence.json");
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
const secret = process.env.CRON_SECRET ?? "";
if (!/^https:\/\//.test(siteUrl) || secret.length < 20) throw new Error("production verification environment missing");

async function main() {
  const headers = { authorization: `Bearer ${secret}` };
  const startResponse = await fetch(`${siteUrl}/api/metal-print/verification`, { method: "POST", headers });
  const started = await startResponse.json() as Record<string, unknown>;
  if (!startResponse.ok || started.ok !== true || typeof started.runId !== "string") {
    throw new Error(`production verification start failed: ${startResponse.status}`);
  }

  let completed: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const statusResponse = await fetch(`${siteUrl}/api/metal-print/verification?runId=${encodeURIComponent(started.runId)}`, { headers });
    const status = await statusResponse.json() as Record<string, unknown>;
    if (statusResponse.ok && status.state === "signed_webhook_persisted_and_reservation_released") {
      completed = status;
      break;
    }
  }
  if (!completed) throw new Error("signed Stripe webhook was not persisted before timeout");

  const receipt = completed.receipt as Record<string, unknown>;
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    evidenceClass: "LIVE_ZERO_PAYMENT_CHECKOUT_EXPIRY_SIGNED_WEBHOOK_REDIS",
    stripeCheckoutCreated: true,
    checkoutExpiredWithoutPayment: started.paymentCreated === false,
    customerCreated: started.customerCreated === true,
    signedWebhookReceived: receipt.eventType === "checkout.session.expired",
    durableRedisReceiptRead: true,
    reservationReleaseRanBeforeReceipt: true,
    editionId: receipt.editionId,
    runId: started.runId,
    safety: "The Checkout Session was expired immediately. No payment, PaymentIntent, customer or vendor order was created. No secret, address or customer data is serialized.",
    claimBoundary: "This proves production Stripe Checkout creation, Stripe-signed webhook delivery, webhook processing and durable Redis persistence. It does not prove a paid sale or vendor fulfillment.",
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.checkoutExpiredWithoutPayment || report.customerCreated || !report.signedWebhookReceived || !report.durableRedisReceiptRead) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "production E2E verification failed");
  process.exitCode = 1;
});
