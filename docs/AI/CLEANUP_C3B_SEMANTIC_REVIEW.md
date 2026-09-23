# 伯爵MUSIAM — C3-B Sol Semantic Review

Status: `C3B_SEMANTIC_REVIEW=COMPLETE_COMMITTED`.

Starting HEAD: `ce25a6f80d552f9689e7c1b2707d3bcd3d501152` on `recovery/musiam-clean-20260920`. Canonical working tree was clean. Original dirty remained at `117379b6c61ab3fc072b6cd4b80ce1d406b0e175` on `codex/fix/stripe-metal-print-webhook-20260914`, with 102 modified, 0 staged, and 433 untracked Git status entries. Original was read-only.

## Handoff accounting preflight

C3-A reported 300 grouped items and 2,381 unique handoff paths. Its committed validator defines UNKNOWN decision targets as handoff rows with `scope=NON_GIT_UNKNOWN_FILE` matching the two unresolved dispositions in the 4,437-file UNKNOWN manifest. That gives exactly **1,091 decision targets**: 69 `DIRTY_HAS_UNRECOVERED_DELTA` and 1,022 `SEMANTIC_REVIEW_REQUIRED`.

The remaining **1,290 context-only paths** are 16 modified-tracked and 1,274 untracked-status rows, all beneath Original `ops/`. Cleanup Audit independently accounts for that whole root as `EVIDENCE_HOLD` (`dirty-ops`, 1,576 files); R6 records its operational truth boundary. The handoff marks these rows for semantic attention as status entries, but they are outside the UNKNOWN manifest. C3-B does not issue them a second UNKNOWN disposition. Target/context overlap and duplicate handoff paths: **0**. The machine record keeps both explicit path sets and per-handoff-group counts.

## Semantic decisions for the 1,091 targets

Allocated bytes use C3-A's `allocatedBytes` field; they are not reclaimable bytes.

| Final decision | Files | Allocated bytes | Basis |
|---|---:|---:|---|
| `PRESERVE_REQUIRED_BEFORE_C4` | 383 | 17,010,688 | Distinct Original-only or changed source/data/design; exact current-file preservation sufficiency is not established by the broad R0 snapshot. |
| `ALREADY_PRESERVED_NO_EXTRA_ACTION` | 702 | 53,325,824 | 700 tracked-clean bilingual Omikuji PNGs and 2 tracked-clean tools are recoverable from the verified self-contained Original HEAD bundle. Future adoption remains separate. |
| `RECOVERY_SUPERSEDES_CONFIRMED` | 5 | 708,608 | R7-A catalog loader/merge and 21 master imports, R1 webhook guard, and the canonical Recovery Plan explicitly replace the older variants. |
| `HISTORICAL_ONLY_CONFIRMED` | 0 | 0 | No additional target was assigned this without file-level preservation proof. |
| `FUTURE_PRODUCT_PRESERVE` | 0 | 0 | Future relevance is a separate field; targets with insufficient preservation use `PRESERVE_REQUIRED_BEFORE_C4`. |
| `REGENERABLE_NO_PRESERVATION_REQUIRED` | 1 | 32,768 | CPython cache derives from the retained `build-musiam-music-evidence-factory.py` source. |
| `OWNER_DECISION_REQUIRED` | 0 | 0 | No semantic target requires an owner preference to decide preservation. |
| **Total** | **1,091** | **71,077,888** | Exactly one final decision per target. |

The 69 changed files resolve as 65 preservation-required and 4 Recovery-superseded. The 1,022 semantic-review files resolve as 318 preservation-required, 702 already preserved, 1 Recovery-superseded, and 1 regenerable. Every file has a group, decision, rationale, and evidence pointer in the machine record.

Important examples: dirty `works.json` has 21 IDs absent from the 450-item canonical master; R7-A already captured them in `catalog-imports.json`. The dirty 239-row `works-ssd.json` differs from the 216-row canonical sidecar and was intentionally excluded from active R7-A merge, but its distinct historical data remains preservation-required. The dirty `next.config.js` includes both an intentionally removed `/exhibition` redirect and a Drone image-host rule; its mixed value requires preservation, not restoration. Metal Print approval/fulfillment, Daily Music short-link/publication, Analytics/Funnel, Drone discovery, business source, cover images, and untracked `.fuse_hidden` fragments remain candidates for exact preservation. Their presence is not proof of approval, sale, publication, customer use, or current runtime behavior.

The 700 Omikuji PNGs are future Oracle assets, but `ORACLE_INACTIVE_BY_DESIGN` stays in force. Tracked-clean plus R0 verified HEAD history establishes restorable bytes; it does not authorize activation or prove the cards' product quality. Shaman/Drone/artwork/cover-related future value is retained, and no uncertain asset was called regenerable.

## C4 implication and next Gate

`C4_READINESS = NOT_READY_PRESERVATION_REQUIRED`. Next Gate: **`C3-C PRESERVATION EXECUTION`**, limited to the 383 listed files and proof of exact preservation sufficiency. This decision does not authorize source copy, archive creation, deletion, or C4 execution in C3-B. The existing `EVIDENCE_HOLD`, `SECRET_OR_ENV_HOLD`, `LOCAL_CONFIG_HOLD`, R0–R5, and C2 boundaries continue independently.

Original `.git` remained opaque: no enumeration, hashing, or content inspection. Sensitive/private content and hashes were not read. Original writes, application/runtime changes, destructive operations, provider operations, deploys, pushes, and C4 execution were all **0**. Local semantic classification does not establish production parity, payment, fulfillment, demand, rights, or adoption.

Machine record: `ops/recovery/cleanup-c3b-semantic-review-20260923.json`. Validator: `scripts/validate-cleanup-c3b-semantic-review.mjs`.
