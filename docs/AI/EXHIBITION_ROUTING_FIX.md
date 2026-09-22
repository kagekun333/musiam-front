# Exhibition Routing Fix

## Root cause

`EXHIBITION_ROUTING_DIAGNOSIS = ROOT_CAUSE_CONFIRMED`。2026-06-14 commit
`abdf7af` 由来の historical redirect `/exhibition -> /works` が、R7-D1 で
復旧済みの canonical Exhibition UI より先に適用されていた。この旧 Gallery 統合
artifact は Recovery 方針において `SUPERSEDED_ROUTING_ARTIFACT` と扱う。

## Local fix

`next.config.js` から `/exhibition -> /works` の redirect block だけを削除した。
他の redirect、rewrite、Next.js config、および application source は変更していない。

`EXHIBITION_ROUTE_AUTHORITY = src/pages/exhibition.tsx`

Application/config files changed: `1` (`next.config.js`)。

## Validation boundary

R7-D1 validator は PASS（20 fixtures、Exhibition 514、missing 0）、Final Integration
validator は PASS（45 checks）、current applicable RC Assembly validator は PASS（29 checks）。
root typecheck と `next.config.js` targeted lint も PASS。`git diff --check` は PASS を
確認する。local build は既知の `BLOCKED_BY_FONT_DNS` のため再実行しない。

`PREVIEW_REDEPLOY_REQUIRED = true`

Preview rebuild で routing config を最終確認する。production mutation、provider、payment、
data operation、deploy、push はすべて `0`。
