# R7-C1 — Chat UI / History / Card Wiring Recovery

`R7C1_STATUS = RECOVERED`。R7-Bのactive responseを、browser Chat、匿名履歴、作品カード、記録済みactionへ限定して接続した。R7-B Core、catalog foundation、Stripe/Checkout、payment、digital delivery、Metal Print、Exhibition、Oracle、TodaysPickは変更していない。provider/network callは0。`PRODUCTION_PARITY = UNVERIFIED`。

## Active UI

- **ACTIVE**: `src/pages/chat.tsx`。browser entry、`/api/chat-experience-v3` request、`/api/chat-history` read/write/delete、UUID conversation ID、card/action/CTA表示を担当する。
- **ACTIVE UI contract adapter**: `src/lib/chat-ui-contract.ts`。response/historyの表示可能値だけを正規化する。
- **ACTIVE history backend**: `src/pages/api/chat-history.ts` → `src/lib/chat-history.server.ts`。Upstash Redisが未設定なら503であり、保存成功とは扱わない。
- **LEGACY**: `src/pages/api/chat-reco.ts`、`src/pages/api/chat-groq.ts`。active clientから参照されない。
- **COMPATIBILITY**: `src/pages/api/chat-reco-v2.ts`。active clientから参照されない。
- **CANDIDATE (old dirty root, read-only)**: 2026-09-10以後のcards/choices、15-turn、payment/access、sales telemetryの増分。payment/accessや複数の未復旧依存を含むためwhole-file copyは不採用。

旧dirtyとの差分はhunk単位で分類した。`cards` / `choices`の**明示responseのみ**を表示できる互換処理は `UI_ONLY`、active `card`/CTA/history/stale wiringは `RECOVER_REQUIRED`、15-turn/500円/access/checkout/entitlement/resumeは `PAYMENT_DEFERRED_TO_C2`、candidate専用依存・sales拡張は `LEGACY` または `OBSOLETE` とした。R7-B Core routeの変更は0。

## API Contract

requestは既存の `lang`、`timeTone`、`messages`、必要時の `entryContext` だけを送る。session ID、history、attributionをv3 request bodyへ推測で追加していない。

active v3 responseの表示対象は `assistantText`、`persona`、singular `card`、`cta`、`intent`、`productId`、`interestBridge` である。adapterは将来または既存compatibility responseが**明示的に**返す `cards` と `choices` だけを読み、Coreが一作返したときにUI側で三作へ増やさない。

## History Contract

history APIは UUID `conversationId`、language、最大40件の user/assistant message（content最大2,000文字、任意persona）を保存し、TTLは90日である。clientはlocalStorageの `musiam_chat_conversation_id_v1` から同一browserのUUIDを再利用する。保存値はUI adapterで再検証し、array順序を保持して復元する。

clientは保存を直列化する。削除は未完了writeの後にqueueされるので、過去writeがdelete後に履歴を復活させない。履歴削除/記憶停止はhistoryだけを対象にし、access entitlementやcost counterの代替ではない。

## Session Identity

匿名session identityはclient-generated UUIDであり、ログインID、支払者ID、purchase entitlementではない。invalid localStorage値は新UUIDに置換する。history restore中と初期opening中はinputを無効化する。

## Card Contract

R7-B wire field `card.id` をR7-A stable catalog identityとしてUI内部の `workId` に保持する。cardは `workId`、`title`、`cover`、`type`、Coreが返した `reason`、recorded `links` だけを描画する。titleによる再検索、mood/genreの追加推測、cardにない作品詳細URLの生成はしない。unknown/incomplete cardは安全に非表示となる。

## Action Contract

actionはcard responseに供給された `open` / `listen` / `buy` / `read` link、またはCore supplied CTAだけである。relative same-site URLかHTTPS URL以外は表示しない。click telemetryは `workId` とaction kindだけを記録し、表示・clickableであることを再生/閲覧/購入の完了として扱わない。

## Sales CTA Boundary

CTAはactive Coreが返したときだけ表示する。UIから固定購入CTA、価格、Checkout linkを追加していない。R7-Bのtemporary/persistent sales suppressionをUIが上書きしない。

## Race / Stale Protection

- ref guardでdouble sendを拒否する。
- request IDをopening、send、retry、unmountで更新し、遅いresponseをdiscardする。
- history restore/route unmount後のresponseはgeneration guardでdiscardする。
- identical final assistant replyはappendしない。
- retryは失敗済みrequest message列を再利用し、user messageを二重appendしない。

## Validation

- `node --import tsx scripts/validate-r7c1-chat-ui-history.ts` — PASS, 22 fixtures, provider/network 0。
- `pnpm exec tsc --project tsconfig.r7c1.json --pretty false` — PASS using a temporary, deleted targeted config.
- `pnpm exec eslint src/pages/chat.tsx src/lib/chat-ui-contract.ts --max-warnings=0` — PASS (ESLint emitted its pre-existing `.eslintignore` migration notice only).
- root `pnpm exec tsc --noEmit --pretty false` — existing R3 Lane C preserved candidate references are missing; R7-C1 file errors were not present. This does not establish root typecheck PASS.

## Paid Continuation Audit

Clean active v3 has a `HARD_MAX_USER_TURNS = 20`, but no recovered 15-turn counter, atomic enforcement, product definition, 500円 price source, checkout route, payment verification, entitlement/credit, resume logic, or delivery artifact for chat renewal.

The old dirty root contains a **candidate** `count-access.server.ts` with a Redis-backed 15-turn reservation/credit concept and 2026-09-10 notes stating that the 500円 product, payment, delivery, and chat resume were incomplete. It is not present in this clean recovery branch and was not copied. History deletion is therefore neither evaluated as nor allowed to become an access-control bypass in R7-C1.

## Deferred to R7-C2

|Area|Status|Evidence / required next gate|
|---|---|---|
|free-turn counter|MISSING in clean active route|old candidate only; decide policy and server location|
|enforcement|MISSING in clean active route|must be atomic and independent of history|
|history relationship|IMPLEMENTED for anonymous persistence only|must remain separate from entitlement|
|product definition / price source|MISSING|old 500円 note is candidate, not an offer|
|checkout route / payment verification|NOT_CONNECTED|no chat-renewal route or verification is wired|
|entitlement / credit|MISSING|candidate concept not adopted|
|resume logic / delivery artifact|MISSING|no paid renewal may be represented as complete|

## Truth Boundary

- displayed action != executed action
- history != access entitlement
- recommendation card != purchase intent
- link available != link clicked
- payment candidate != paid access
- test state != real payment
- local PASS != production parity
- `PRODUCTION_PARITY = UNVERIFIED`
