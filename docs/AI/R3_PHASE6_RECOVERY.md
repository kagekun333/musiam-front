# R3 — Phase 6 Three-Lane Recovery

Recovery timestamp: 2026-09-20. This record preserves a historical experiment
and an isolated application candidate. It neither restarts Phase 6 nor applies
candidate code to the clean application.

## Baseline

`checkpoint.json` records `r8Frozen: true`; `authorization.json` points to the
R2 freeze at `../phase5-generalization-20260913/freeze-r8.json`. Its recorded
SHA-256 and the recovered R2 file are both
`8653f823c8ee8f8a5f57bc8b2e2c09faa84eb048d30ee0ba5d134cd2cde08b01`.
`R8_BASELINE_BOUND`.

## Lane A

The planned low-reasoning configurations were Luna/OpenAI, v4.1/Fireworks then
Morph fp8, and GLM flash/Morph fp8. Preserved compact status is in
`lane-a-status.json`: Luna completed known preflight and Fresh A; GLM flash
completed only a known continuation; v4.1 was provider-blocked. Fresh B and
long sets did not complete across the configurations. No grader or final
comparison record was recovered, and no winner is asserted.

## Lane B

The sealed Duke hard (8 cases) and long (20 turns) inputs exist, but the Lane B
directory contains no execution result. `lane-b-status.json` records the three
planned configurations as `NOT_RUN`. Lane A results do not substitute for
Lane B.

## Lane C

Candidate `phase6-lane-c-implementation-c1` is an offline-only, two-file
structural candidate: `count-action-completion.ts` and
`count-semantic-turn.ts`. It was not applied to the root runtime or r8 and made
zero provider/network calls. The copied manifest, carryover record, and source
files permit source reconstruction; 82/82 carryover checks passed, while the
candidate-wide typecheck retained unrelated pre-existing diagnostics. No patch
or archive was recorded. Its base was a protected dirty root, so direct clean
application is unverified and intentionally not attempted.

## Fairness / Validity

The protocol fixed r8, sealed inputs before responses, pinned providers with no
fallback, and stopped on provider failure without retry. These execution
controls do not make the unequal, incomplete result set rankable. All eight
preserved Lane A execution records are `DIAGNOSTIC_ONLY`; `FAIR_COMPARISON=0`,
`INVALID_FOR_RANKING=0`. The preparation-stage checkpoint has `paidRequests=0`
despite later result records; it is preserved as stale/non-final rather than
treated as the final state.

## Provider Failures

Historical 429 events stopped v4.1 at Fireworks K01, v4.1 at Morph K01, and
GLM flash at Morph K02. A v4.1 Morph continuation later stopped with a
transport/CURL error after six HTTP 200 requests. These are provider/transport
failures, not model-quality failures. See `provider-failure-summary.json`.

## Cost Boundary

The historical authorization was owner-approved for its historical interactive
run only; it does not authorize any new provider call. The raw ledger was not
copied because it contains response bodies. Its compact summary records 1,625
cumulative attempts, 1,617 successful, 8 failed, and $3.754453326988001
historical spend. The 245-request unlabeled partition is retained only as a
ledger partition, not a fully attributable Phase 6 comparison cost.

## Recovered Artifacts

17 source artifacts were copied: checkpoint/authorization, protocol and
provider-adjustment record, seven seal/manifest files, one historical
configuration snapshot, and five Lane C reconstruction artifacts.
Six compact, response-free recovery summaries record lane status, fairness,
cost, provider failures, and the recovery manifest.

## Not Recovered

Raw model responses, full grader transcripts, provider dumps, the raw cost
ledger, execution/debug logs, repeated response copies, temporary folders, and
all Music Evidence bodies were not copied. The old source and Phase 1
preservation were not modified.

## R4 Boundary

R4 Music Evidence is not recovered here. Only the source paths and SHA-256
pointers for `music/source-audit.json` and `music/public-preview-actions.json`
are recorded in `recovery-manifest.json`.

## R7 Handoff

R7 may review only the preserved Lane C c1 candidate and its two source files.
It must independently resolve the protected-dirty-root baseline and make an
explicit application decision; this recovery neither adopts nor deploys it.

## Truth Boundary

- provider failure != model quality failure
- partial comparison != winner
- historical winner != current recommended model
- synthetic != real user
- historical pricing != current pricing
- Lane C candidate != adopted application code
- local validation != production parity
- old authorization != new provider permission
- `PRODUCTION_PARITY = UNVERIFIED`
