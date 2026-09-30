export const DATASET_VERSION = "count-chat-sales-arena-v1";
export const ASSESSMENT_VERSION = "count-chat-sales-arena-judge-v1";

export const REQUIRED_SCENARIOS = Object.freeze([
  "browsing_only",
  "low_budget",
  "too_expensive",
  "not_today",
  "comparison",
  "hotel_b2b",
  "gift",
  "asks_meaning",
  "hesitant",
  "other_vendor_comparison",
  "explicit_no_sales",
  "strong_purchase_intent",
  "post_purchase_risk",
]);

export const DIMENSIONS = Object.freeze([
  { id: "accuracy_contract_safety", label: "Accuracy and contract safety" },
  { id: "request_understanding", label: "Request understanding" },
  { id: "recommendation_quality", label: "Recommendation quality" },
  { id: "value_explanation", label: "Value explanation" },
  { id: "deal_advancement", label: "Appropriate deal advancement" },
  { id: "charm_naturalness_humor_variability", label: "Charm, naturalness, and humor variability" },
  { id: "consent_stop_behavior", label: "Consent and stop behavior" },
  { id: "hallucination", label: "Hallucination and unsupported claims" },
  { id: "repeatability", label: "Repeatability across runs" },
  { id: "post_purchase_risk", label: "Post-purchase risk handling" },
]);

