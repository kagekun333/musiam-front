# 伯爵MUSIAM — Chat history env metadata verification

`CHAT_HISTORY_ENV_METADATA_VERIFICATION = COMPLETE_COMMITTED`

`CHAT_HISTORY_RUNTIME_READINESS = READY_WITH_CONNECTIVITY_UNVERIFIED`

## State Lock and scope

- Original verification starting HEAD: `270385671b2cccf0029baa2a55d17f6bb03d2a12`.
- Finalization starting HEAD: `449203ca106af04a526da238b332100ea649ff68`; branch: `recovery/musiam-clean-20260920`.
- Tracked working tree was clean before this update. The pre-existing untracked `ops/market-learning/daily-20260925/` remains out of scope and untouched.
- This update changes only the verification report, machine record, and validator. Application/config source changes: **0**.

## Human-reviewed metadata evidence

The user reported completing a human review in Vercel Dashboard → `musiam-front` → Settings → Environment Variables. The report identifies:

| Name | Dashboard target | Production | Preview |
| --- | --- | --- | --- |
| `KV_REST_API_URL` | All Environments | PRESENT | PRESENT |
| `KV_REST_API_TOKEN` | All Environments | PRESENT | PRESENT |

Per the user's evidence instruction, `All Environments` is treated as including Production and Preview. The `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` aliases were not checked because the confirmed KV aliases satisfy the two required families. Their status remains `NOT_CHECKED_NOT_REQUIRED`, not absent.

Evidence provenance is `USER_REPORTED_HUMAN_DASHBOARD_REVIEW`; the Dashboard was not independently reopened during this finalization. The user reported that no secret values were viewed, copied, or shared. No environment API response or CLI env listing was requested by the agent. The [Vercel environment API schema](https://vercel.com/docs/rest-api/sdk/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name) documents a `value` response field, so that API remains unused. The [CLI docs](https://vercel.com/docs/cli/env) do not establish that `vercel env ls` omits values, and the CLI is not installed in this checkout.

## Contract and alias precedence

Source `src/lib/chat-history.server.ts` independently selects:

- URL: `UPSTASH_REDIS_REST_URL ?? KV_REST_API_URL`
- Token: `UPSTASH_REDIS_REST_TOKEN ?? KV_REST_API_TOKEN`

The KV aliases are valid members of their respective required families. Therefore:

| Target | URL family | Token family | Contract |
| --- | --- | --- | --- |
| Production | `PRESENT_METADATA_ONLY` (`KV_REST_API_URL`) | `PRESENT_METADATA_ONLY` (`KV_REST_API_TOKEN`) | `PRESENT_METADATA_ONLY` |
| Preview | `PRESENT_METADATA_ONLY` (`KV_REST_API_URL`) | `PRESENT_METADATA_ONLY` (`KV_REST_API_TOKEN`) | `PRESENT_METADATA_ONLY` |
| Development | Not assessed | Not assessed | Not assessed |

The source uses nullish coalescing: an empty primary `UPSTASH_*` string does not fall back to the KV alias. Name/target evidence does not establish any variable's value or effective runtime behavior. This is why readiness remains connectivity-unverified.

## Operations and truth boundary

- Secret values read / copied / printed / persisted: **0 / 0 / 0 / 0**.
- Environment mutations / local env files generated: **0 / 0**.
- Redis connectivity: `UNVERIFIED_WITHOUT_SECRET_ACCESS`.
- Customer-data reads / writes / deletes: **0 / 0 / 0**.
- Production customer-history GET / PUT / DELETE: `UNVERIFIED_NOT_TESTED`.
- Current local history contract deployed: `UNVERIFIED`.
- Deploys / pushes: **0 / 0**.
- Deferred risks retained: concurrent PUT last-write-wins; bearer UUID in query strings; Redis connectivity; current local contract Production deployment parity.

`READY_WITH_CONNECTIVITY_UNVERIFIED` means the user-reported Dashboard metadata satisfies the required Production env-name contract. It does not prove secret values, Redis connectivity, effective runtime configuration, deployment parity, or customer-history behavior. Local source and fixture results remain separate from Production evidence.

## Next Gate

Review Production deployment parity using read-only deployment metadata. Then identify a runtime-readiness check that does not access customer data. Do not change Production/Preview env values, access Redis, deploy, or push in this Gate.

Recommended next model: GPT-6 Sol, medium.
