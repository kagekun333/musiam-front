# R2 — Phase 5 r8 Preservation

Recovery timestamp: 2026-09-20. This record preserves a historical Phase 5
candidate. It does not apply the candidate to the clean application or change
its historical release decision.

## Candidate Identity

- Candidate ID: `r8` (`/private/tmp/musiam-quality-phase5-r8-20260913` in the
  historical record)
- Created: `2026-09-13T06:21:59.452081+00:00`; frozen:
  `2026-09-13T06:14:33.924539+00:00`
- Candidate status: `HOLD` / `HOLD_LOCAL_ARCHITECTURE_PLATEAU`
- Candidate overlay: 26 files; it made no root runtime edits.

## Baseline

The candidate manifest explicitly identifies its base as the protected dirty
root, per-file SHA-256, rather than bare commit `117379b6c61ab3fc072b6cd4b80ce1d406b0e175`.
Therefore the patch is not directly applicable to the clean baseline alone.

Phase 1 preservation at
`/Users/kagekun/Library/Application Support/MUSIAM/recovery/20260920T-r0-completion-01a0beba/source-preservation/`
contains all 9 non-new r8 base files at their recorded SHA-256 values. The
remaining 17 candidate paths are recorded as absent in the r8 base. Together
with the archived 26-file overlay, this reconstructs the candidate input
without relying on the live old dirty working tree.

## Recovered Artifacts

The following 11 small or reconstruction-critical artifacts are preserved
under `ops/simulation-refinement/phase5-generalization-20260913/`:

- `candidate-r8-changes.json`, `candidate-r8.patch`, and
  `candidate-r8-source.tar.gz`: the 26-file overlay and its manifest.
- `freeze-r8.json`: frozen identity, source hashes, and historical local
  build/offline records.
- `checkpoint.json`, `final-r8-metrics.json`, and `offline-r8.json`:
  final state and compact evaluation/validation results.
- `cost-summary.json`: historical synthetic execution ledger.
- `operational/preservation-r8-final.json`: preservation and HOLD record.
- `evaluation/fresh-p-r8-review.json` and `evaluation/fresh-q-r8-review.json`:
  compact independent evaluation summaries.

Archive SHA-256 is
`cb0a7fdfcb9f32f05b3b946e96ee753256de57cab0d402eceebddc25da955261`;
patch SHA-256 is
`08e8453fdc084072adcef8e5f5512165c17f36aec4426ffd316705831a3d5406`.

## Not Recovered

Raw response bodies, large generated evaluation runs, provider dumps,
temporary run folders, duplicate candidate copies, detailed market/revenue
simulations, and regeneratable intermediates remain only in Phase 1
preservation / the read-only old source. They were neither deleted nor
modified.

## Evaluation Result

Historical, synthetic evaluation only:

- Fresh P: 27 PASS / 4 PARTIAL / 1 FAIL / 0 Critical (32 turns); its 20-turn
  long conversation was generated.
- Fresh Q: 9 PASS / 2 PARTIAL / 1 FAIL / 0 Critical (12 turns); its requested
  20-turn long conversation was **not generated** because of provider failure.
- Offline validator: 82/82 PASS with zero provider sends. Historical build:
  PASS (`build-r8.log` in the preserved source, not copied).
- The compact historical cost ledger records 1,380 synthetic requests (1,372
  successful, 8 failed). It is not product, user, or revenue evidence.

## HOLD Reason

HOLD remains the final historical decision: P was below its full-pass
threshold, Q was incomplete and had a failure, repeated task-completion and
discovery failures remained, and the record describes a local architecture
plateau. Browser E2E, production-equivalent latency, real Redis, and
production deployment were not completed. No commit, push, deploy, or release
was recorded for r8.

## Phase6 Handoff

R3 must use this frozen r8 preservation set as the comparison baseline:
`ops/simulation-refinement/phase5-generalization-20260913/freeze-r8.json`,
with the 26-file overlay and the SHA-256 values above. Phase 6's entry
checkpoint records `r8Frozen: true` and says its next step was to run fixed-r8
comparisons; it remains separate from this recovery.

## Truth Boundary

- Synthetic evaluation is not a real user result.
- PASS is not a production release.
- Build PASS is not production parity.
- HOLD remains HOLD.
- A missing test is not zero failures.
- Evaluation results are historical.
- `PRODUCTION_PARITY = UNVERIFIED`.
