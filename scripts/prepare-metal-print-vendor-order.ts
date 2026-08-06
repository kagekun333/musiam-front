import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Stripe from "stripe";
import { buildVendorOrderPacket, type PaidMetalPrintOrder } from "../src/lib/metal-print-vendor-order";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const paymentIntentId = argument("--payment-intent");
const outputPath = argument("--output");
const includeShipping = process.argv.includes("--include-shipping");
if (!paymentIntentId || !/^pi_[A-Za-z0-9_]{8,200}$/.test(paymentIntentId)) throw new Error("valid --payment-intent is required");
if (!outputPath || !path.isAbsolute(outputPath)) throw new Error("absolute --output is required");
const resolvedOutput = path.resolve(outputPath);
const allowedRoots = [path.resolve(os.tmpdir()), "/private/tmp"];
if (!allowedRoots.some((root) => resolvedOutput.startsWith(`${root}${path.sep}`))) throw new Error("output must be inside a temporary directory");
if (fs.existsSync(resolvedOutput)) throw new Error("refusing to overwrite an existing packet");

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) throw new Error("STRIPE_SECRET_KEY is not configured");
const stripe = new Stripe(secret);
const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
if (paymentIntent.status !== "succeeded") throw new Error("PaymentIntent has not succeeded");
const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 10 });
const summary = sessions.data.find((candidate) => candidate.payment_status === "paid");
if (!summary) throw new Error("paid Checkout Session not found");
const session = await stripe.checkout.sessions.retrieve(summary.id, { expand: ["payment_intent"] });
const collected = (session as unknown as { collected_information?: { shipping_details?: { name?: string | null; address?: Record<string, string | null> | null } } }).collected_information;
const shipping = collected?.shipping_details;
const order: PaidMetalPrintOrder = {
  checkoutSessionId: session.id,
  paymentIntentId,
  orderId: session.metadata?.orderId ?? "",
  editionId: session.metadata?.editionId ?? "",
  amountJpy: session.amount_total ?? 0,
  currency: session.currency ?? "",
  paymentStatus: session.payment_status,
  customerEmail: session.customer_details?.email ?? null,
  customerPhone: session.customer_details?.phone ?? null,
  recipientName: shipping?.name ?? session.customer_details?.name ?? null,
  shippingAddress: shipping?.address ?? session.customer_details?.address as Record<string, string | null> | null,
  checkoutCreatedAt: new Date(session.created * 1000).toISOString(),
  offerApprovalToken: session.metadata?.offerApprovalToken ?? "",
  offerApprovedAt: session.metadata?.offerApprovedAt ?? "",
};

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const proofPacket = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/proof-order-packet.json"), "utf8"));
let uploadMaster = proofPacket.editionId === order.editionId ? proofPacket.uploadMaster : null;
if (!uploadMaster) {
  const expansionManifestPath = path.join(root, "ops/metal-print-vip/expansion-master-manifest.json");
  if (!fs.existsSync(expansionManifestPath)) throw new Error("edition print master manifest is unavailable");
  const expansionManifest = JSON.parse(fs.readFileSync(expansionManifestPath, "utf8"));
  const candidate = expansionManifest.outputs?.find((item: { editionId?: string }) => item.editionId === order.editionId);
  if (!candidate || candidate.status !== "DIGITAL_MASTER_CANDIDATE_PHYSICAL_PROOF_REQUIRED") throw new Error("edition print master candidate is unavailable");
  uploadMaster = { relativePath: candidate.outputRelativePath, sha256: candidate.outputSha256 };
}
const masterPath = path.join(root, uploadMaster.relativePath);
const masterSha256 = crypto.createHash("sha256").update(fs.readFileSync(masterPath)).digest("hex");
if (masterSha256 !== uploadMaster.sha256) throw new Error("locked upload master hash mismatch");

const packet = buildVendorOrderPacket({
  order,
  generatedAt: new Date().toISOString(),
  includeShipping,
  specification: {
    vendorId: proofPacket.vendor.id,
    product: proofPacket.configuration.product,
    widthMm: proofPacket.configuration.widthMm,
    heightMm: proofPacket.configuration.heightMm,
    quantity: proofPacket.configuration.quantity,
    surface: proofPacket.configuration.surface,
    base: proofPacket.configuration.base,
    frame: proofPacket.configuration.frame,
    border: proofPacket.configuration.border,
    hangingHardware: proofPacket.configuration.hangingHardware,
    uploadMasterRelativePath: uploadMaster.relativePath,
    uploadMasterSha256: masterSha256,
    landedCostCeilingJpy: proofPacket.paymentControl.landedCeilingJpy,
  },
});

fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
fs.writeFileSync(resolvedOutput, `${JSON.stringify(packet, null, 2)}\n`, { mode: 0o600, flag: "wx" });
console.log(JSON.stringify({ status: packet.status, output: resolvedOutput, containsShipping: includeShipping, vendorPurchasePerformed: false }));