const DIMENSION_IDS = DIMENSIONS.map(({ id }) => id);
const RATING_STATUSES = new Set(["scored", "not_applicable", "insufficient_evidence"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isUnitInterval(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validateScenarioDataset(dataset) {
  const errors = [];
  if (!isRecord(dataset)) return ["dataset must be an object"];
  if (dataset.dataset_version !== DATASET_VERSION) errors.push(`dataset_version must be ${DATASET_VERSION}`);
  if (dataset.evaluation_scope !== "training_and_evaluation_only") errors.push("evaluation_scope must be training_and_evaluation_only");
  if (dataset.runtime_eligible !== false) errors.push("runtime_eligible must be false");
  if (!Array.isArray(dataset.scenarios)) {
    errors.push("scenarios must be an array");
    return errors;
  }

  const ids = new Set();
  for (const [index, scenario] of dataset.scenarios.entries()) {
    const prefix = `scenarios[${index}]`;
    if (!isRecord(scenario)) {
      errors.push(`${prefix} must be an object`);
      continue;
    }
    if (!nonEmptyString(scenario.id)) errors.push(`${prefix}.id is required`);
    else if (ids.has(scenario.id)) errors.push(`${prefix}.id duplicates ${scenario.id}`);
    else ids.add(scenario.id);
    if (scenario.split !== "held_out") errors.push(`${prefix}.split must be held_out`);
    if (!nonEmptyString(scenario.category)) errors.push(`${prefix}.category is required`);
    if (!nonEmptyString(scenario.user_message)) errors.push(`${prefix}.user_message is required`);
    if (!Array.isArray(scenario.known_offer_facts) || scenario.known_offer_facts.length !== 0) {
      errors.push(`${prefix}.known_offer_facts must be an empty array until verified source material is added`);
    }
    if (scenario.buyer_statements_are_not_offer_facts !== true) {
      errors.push(`${prefix}.buyer_statements_are_not_offer_facts must be true`);
    }
    for (const field of ["expected_behaviors", "failure_modes"]) {
      if (!Array.isArray(scenario[field]) || scenario[field].length === 0 || scenario[field].some((item) => !nonEmptyString(item))) {
        errors.push(`${prefix}.${field} must contain non-empty strings`);
      }
    }
  }

  for (const id of REQUIRED_SCENARIOS) {
    if (!ids.has(id)) errors.push(`required held-out scenario is missing: ${id}`);
  }

  if (!isRecord(dataset.protocol) || dataset.protocol.minimum_replicates !== 3) {
    errors.push("protocol.minimum_replicates must be 3");
  }
  if (!Array.isArray(dataset.dimensions) || JSON.stringify(dataset.dimensions.map((item) => item?.id)) !== JSON.stringify(DIMENSION_IDS)) {
    errors.push("dataset dimensions must match the ordered V1 dimension list");
  }

  return errors;
}

function validateEvidence(evidence, transcripts, path, errors) {
  if (!Array.isArray(evidence)) {
    errors.push(`${path} must be an array`);
    return;
  }
  const safeTranscripts = Array.isArray(transcripts) ? transcripts : [];
  const runsById = new Map(safeTranscripts.filter(isRecord).map((run) => [run.run_id, run]));
  for (const [index, item] of evidence.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${itemPath} must be an object`);
      continue;
    }
    if (item.kind === "transcript") {
      const run = runsById.get(item.run_id);
      const runTurns = Array.isArray(run?.turns) ? run.turns : [];
      const turn = runTurns.find((candidate) => candidate?.turn_id === item.turn_id);
      if (!turn) errors.push(`${itemPath} must cite a turn in its stated run_id`);
      if (!nonEmptyString(item.quote) || !turn?.content?.includes(item.quote)) {
        errors.push(`${itemPath}.quote must be an exact excerpt from the cited turn`);
      }
      if (!nonEmptyString(item.note)) errors.push(`${itemPath}.note is required`);
    } else if (item.kind === "run_observation") {
      if (!runsById.has(item.run_id)) errors.push(`${itemPath}.run_id must identify a transcript run`);
      if (!nonEmptyString(item.observation)) errors.push(`${itemPath}.observation is required`);
    } else {
      errors.push(`${itemPath}.kind must be transcript or run_observation`);
    }
  }
}

export function validateJudgeAssessment(assessment, dataset) {
  const errors = [];
  if (!isRecord(assessment)) return ["assessment must be an object"];
  if (assessment.assessment_version !== ASSESSMENT_VERSION) errors.push(`assessment_version must be ${ASSESSMENT_VERSION}`);
  if (!nonEmptyString(assessment.assessment_id)) errors.push("assessment_id is required");

  const scenarioList = Array.isArray(dataset?.scenarios) ? dataset.scenarios : [];
  const scenarioIds = new Set(scenarioList.filter(isRecord).map((scenario) => scenario.id));
  if (!scenarioIds.has(assessment.scenario_id)) errors.push("scenario_id must identify a dataset scenario");
  if (!nonEmptyString(assessment.candidate_model_id)) errors.push("candidate_model_id is required");
  if (!isRecord(assessment.judge)) {
    errors.push("judge must be an object");
  } else {
    if (assessment.judge.role !== "model") errors.push("judge.role must be model");
    if (!nonEmptyString(assessment.judge.model_id)) errors.push("judge.model_id is required");
    if (!nonEmptyString(assessment.judge.prompt_version)) errors.push("judge.prompt_version is required");
    if (assessment.judge.self_judged !== (assessment.judge.model_id === assessment.candidate_model_id)) {
      errors.push("judge.self_judged must match the candidate/judge model identity comparison");
    }
    if (assessment.judge.authority !== "advisory_only") errors.push("judge.authority must be advisory_only");
  }
  if (assessment.decision_authority !== "human_calibration_required") {
    errors.push("decision_authority must be human_calibration_required");
  }
  for (const forbiddenKey of ["overall_score", "pass_fail", "final_decision", "sales_ready"]) {
    if (Object.hasOwn(assessment, forbiddenKey)) errors.push(`${forbiddenKey} is forbidden in V1 judge output`);
  }

  const runIds = new Set();
  if (!Array.isArray(assessment.transcripts) || assessment.transcripts.length === 0) {
    errors.push("transcripts must contain at least one run");
  } else {
    for (const [index, run] of assessment.transcripts.entries()) {
      const prefix = `transcripts[${index}]`;
      if (!isRecord(run) || !nonEmptyString(run.run_id)) {
        errors.push(`${prefix}.run_id is required`);
        continue;
      }
      if (runIds.has(run.run_id)) errors.push(`${prefix}.run_id is duplicated`);
      runIds.add(run.run_id);
      if (!Array.isArray(run.turns) || run.turns.length < 2) {
        errors.push(`${prefix}.turns must contain at least a user and assistant turn`);
        continue;
      }
      const turnIds = new Set();
      for (const [turnIndex, turn] of run.turns.entries()) {
        const turnPath = `${prefix}.turns[${turnIndex}]`;
        if (!isRecord(turn) || !nonEmptyString(turn.turn_id) || !nonEmptyString(turn.content)) {
          errors.push(`${turnPath} requires turn_id and content`);
          continue;
        }
        if (turnIds.has(turn.turn_id)) errors.push(`${turnPath}.turn_id is duplicated within the run`);
        turnIds.add(turn.turn_id);
        if (!["user", "assistant"].includes(turn.role)) errors.push(`${turnPath}.role must be user or assistant`);
      }
      if (!run.turns.some((turn) => turn?.role === "user") || !run.turns.some((turn) => turn?.role === "assistant")) {
        errors.push(`${prefix}.turns must include both user and assistant roles`);
      }
    }
  }

  const repeatability = assessment.repeatability_context;
  if (!isRecord(repeatability)) {
    errors.push("repeatability_context is required");
  } else {
    if (!nonEmptyString(repeatability.group_id)) errors.push("repeatability_context.group_id is required");
    if (!Number.isInteger(repeatability.minimum_replicates) || repeatability.minimum_replicates < 3) {
      errors.push("repeatability_context.minimum_replicates must be at least 3");
    }
    if (repeatability.replicate_count !== assessment.transcripts?.length) {
      errors.push("repeatability_context.replicate_count must match transcript count");
    }
  }

  if (!isRecord(assessment.ratings)) {
    errors.push("ratings must be an object");
  } else {
    const ratingIds = Object.keys(assessment.ratings).sort();
    const expectedIds = [...DIMENSION_IDS].sort();
    if (JSON.stringify(ratingIds) !== JSON.stringify(expectedIds)) errors.push("ratings must contain exactly the V1 dimensions");

    for (const dimension of DIMENSION_IDS) {
      const rating = assessment.ratings[dimension];
      const path = `ratings.${dimension}`;
      if (!isRecord(rating)) {
        errors.push(`${path} must be an object`);
        continue;
      }
      if (!RATING_STATUSES.has(rating.status)) errors.push(`${path}.status is invalid`);
      if (!nonEmptyString(rating.rationale)) errors.push(`${path}.rationale is required`);
      if (!isUnitInterval(rating.uncertainty)) errors.push(`${path}.uncertainty must be between 0 and 1`);
      if (rating.status === "scored") {
        if (!Number.isInteger(rating.score) || rating.score < 0 || rating.score > 4) errors.push(`${path}.score must be an integer from 0 to 4`);
        if (!Array.isArray(rating.evidence) || rating.evidence.length === 0) errors.push(`${path}.evidence is required for a scored rating`);
      } else if (rating.score !== null) {
        errors.push(`${path}.score must be null when status is not scored`);
      }
      validateEvidence(rating.evidence, assessment.transcripts ?? [], `${path}.evidence`, errors);

      if (dimension === "repeatability") {
        if ((!isRecord(repeatability) || repeatability.replicate_count < repeatability.minimum_replicates) && rating.score !== null) {
          errors.push("repeatability cannot be scored below the minimum replicate count");
        }
        if (rating.score !== null) {
          const observedRunIds = new Set((rating.evidence ?? [])
            .filter((item) => item?.kind === "run_observation")
            .map((item) => item.run_id));
          if (!isRecord(repeatability) || observedRunIds.size < repeatability.minimum_replicates) {
            errors.push("repeatability rating must cite observations from the minimum number of distinct runs");
          }
        }
      }
    }
  }

  const calibration = assessment.blind_calibration;
  if (!isRecord(calibration)) {
    errors.push("blind_calibration is required");
  } else {
    if (!nonEmptyString(calibration.blind_pair_id) || /candidate|judge/i.test(calibration.blind_pair_id)) {
      errors.push("blind_calibration.blind_pair_id must be an opaque identifier");
    }
    if (calibration.candidate_identity_withheld !== true || calibration.judge_identity_withheld !== true) {
      errors.push("blind_calibration must withhold candidate and judge identities from the human reviewer");
    }
    if (calibration.review_state !== "pending") errors.push("blind_calibration.review_state must remain pending in V1");
    if (calibration.human_reviewer_id !== null || calibration.human_ratings !== null || calibration.adjudication !== null) {
      errors.push("model judge output cannot contain human ratings or adjudication");
    }
    if (calibration.unblinded !== false) errors.push("blind_calibration.unblinded must be false until human review is complete");
  }

  return errors;
}

export function createBlindReviewPacket(assessment, dataset) {
  const datasetErrors = validateScenarioDataset(dataset);
  if (datasetErrors.length > 0) throw new TypeError(`dataset is invalid: ${datasetErrors.join("; ")}`);
  const errors = validateJudgeAssessment(assessment, dataset);
  if (errors.length > 0) throw new TypeError(`assessment is invalid: ${errors.join("; ")}`);

  const scenario = dataset.scenarios.find((item) => item.id === assessment.scenario_id);
  return {
    packet_version: "count-chat-sales-arena-blind-review-v1",
    blind_pair_id: assessment.blind_calibration.blind_pair_id,
    scenario: {
      id: scenario.id,
      category: scenario.category,
      user_message: scenario.user_message,
      expected_behaviors: scenario.expected_behaviors,
      failure_modes: scenario.failure_modes,
    },
    reviewer_instructions: [
      "Review the candidate transcripts before seeing any model judge ratings or candidate/judge identity.",
      "Use exact excerpts and mark not_applicable or insufficient_evidence when evidence is missing.",
      "This packet is for human calibration, not a final sales-readiness decision.",
    ],
    dimensions: dataset.dimensions,
    transcripts: assessment.transcripts.map((run, index) => ({
      run_id: `blind-run-${index + 1}`,
      turns: run.turns.map(({ turn_id, role, content }) => ({ turn_id, role, content })),
    })),
    model_judge_scores_withheld: true,
    human_rating_template: Object.fromEntries(DIMENSION_IDS.map((id) => [id, {
      status: "insufficient_evidence",
      score: null,
      rationale: "",
      uncertainty: null,
      evidence: [],
    }])),
  };
}

export function summarizeJudgeAssessments(assessments, dataset) {
  for (const [index, assessment] of assessments.entries()) {
    const errors = validateJudgeAssessment(assessment, dataset);
    if (errors.length > 0) throw new TypeError(`assessment ${index} is invalid: ${errors.join("; ")}`);
  }

  const byDimension = Object.fromEntries(DIMENSIONS.map(({ id }) => {
    const scored = assessments
      .map((assessment) => assessment.ratings[id])
      .filter((rating) => rating.status === "scored")
      .map((rating) => rating.score);
    const sum = scored.reduce((total, score) => total + score, 0);
    const nullCount = assessments.length - scored.length;
    return [id, {
      scored_count: scored.length,
      not_scored_count: nullCount,
      mean_0_to_4: scored.length === 0 ? null : Math.round((sum / scored.length) * 1000) / 1000,
    }];
  }));

  return {
    summary_type: "descriptive_dimension_summary",
    authority: "advisory_only",
    decision_authority: "human_calibration_required",
    composite_score: null,
    pass_fail: null,
    assessment_count: assessments.length,
    self_judged_count: assessments.filter((assessment) => assessment.judge.self_judged).length,
    human_calibration_pending_count: assessments.filter((assessment) => assessment.blind_calibration.review_state === "pending").length,
    by_dimension: byDimension,
  };
}
