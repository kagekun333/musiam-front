import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  DIMENSIONS,
  REQUIRED_SCENARIOS,
  createBlindReviewPacket,
  summarizeJudgeAssessments,
  validateJudgeAssessment,
  validateScenarioDataset,
} from "./arena-v1.mjs";

const fixturePath = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const dataset = JSON.parse(await readFile(fixturePath("count-chat-sales-arena-v1.scenarios.json"), "utf8"));
const sampleAssessment = JSON.parse(await readFile(fixturePath("count-chat-sales-arena-v1.judge-fixture.json"), "utf8"));

assert.deepEqual(validateScenarioDataset(dataset), []);
assert.equal(dataset.scenarios.length, REQUIRED_SCENARIOS.length);
assert.deepEqual(dataset.scenarios.map((scenario) => scenario.id), REQUIRED_SCENARIOS);
assert.ok(dataset.scenarios.every((scenario) => scenario.split === "held_out"));
assert.equal(DIMENSIONS.length, 10);
console.log(`PASS dataset: ${dataset.scenarios.length} held-out scenarios, ${DIMENSIONS.length} dimensions`);

assert.deepEqual(validateJudgeAssessment(sampleAssessment, dataset), []);
const summary = summarizeJudgeAssessments([sampleAssessment], dataset);
assert.equal(summary.authority, "advisory_only");
assert.equal(summary.decision_authority, "human_calibration_required");
assert.equal(summary.composite_score, null);
assert.equal(summary.pass_fail, null);
assert.equal(summary.self_judged_count, 1);
assert.equal(summary.human_calibration_pending_count, 1);
assert.equal(summary.by_dimension.repeatability.mean_0_to_4, 4);
assert.equal(summary.by_dimension.recommendation_quality.mean_0_to_4, null);
const blindPacket = createBlindReviewPacket(sampleAssessment, dataset);
const blindPacketJson = JSON.stringify(blindPacket);
assert.equal(blindPacket.model_judge_scores_withheld, true);
assert.equal(blindPacket.transcripts.length, 3);
assert.ok(!blindPacketJson.includes(sampleAssessment.candidate_model_id));
assert.ok(!blindPacketJson.includes(sampleAssessment.judge.model_id));
assert.ok(!blindPacketJson.includes('"score":4'));
console.log("PASS judge fixture: self-judgment stays advisory; blind packet omits identities and model scores");

const invalidSelfJudgment = structuredClone(sampleAssessment);
invalidSelfJudgment.judge.self_judged = false;
assert.ok(validateJudgeAssessment(invalidSelfJudgment, dataset).some((error) => error.includes("self_judged must match")));

const invalidEvidence = structuredClone(sampleAssessment);
invalidEvidence.ratings.hallucination.evidence[0].quote = "This quote is not in the transcript.";
assert.ok(validateJudgeAssessment(invalidEvidence, dataset).some((error) => error.includes("exact excerpt")));

const invalidRepeatability = structuredClone(sampleAssessment);
invalidRepeatability.repeatability_context.minimum_replicates = 4;
assert.ok(validateJudgeAssessment(invalidRepeatability, dataset).some((error) => error.includes("repeatability cannot be scored")));

const missingRepeatabilityContext = structuredClone(sampleAssessment);
delete missingRepeatabilityContext.repeatability_context;
assert.ok(validateJudgeAssessment(missingRepeatabilityContext, dataset).some((error) => error.includes("repeatability_context is required")));

const invalidTranscriptShape = structuredClone(sampleAssessment);
invalidTranscriptShape.transcripts = "not-an-array";
assert.ok(validateJudgeAssessment(invalidTranscriptShape, dataset).some((error) => error.includes("transcripts must contain")));

const invalidAuthority = structuredClone(sampleAssessment);
invalidAuthority.pass_fail = "pass";
assert.ok(validateJudgeAssessment(invalidAuthority, dataset).some((error) => error.includes("pass_fail is forbidden")));

const invalidCalibration = structuredClone(sampleAssessment);
invalidCalibration.blind_calibration.human_ratings = { accuracy_contract_safety: 4 };
assert.ok(validateJudgeAssessment(invalidCalibration, dataset).some((error) => error.includes("cannot contain human ratings")));

const invalidCommercialFacts = structuredClone(dataset);
invalidCommercialFacts.scenarios[0].known_offer_facts.push({ price: "29.99 EUR" });
assert.ok(validateScenarioDataset(invalidCommercialFacts).some((error) => error.includes("known_offer_facts must be an empty array")));

console.log("PASS deterministic guard cases: evidence, repeatability, commercial facts, blind calibration, and non-final authority");
