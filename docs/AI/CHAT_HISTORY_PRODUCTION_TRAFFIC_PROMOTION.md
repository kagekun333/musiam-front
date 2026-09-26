# 伯爵MUSIAM — Production traffic promotion

`CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION = PASS`

`CHAT_HISTORY_RELEASE_CYCLE = COMPLETE`

The approved existing Production artifact was promoted once, without a rebuild. All four direct hostname lookups resolve to that artifact, and all eight customer-data-free requests on `www.hakusyaku.xyz` passed. No emergency rollback was needed.

## Authority and artifact

- Approval: `APPROVE_CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION`.
- Starting local HEAD: `f9d065f26d384981140499611f0dfb7ae97c1ff6`.
- Branch: `recovery/musiam-clean-20260920`.
- Artifact source SHA: `f2d228812b3e3d51f107f1872401c42c1b68edcf`.
- Candidate/current Production: `dpl_AaEEB9oRofPq5Gjg3syuK7BTCanD`.
- Preserved old Production: `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`, READY.
- The difference between the local starting HEAD and artifact source is exactly the previous Gate's three governance files. Application/runtime source is unchanged.
- Initial tracked/staged changes: 0. Allowed untracked: `.pnpm-store/` and the two protected market-learning daily roots. Both protected roots were checked only for existence/type.

Official [promotion documentation](https://vercel.com/docs/deployments/promoting-a-deployment) confirms that promoting an existing staged Production build does not rebuild it. Installed CLI 59.23.2 uses the Production promotion endpoint for this target; the Preview-to-new-deployment branch was not used. The read-only rolling-release configuration response was `rollingRelease: null`.

## Exact operation and routing

```sh
vercel promote dpl_AaEEB9oRofPq5Gjg3syuK7BTCanD --timeout 60s --scope team_Hj7QBy2lnfpsuHXgOWKfFdZg --no-color --non-interactive
```

The operation returned exit 0 and success. A transport guard recorded exactly one POST to `/v10/projects/prj_OU4nbZIO3n3ieS99cMXY7eWigHAl/promote/dpl_AaEEB9oRofPq5Gjg3syuK7BTCanD`; HTTP status was 201. An exclusive marker prevented a repeated write. Other control-plane writes, new deployments, redeployments, manual alias changes and domain configuration changes: **0**.

| Direct hostname lookup | Before promotion | After promotion |
| --- | --- | --- |
| `www.hakusyaku.xyz` | Old Production | Candidate |
| `hakusyaku.xyz` | Old Production | Candidate |
| `musiam-front.vercel.app` | Old Production | Candidate |
| `musiam-front-hakusyakus-projects.vercel.app` | Old Production | Candidate |

The candidate remained READY / production with the same ID, source SHA, creation time, build start and READY time. These direct lookups, rather than deployment alias arrays, are the routing authority. The generated project alias is `VERCEL_GENERATED_PROJECT_ALIAS`; its move to the candidate is expected under this explicit promotion approval.

## HTTP verification

Candidate preflight GET `/` and `/chat` returned 200 immediately before promotion. After promotion, the main authority was `https://www.hakusyaku.xyz`; requests used no credentials/cookies, no browser hydration and no redirect following.

| Production request | Status | Result |
| --- | --- | --- |
| GET `/` | 200 | HTML |
| GET `/chat` | 200 | HTML |
| invalid history GET | 400 | `invalid_conversation_id` |
| invalid history DELETE | 400 | `invalid_conversation_id` |
| invalid history PUT `{}` | 400 | `invalid_body` |
| 614,416-byte oversized history PUT | 413 | Bounded response; rejected before storage path |
| unsupported Chat GET | 405 | `method_not_allowed` |
| invalid Chat POST | 400 | `invalid_body` |

Supplemental GET `/` was performed exactly once on each remaining hostname:

- `hakusyaku.xyz`: 307 canonical redirect to `https://www.hakusyaku.xyz/`.
- `musiam-front.vercel.app`: 200 HTML.
- `musiam-front-hakusyakus-projects.vercel.app`: 302 to `https://vercel.com/sso-api` (query values not inspected or retained).

The supplemental harness initially rejected the generated alias because it accepted only HTML 200 or a canonical www redirect. That raw failure is retained in the machine record. Inspection of the saved response's host/path metadata classified it as a normal Vercel authentication redirect, consistent with [Deployment Protection](https://vercel.com/docs/deployment-protection). It is not an application 200, and unauthenticated application access through this generated alias is not claimed. No security setting was changed and no extra request, login, bypass generation or session mutation was performed. The main Production smoke passed, direct routing matched, and no candidate failure or major routing inconsistency was observed; no rollback trigger was established.

## Runtime, validation and boundaries

Candidate-scoped aggregate queries since promotion returned no error/fatal rows and no 5xx rows. A positive-control status query observed 200=4, 400=4, 405=1 and 413=1; the tool reported five distinct statuses with only its top four shown. Thus the zero error/5xx result is backed by a functioning observation window, not an empty logging source. Log bodies were not fetched. This is a bounded observation, not a guarantee about all future traffic.

Validation:

- Existing readiness checks: **17 PASS**, run before promotion using a temporary adapter for the first historical State Lock check. It checks the exact current HEAD and both governance commit deltas; payload checks and remaining assertions are unchanged. The committed historical validator is unchanged.
- Existing staged evidence validator: **9 PASS**, unchanged, before creating this Gate's artifacts.
- Production promotion evidence validator, targeted local ESLint, JSON/Node syntax and diff checks: **PASS**.
- Guarded collector rerun preserved the 3,199-file / 214,051,977-byte runtime payload and zero protected entries/bytes/content IDs/symlink-special payload. No source upload occurred during promotion.

Redis/customer-data operations, normal Chat provider calls, payment/checkout/entitlement, environment mutations, secret-value inspection, account/session mutations, dependency mutations, protected content access and Git push: **0**. The historical staged alias failure and repair records were not altered.

`PRODUCTION_ENV_CONTRACT = PRESENT_METADATA_ONLY` remains in force. Real Redis connectivity, real customer history and returning-user behavior, payment, entitlement, checkout, real-human Chat quality and purchase conversion remain **UNVERIFIED**.

Only the three new promotion governance/evidence files are eligible for local commit. The resulting commit SHA is reported in the handoff, avoiding a self-referential commit hash in this record. Protected roots and `.pnpm-store/` remain untracked and excluded.

Production release work stops here. Next independent Gate: `COUNT_CHAT_INTELLIGENCE_COMPLETION_AUDIT` (recommended GPT-6 Astra / High); it has not been started. The later runtime-model evaluation is also a separate Gate.
