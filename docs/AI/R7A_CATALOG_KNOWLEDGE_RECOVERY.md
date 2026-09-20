# R7-A — Catalog / Knowledge Foundation Recovery

`R7A_STATUS = RECOVERED`。これはCatalog / Knowledge基盤のローカル復旧であり、Chat、推薦挙動、UI、Exhibition、Oracle、TodaysPick、販売状態、外部provider、本番へは接続していない。`PRODUCTION_PARITY = UNVERIFIED`。

## Primary Master

`public/works/works.json` は450件の一次masterとして保持した。内容の全文置換は行っていない。SHA-256は `catalog-foundation.manifest.json` に固定し、R7-A validator が変更を明示的に検出する。

`catalog-imports.json` は旧dirtyの `works.json` に直接追加されていた21件を、primary-adjacent importとして分離して復旧した。各cover実体もこの21件のrecorded pathに限って復旧した。これは外部照会やSSD同期ではない。

## Sidecars

|Source|Role|Runtime status|
|---|---|---|
|`works-ssd.json`|`ENRICHMENT_SIDECAR`|既存clean版（216件）を保持。dirty版はmarketing / MV内部記述と全置換を含むため採用しない。|
|`catalog-imports.json`|`PRIMARY_ADJACENT_IMPORT`|21件をmasterの外からIDで統合する。|
|`catalog-readiness.json`|`READINESS`|530件の状態sidecar。evidence・販売・推薦ロジックとは別の記録。|
|`content-evidence.json`|`EVIDENCE`|12件のsource-scoped image description。candidate sourceと分離して保全し、R7-Aでruntime注入しない。|
|`editorial-knowledge.json`|`EDITORIAL`|12件の公式editorial要約。作品意味の自動生成やprovider由来の事実ではない。|
|`drone-exhibition.json`|`CANDIDATE_SOURCE`|12件、`CANDIDATE`のまま。runtime catalogへ昇格しない。|

`continuous-releases.json`、`drone-publication-catalog.json`、`ops/catalog-intelligence/`、旧dirtyの239件SSD dump、marketing campaign / internal video strategyは、巨大生成物・過去snapshot・provider/内部資料であるため復旧しない。

## Runtime Merge

`src/lib/loadMergedWorksServer.ts` がcanonical server projectionである。`works.json` → `catalog-imports.json` → `works-ssd.json` を順にmergeし、stable ID/aliasを介してreadinessを付与する。

client loader、Exhibition loader、Chat / Recommendation、Oracle、TodaysPickはR7-Aで変更していない。client projectionとの最終統合はR7-B以降の判断Gateである。

## Identity Policy

優先順位は次の通り。

1. exact `workId` / `id`
2. explicit `canonicalMasterId`
3. exact full release UUID（`identifiers.release.albumuuid` または `ssd.albumuuid`）
4. recorded store/release ID that is already the exact work ID
5. explicit `catalogAliases`
6. title — display/search aid only; identity proofではない

ISRC、title、似たURL、local filenameは単独でmerge根拠にしない。不明な対応は別recordとして保持する。exact UUID mergeでもprimary側のIDとpublic fieldsを優先し、別IDはaliasとして残す。

## Evidence Boundary

R4 claims matrixはruntimeへ注入していない。安全な接続点は `workId → claims-matrix record` のexact stable-ID relationである。

- 9件の`RUNTIME_BOUND_PUBLIC_TRACK`は現R7-A projectionにexact IDで存在する。
- 1件のlocal full-file candidate（`distro-d9a…`）はruntime catalogへ昇格させない。
- `rava`はunresolvedのまま。
- Spotify/Apple mismatch、PRIMAL SURGE ID差、local/public duration conflict、local candidate、Ravaを含む5件のambiguityを保持する。

evidenceはcontent understanding、recommendation readiness、sellability、rights、需要、revenueの根拠ではない。

## Editorial Boundary

public editorial knowledgeとsource-scoped evidenceを、SSD内のMV構想・shorts strategy・promotion notesから分離した。R7-Aは説明文を生成・書換えしていない。validatorはpublic knowledge sidecarsに内部戦略の代表文字列が混入していないことを確認する。

## Readiness States

`cataloged`、`structured`、`semantic metadata present`、`evidence present`、`public link recorded`、`recommendationReady`、`market proven`、`sellable`は別状態である。`catalog-readiness.json` はidentity conflictとrecommendation関連のbooleanを記録するだけで、R4 evidenceやsales stateから自動昇格しない。

## Recovered Files

- Application: `src/lib/mergeWorksCatalog.ts`, `src/lib/loadMergedWorksServer.ts`
- Data: `catalog-imports.json`, `catalog-readiness.json`, `content-evidence.json`, `editorial-knowledge.json`, `drone-exhibition.json`, 21 recorded import covers, `catalog-foundation.manifest.json`
- Validation: `scripts/validate-r7a-catalog-foundation.ts`

## Deferred Files

Chat/Recommendation runtime, client integration, UI, Exhibition, Oracle, TodaysPick, continuous release ingest, catalog-intelligence operation, provider data, raw SSD content and all deploy/push actions are deferred.

## R7-B Handoff

R7-B may consume the canonical server projection only after it separately decides the Chat / Recommendation Core contract. It must not treat titles as identity, R4 evidence as semantic understanding, or `recommendationReady` as sales authority. Client projection parity and any user-visible behavior are explicitly deferred.

## Truth Boundary

- title != identity
- cataloged != recommendation ready
- evidence != content understanding
- recommendation ready != sellable
- historical snapshot != current runtime
- internal notes != public description
- inferred metadata != verified fact
- local validation != production parity
- `PRODUCTION_PARITY = UNVERIFIED`
