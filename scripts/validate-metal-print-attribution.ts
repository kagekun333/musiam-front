import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMetalPrintConsultationToken, verifyMetalPrintConsultationToken } from "../src/lib/metal-print-consultation-token.server";
import { isMetalPrintVerificationTraffic } from "../src/lib/metal-print-redis.server";

process.env.METAL_PRINT_IDENTITY_SECRET = "test-only-metal-print-identity-secret-32chars";

const id = "11111111-2222-4333-8444-555555555555";
const token = createMetalPrintConsultationToken(id);
assert.equal(verifyMetalPrintConsultationToken(token), id);
assert.equal(verifyMetalPrintConsultationToken(`${token}x`), null);
assert.equal(verifyMetalPrintConsultationToken("not-a-token"), null);
assert.equal(isMetalPrintVerificationTraffic({ campaign: "verification_checkout", source: "direct" }), true);
assert.equal(isMetalPrintVerificationTraffic({ campaign: "goal_controller", source: "e2e" }), true);
assert.equal(isMetalPrintVerificationTraffic({ campaign: "formal_offer_copy", source: "browser", medium: "verification" }), true);
assert.equal(isMetalPrintVerificationTraffic({ campaign: "abi_hakusyaku_launch_wave_01", source: "instagram", medium: "organic_social" }), false);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkout = fs.readFileSync(path.join(root, "src/app/api/metal-print/checkout/route.ts"), "utf8");
const webhook = fs.readFileSync(path.join(root, "src/app/api/metal-print/webhook/route.ts"), "utf8");
const consultationApi = fs.readFileSync(path.join(root, "src/app/api/metal-print/consultation/route.ts"), "utf8");
const form = fs.readFileSync(path.join(root, "src/components/MetalPrintConsultationForm.tsx"), "utf8");
const redis = fs.readFileSync(path.join(root, "src/lib/metal-print-redis.server.ts"), "utf8");

assert.ok(consultationApi.includes("createMetalPrintConsultationToken"));
assert.ok(!consultationApi.includes("consultationId, qualified"), "raw consultation id must not be the client attribution credential");
assert.ok(form.includes("sessionStorage.setItem"));
assert.ok(checkout.includes("verifyMetalPrintConsultationToken"));
assert.ok(checkout.includes('consultation.stage !== "qualified"'));
assert.ok(checkout.includes("Date.parse(consultation.expiresAt) <= Date.now()"));
assert.ok(webhook.includes("consultationId"));
assert.ok(redis.includes("COHORT_SUMMARY_LUA"));
assert.ok(redis.includes("paid consultation cannot be replaced"));

console.log("metal-print attribution validation PASS");
