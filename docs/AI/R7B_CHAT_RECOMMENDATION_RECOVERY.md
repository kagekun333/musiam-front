# R7-B — Chat / Recommendation Core Recovery

`R7B_STATUS = RECOVERED`。これは active Chat API の決定的な要求理解・作品選定・営業停止・公開action guard をローカルに復旧した記録である。Chat UI、履歴UI、15ターン購入、Checkout、Metal Print UI、Exhibition、Oracle、TodaysPick、provider実行、deploy、push はこのUnitで変更・実行していない。`PRODUCTION_PARITY = UNVERIFIED`。

## Active Runtime

Browser entry は `src/pages/chat.tsx` で、active request は `/api/chat-experience-v3` に到達する。同routeは canonical server projection (`loadMergedWorksServer`) から card を作り、`assistantText` / `card` / `cta` / `intent` を直列化する。`chat-reco.ts` は legacy、`chat-reco-v2.ts` は compatibility candidate、`chat-groq.ts` は legacy direct-provider endpointであり、現clientからは参照されない。

## Sources Compared

1. clean active v3 route と R7-A canonical projection
2. old dirty root の未commit Chat増分（read-only。15-turn、UI、history、sales、analytics 等を含むためsourceとして非採用）
3. R2 Phase5 r8 preservation (`candidate-r8.patch` / manifest)
4. R3 Phase6 Lane C c1 preservation (`count-action-completion.ts` / `count-semantic-turn.ts`)

## r8 Decisions

|Classification|Decision|
|---|---|
|RECOVER_REQUIRED|current-request priority、active constraint、previous-work/actionという意味論をclean専用の決定的Coreとして再実装した。|
|SUPERSEDED_BY_LANE_C|previously named workへの公開action補完はLane Cの狭いcontractを採用した。|
|EXPERIMENT_ONLY|provider structured output、router変更、model tournament前提は採用しない。|
|OBSOLETE|audio claim、machine observation、catalog lineageのcandidate実装はR4/R7-Aの境界と競合するため採用しない。|
|UNKNOWN / deferred|r8 history schema・persistent profile storageはclient/history contractを変えるためR7-Cへdeferする。|

## Lane C Decisions

- `今日は買わない` / `見るだけ` は現在turnのsales CTAのみを抑える。永続opt-outにはしない。
- `商品を勧めないで` 等は、現在conversation内でrecommendationとsalesを抑える。
- 明示的な現在の購入再開は、過去のstopだけを理由に拒否しない。
- `これ聴きたい` / `これ読みたい` は、直近assistantが実在catalog workを名指しし、同mediumのrecorded public linkがある場合だけ返す。別作品を新規選定せず、再生成功・preview提供・内容適合を主張しない。

## Request / Constraint Model

`src/lib/chat-recommendation-core.ts` は直近user requestをcanonical入力とする。過去は、明示されたpersistent stop又は前回提示済み作品へのreferential actionを解決する場合だけ使う。現在の `日本語で` はUI localeより優先する。temporary no-buy、persistent stop、current purchase reopen はsession message列から決定的に導出し、新規storageは作らない。

## Recommendation Contract

原則一作のみ。現在requestのcatalog metadata（title / tags / moodTags / moodSeeds）を照合し、coverとrecorded public actionがあるcatalog workだけcardにする。SSD production notes、`matchInfo`、R4 machine observationsは選定にも理由にも使わない。理由は現在の依頼文と、照合に使ったcatalog metadataを区別して示す。quoted catalog外タイトルは無関係な作品へ置換しない。

## Sales Opt-out

temporary no-buy はCTAのみ抑止し、作品の非商用紹介は可能である。persistent stop はrecommendationも抑止する。どちらも外部profileへ保存しないため、範囲は渡されたconversation message列である。これは永続設定・履歴UIの仕様ではない。

## Catalog Grounding

R7-A の `loadMergedWorksServer` をserver canonical projectionとして使用する。card URLは `getPublicLinksForCard` がrecorded public linkから返したものに限る。titleはdisplay/search aidであってidentity proofではなく、R7-Aのstable ID / explicit alias policyを変更しない。

## Evidence Boundary

R4 claims matrixは `workId` のexact lookupだけ可能である。lookup resultはsemantic score、recommendation reason、response claimへ入らない。したがって、previewの測定記録から全曲理解、lyrics、language、mood、genre、quality、vocal absence、rights、listener fit、recommendation eligibilityを導かない。ambiguityは解消しない。

## FACT / INTERPRETATION / EXPRESSION

- FACT: catalog identity、recorded public action、R4 stable-ID source scope。
- INTERPRETATION: current request、temporary no-buy、persistent stop、current language instruction。
- EXPRESSION: 伯爵の語りは決定的cardの外側でのみ使用し、FACTやaction実行を上書きしない。

## Guardrails

catalog外作品、架空価格・商品・URL・preview、未提供actionの完了表現、R4 scopeを超える音楽claim、過去作品への誤接続、language instruction無視、explicit stop無視を防ぐ。active routeのCTA直列化もCoreのsales guardを通す。

## Validation

- `node --import tsx scripts/validate-r7b-chat-recommendation-core.ts` — PASS, 15 fixtures, provider/network calls 0.
- `node scripts/validate-r4-music-evidence-recovery.mjs` — PASS, R4 boundary retained.
- `node --import tsx scripts/validate-r7a-catalog-foundation.ts` — PASS, 514 merged runtime records and 9 exact R4 bindings.
- `node --import tsx scripts/validate-chat-sales.ts` — PASS, relevant historical offline sales/bridge contract. `pnpm run validate:chat-sales` itself cannot start `tsx` IPC in this sandbox (`listen EPERM`), so the same script was run with the documented Node loader.
- `pnpm exec tsc --project tsconfig.r7b.json --pretty false` — targeted R7-B typecheck PASS during validation. The temporary config was removed afterward.
- root `pnpm exec tsc --noEmit --pretty false` remains blocked by the preserved R3 Lane C artifact's missing candidate-only modules; no R7-B diagnostic was emitted and the artifact was not modified.

## Deferred to R7-C

Chat UI/client contract changes, history/persistent profile schema, 15-turn purchase continuation, Checkout/payment flow, production provider behavior, real Redis, telemetry, deployment, and external user validation.

## Truth Boundary

- recommendation != sale
- interest != purchase intent
- temporary no-buy != permanent opt-out
- evidence != semantic understanding
- editorial != verified fact
- action available != action executed
- synthetic fixture != real user
- local PASS != production parity
- `PRODUCTION_PARITY = UNVERIFIED`
