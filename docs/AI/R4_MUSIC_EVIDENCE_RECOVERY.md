# R4 — Music Evidence Recovery

`R4_STATUS = RECOVERED_EVIDENCE_BOUNDARY`。これは音楽内容の理解、販売可否、推薦可否、又は本番反映を意味しない。`PRODUCTION_PARITY = UNVERIFIED`。

## Evidence Lineage

Phase 5の初期batch（usable 6 / missing 4）は履歴として残すがcanonicalではない。ID gate・reconciliationを経た `batch-r3` が、`TEN_UNIQUELY_RUNTIME_BOUND_MEASURED_SOURCES`、`eligibleActualSoundRecords = 10`、`missingOrUnbound = 0` を記録する最終batchである。R3のポインタはPhase 6の `music/source-audit.json` と `music/public-preview-actions.json` をSHA-256で固定し、いずれも本Recovery copyと一致する。

## Canonical Batch / Identity / Audio Scope

canonicalは `ops/simulation-refinement/phase5-generalization-20260913/music/batch-r3/`。10件のworkIdは一意にruntimeへ束縛され、10件のsource SHA-256も一意である。9件は約30秒のpublic preview、1件（Latin Exorcism Club）は233.8秒のlocal full-file candidateである。後者は公開master又は公開full-trackとの同一性を意味しない。

## Public Preview / Local Candidates

Phase 6の最終manifestは、9件すべてを `VERIFIED_PUBLIC_METADATA` とする historical observation（2026-09-13）である。URLの現時点の可用性は未確認であり、確認もしない。local full candidateはLatin Exorcism Clubの1件と、地球レビュー星1.8の1件が記録される。地球レビュー星1.8はpublic 150.226秒に対しlocal candidate 191.28秒であり、`UNRESOLVED_DURATION_CONFLICT` / `LOCAL_FULL_IDENTITY_UNVERIFIED` を保持する。Ravaはstable identity未確定のまま `UNRESOLVED`。

## Machine Evidence / ASR Boundary

10 source recordsにはsource-scoped machine observationがある。値の本体はcanonical manifestに保存し、この文書には複製しない。ASR compact summaryは10 recordsで、2件だけがguardrail内のtext activityを記録するが、歌詞本文は保存しない。ASRは約30秒sourceに限定され、言語・歌詞・vocal presence/absence・全曲内容を立証しない。

## Ambiguities

Spotify-keyed runtime workとApple/iTunes preview metadataの対応、PRIMAL SURGEのPhase 5/6 workId表記差、地球レビュー星1.8のduration conflict、Ravaのunbound stateを保持した。タイトル類似、local filename、又はpreview URLだけで統合しない。

## Allowed Claims

R7へ渡す契約は `batch-r3/claims-matrix.json` である。許されるのはstable identity、source type、SHA-256-bound sourceが指定scopeで測定されたこと、historical public metadata availability、及び明示的なambiguityだけである。

## Prohibited Claims

stable ID は内容理解ではない。preview はfull trackではない。machine feature はmood・genre・lyrics・quality・language・no vocals・listener fit・rightsの根拠ではない。ASR snippetは正確な歌詞又は全曲言語ではない。local candidateはpublic identityではない。historical URLは現在availabilityではない。evidenceはrecommendation eligibility又はsales readinessではない。full-track verified countは推測してはならず、ここでは0である。local PASSはproduction parityではない。

## Recovered Artifacts

復元対象はcanonical batch-r3 manifest / machine summary / runtime binding / recovery source / hash record、batch-r3 config、factory hash record、Phase 5 reconciliation、compact ASR summary、Phase 6 source audit とfinal public-preview manifests、factory source、claims matrix、及びこのboundary文書である。raw audio、downloaded preview media、private WAV/MP3、PCM、temporary ASR output、provider/network dumps、model responses、cache、重複intermediate batchは復元していない。

## R7 Handoff / Truth Boundary

R7はruntime接続をまだ行わない。Chatがこの契約から言えるのはsource-scoped factのみであり、「全部聴いた」「歌詞は」「ボーカルはない」「この曲は○○な気分」といった内容・意味・適合の断定を生成してはならない。`PRODUCTION_PARITY = UNVERIFIED`。
