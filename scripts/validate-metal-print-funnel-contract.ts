import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const client = fs.readFileSync(path.join(root, "src/app/metal-print/[slug]/MetalPrintFunnel.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "src/app/metal-print/[slug]/page.tsx"), "utf8");
const snapshot = fs.readFileSync(path.join(root, "scripts/snapshot-metal-print-funnel.ts"), "utf8");

assert.ok(client.includes('capture("metal_dossier_view"'), "dossier view event missing");
assert.ok(client.includes('capture("metal_chat_start"'), "chat start event missing");
assert.ok(client.includes("utm_campaign"), "campaign attribution missing");
assert.equal(page.match(/<MetalPrintChatCta/g)?.length, 2, "exactly two focused chat CTAs required");
assert.ok(snapshot.includes("POSTHOG_OBSERVED"), "observed evidence class missing");
assert.ok(snapshot.includes("Qualified pipeline value remains zero"), "behavioral signals are incorrectly treated as qualified demand");
assert.ok(!client.includes("email"), "email or free-text must not enter analytics properties");

console.log("metal-print funnel contract: PASS — dossier, chat start, attribution, and evidence boundary");
