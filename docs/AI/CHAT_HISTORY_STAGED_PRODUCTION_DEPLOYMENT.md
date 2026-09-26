# 伯爵MUSIAM — Chat history staged Production deployment

`CHAT_HISTORY_STAGED_PRODUCTION_DEPLOYMENT = READY_FOR_PRODUCTION_TRAFFIC_PROMOTION_HUMAN_GATE`

The original staged-deployment Gate stopped at `BLOCKED_UNEXPECTED_ALIAS_ASSIGNMENT`. A separately approved, single-alias repair restored the generated project alias to the existing Production deployment, and all eight bounded requests to the existing candidate passed. This is readiness for the next Human Gate only; it does not authorize Production traffic promotion.

## Recovered alias and candidate evidence

- Repair approval: `APPROVE_CHAT_HISTORY_STAGED_PRODUCTION_ALIAS_REPAIR`.
- The only Vercel write was `vercel alias set dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX musiam-front-hakusyakus-projects.vercel.app` (CLI 59.23.2); it succeeded once. Vercel documents `alias set [deployment-url] [custom-domain]` as assigning the named alias to the specified deployment ([official CLI reference](https://vercel.com/docs/cli/alias)).
- Direct hostname lookup after repair returned `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` for `www.hakusyaku.xyz`, `hakusyaku.xyz`, `musiam-front.vercel.app`, and `musiam-front-hakusyakus-projects.vercel.app`.
- Existing Production `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` remains READY / production. Existing candidate `dpl_AaEEB9oRofPq5Gjg3syuK7BTCanD` remains READY / production with source SHA `f2d228812b3e3d51f107f1872401c42c1b68edcf`; its unique URL resolves to that candidate. No redeployment occurred.
- `musiam-front-hakusyakus-projects.vercel.app` is classified as `VERCEL_GENERATED_PROJECT_ALIAS`. The three user-facing Production invariants are `www.hakusyaku.xyz`, `hakusyaku.xyz`, and `musiam-front.vercel.app`. The generated alias is monitored separately and must be reevaluated at the explicit promotion Human Gate. No claim is made about user access or zero traffic impact during the original reassignment interval.

The eight requests went only to the candidate unique URL. They returned: `/` 200; `/chat` 200; invalid history GET and DELETE 400 `invalid_conversation_id`; invalid history PUT 400 `invalid_body`; 614,416-byte history PUT 413; unsupported Chat GET 405 `method_not_allowed`; invalid Chat POST 400 `invalid_body`. No valid history operation, normal Chat POST, browser hydration, or customer-data operation occurred.

Candidate-scoped aggregate runtime queries returned no error/fatal or 5xx rows. The counts are 0 for those query groups; response bodies/log text were not read. Protected-data exposure remains 0. Environment contract remains `PRESENT_METADATA_ONLY`; Redis connectivity, real customer history, payment, entitlement, actual customer traffic during the earlier alias interval, and human Chat quality remain unverified.

The next Gate is `CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION`, requiring `APPROVE_CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION`. No promotion or Production traffic switching was performed.

## Historical first Gate: `BLOCKED_UNEXPECTED_ALIAS_ASSIGNMENT`

## Authority and preflight

- Approval: `APPROVE_CHAT_HISTORY_STAGED_PRODUCTION_DEPLOYMENT`, scoped to one staged Production deployment with all four existing traffic targets unchanged.
- Starting and final HEAD: `f2d228812b3e3d51f107f1872401c42c1b68edcf`.
- Branch: `recovery/musiam-clean-20260920`.
- Pre-deployment tracked/staged changes: 0; only `.pnpm-store/` and the two protected daily roots were untracked.
- The committed readiness validator was rerun immediately before deployment: **17 checks PASS**. Actual raw input remained 3,207 entries / 214,053,310 bytes / SHA-256 `8e6aa088f101e59e036be170609634488937455df64404c25d2ce1045904c493`. Runtime payload remained 3,199 files / 214,051,977 bytes with exact path/mode/content parity.
- Preview `dpl_Bc9YHMTXaqgV9qnxHbrmLZRW16pT` remained READY with source `b92a3c43e223e08dcd76fcb5869dc3244f460714`, Preview target, no aliases.
- Existing Production and direct www metadata resolved to `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`, READY / production. Project/team linkage matched the approved repository.

## One deployment

Installed Vercel CLI: **59.23.2**, local Node **22.22.3**.

Executed once, through existing CLI authentication:

```sh
vercel deploy --prod --skip-domain --yes --no-wait --no-color --scope team_Hj7QBy2lnfpsuHXgOWKfFdZg
```

The [official skip-domain reference](https://vercel.com/docs/cli/deploy#skip-domain) and [staging workflow](https://vercel.com/docs/deployments/promoting-a-deployment#staging-and-promoting-a-production-deployment) were checked before execution. Installed CLI source maps `--skip-domain` to `autoAssignCustomDomains=false` and requires a Production target. These documented semantics did **not** preserve every alias in this project's four-alias requirement.

- Candidate ID: `dpl_AaEEB9oRofPq5Gjg3syuK7BTCanD`.
- Candidate URL: [staged deployment](https://musiam-front-f6obm3mpj-hakusyakus-projects.vercel.app).
- Final state: **READY**; target: **production**; source: **cli**.
- Source SHA: `f2d228812b3e3d51f107f1872401c42c1b68edcf`, exact approved HEAD; branch also matches.
- Build duration from buildingAt to READY: **178,038 ms**.
- Build logs detected **Next.js 15.5.12** and **3,207 deployment files**. Remote Node version was not exposed by the inspected metadata.
- Command exit code: 0. An exclusive local attempt marker prevented a repeated deploy invocation.
- No `vercel promote`, rollback, alias command, env command, or redeployment was used.

The build-log MCP tool was unavailable. CLI `inspect --logs` was used read-only; only Next.js version, file count and build-state signals were retained. The earlier partial log snapshot showed compilation success while the deployment was still BUILDING; final READY metadata is the completion authority.

## Exact failure and traffic boundary

While BUILDING, candidate metadata already listed `musiam-front-hakusyakus-projects.vercel.app`, but direct lookups of all four hostnames still returned the old deployment. After READY, a direct lookup of that generated alias returned the new candidate.

| Existing hostname | Before | After READY |
| --- | --- | --- |
| `www.hakusyaku.xyz` | `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` | Same old deployment |
| `hakusyaku.xyz` | `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` | Same old deployment |
| `musiam-front.vercel.app` | `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` | Same old deployment |
| `musiam-front-hakusyakus-projects.vercel.app` | `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` | **`dpl_AaEEB9oRofPq5Gjg3syuK7BTCanD`** |

The old deployment remains READY. Its metadata alias array still lists the moved hostname, so that array alone must not be used as evidence of unchanged routing. Direct hostname lookups provide the target identity used here.

**Observed traffic-target/alias mutations: 1. Explicit alias/promotion commands: 0.** The mutation occurred as a side effect of the staged deploy despite `--skip-domain`. The exact provider-side reason is not established; no unsupported assertion that the flag preserves generated aliases is made. The custom `hakusyaku.xyz` hostnames remained on the old deployment, but that does not satisfy the user's requirement to preserve all four targets.

Actual external user requests served through the changed alias are **UNKNOWN** and were not queried. This report does not claim that no user traffic reached the new artifact.

## Hard stop, smoke and runtime truth

The unexpected alias assignment triggered the explicit failure rule at deployment-identity verification.

- Customer-data-free smoke: **NOT RUN**, 0 requests.
- Runtime error/fatal/5xx checks: **NOT QUERIED after the hard stop**; counts are unknown, not 0.
- Agent valid history GET/PUT/DELETE, normal Chat POST, Redis operations, LLM provider calls, payment/entitlement/checkout operations: **0**.
- Environment mutations and inspected secret values: **0**. `PRODUCTION_ENV_CONTRACT = PRESENT_METADATA_ONLY` remains the prior human Dashboard authority.
- Redis connectivity, customer-history correctness, entitlement and payments remain unverified.
- Application/runtime source changes: **0**.

A READY Production-environment artifact is not a safe-smoke PASS, a Redis/customer-data PASS, or authorization to promote.

## Protected data and local records

Both `ops/market-learning/daily-20260925/` and `ops/market-learning/daily-20260926/` retain the protected boundary. The guarded pre-deployment collector recorded descendant entries, payload bytes, content IDs and symlink/special payloads at **0**. No protected contents or descendant names were read, hashed, changed, staged, deleted, moved or archived. The CLI deployment used the same fail-closed protected/.env read guard. `.pnpm-store/` remains untouched and excluded from deploy input.

Only this report, its machine record and a small evidence validator were added. The validator is kept beside its record under the already excluded `ops/product/` path, so no deploy-control or runtime changes are needed. Historical readiness evidence was not modified.

Validation: preflight readiness **17 checks PASS**; the new evidence consistency checks pass while the release verdict deliberately remains BLOCKED with exit code 1; targeted lint and `git diff --check` pass. There is **no local commit** because the Gate failed. The three new governance files remain untracked; existing tracked files are unchanged.

## Next decision

Next actual Gate: **human review of the unexpected alias assignment**. Restoring only `musiam-front-hakusyakus-projects.vercel.app` to `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` requires separate explicit authority because this approval expressly prohibited alias changes and rollback. No restoration has been attempted.

The intended later Gate `CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION` and future token `APPROVE_CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION` are recorded only. This candidate is **not ready for that Gate**. Do not promote, redeploy, retry smoke, repair aliases or roll back under the present approval.


## Current Gate validation

- Alias repair writes: **1**; additional deployment/redeployment: **0**.
- Candidate smoke: **8/8 PASS**; candidate error/fatal aggregate: **0**; unexpected 5xx aggregate: **0**.
- Redis/customer-data, normal provider, payment/checkout/entitlement, environment/secret, and push operations: **0**. Protected roots were accessed only for root metadata; protected content exposure: **0**.
- The Production readiness validator passes **17 checks** when run from a temporary copy with only this Gate’s three explicitly authorized governance files added to its untracked allowlist; the committed validator source was not changed. The staged recovery evidence validator passes all **9 checks**, and targeted lint, JSON parse, Node syntax, and `git diff --check` pass. Application/runtime source changes: **0**.
- Local commit is limited to the report, machine record, and this validator; `.pnpm-store/` and both protected daily roots are excluded.
