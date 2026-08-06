import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildMetalPrintOrderEvidenceCandidate } from "../src/lib/metal-print-order-evidence-candidate";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputArg = argument("--input");
const outputArg = argument("--output");
if (!inputArg || !path.isAbsolute(inputArg)) throw new Error("absolute --input is required");
if (!outputArg || !path.isAbsolute(outputArg)) throw new Error("absolute --output is required");
const outputPath = path.resolve(outputArg);
const allowedRoots = [...new Set([path.resolve(os.tmpdir()), "/private/tmp"])];
if (!allowedRoots.some((root) => outputPath.startsWith(`${root}${path.sep}`))) throw new Error("output must be inside a temporary directory");
if (fs.existsSync(outputPath)) throw new Error("refusing to overwrite an existing candidate");
const hmacSecret = process.env.METAL_PRINT_EVIDENCE_HMAC_SECRET ?? "";
const raw = JSON.parse(fs.readFileSync(path.resolve(inputArg), "utf8")) as Record<string, unknown>;
const candidate = buildMetalPrintOrderEvidenceCandidate(raw, hmacSecret);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(candidate, null, 2)}\n`, { mode: 0o600, flag: "wx" });
console.log(JSON.stringify({
  status: "ORDER_EVIDENCE_CANDIDATE_PREPARED_HUMAN_REVIEW_REQUIRED",
  evidenceId: candidate.evidenceId,
  output: outputPath,
  containsRawOrderReference: false,
  containsRawTrackingReference: false,
  ledgerWritten: false,
  nextApprovalToken: `APPROVE_ECONOMICS_ACTUAL:${candidate.evidenceId}`,
}));
