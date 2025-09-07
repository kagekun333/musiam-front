#!/usr/bin/env bash
set -euo pipefail

# --- 必須シークレットの存在チェック ---
: "${POSTHOG_API_KEY:?Missing POSTHOG_API_KEY}"
: "${POSTHOG_HOST:?Missing POSTHOG_HOST}"
: "${POSTHOG_PROJECT_ID:?Missing POSTHOG_PROJECT_ID}"
: "${SLACK_WEBHOOK_URL:?Missing SLACK_WEBHOOK_URL}"

# --- HogQL: 直近24hのCTAクリック集計 ---
SQL=$'SELECT properties.cta AS cta, count() AS clicks
FROM events
WHERE event = \'CTA_CLICK\' AND timestamp >= now() - INTERVAL 1 DAY
GROUP BY cta
ORDER BY clicks DESC'

# --- クエリボディ（jqで安全生成） ---
BODY=$(jq -nc --arg q "$SQL" '{"query":{"kind":"HogQLQuery","query":$q}}')

# --- PostHog API 呼び出し ---
HTTP=$(curl -sS -o out.json -w '%{http_code}' -X POST \
  -H "Authorization: Bearer ${POSTHOG_API_KEY}" \
  -H "Content-Type: application/json" \
  "${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query" \
  --data "$BODY")


echo "PostHog HTTP: $HTTP"
[ "$HTTP" -eq 200 ] || { echo "PostHog API error"; cat out.json; exit 1; }

# --- 結果整形（.results / .results.results 両対応） ---
# 返却JSONのタイプを軽くログ
echo "JSON type: $(jq -r 'type' out.json)"

# 1) まず配列ならそのまま、オブジェクトなら .results / .results.results を拾う
rows=$(jq -c '
  if type=="array" then .
  else
    (.results?.results? // .results? // .) // []
  end
' out.json)

# 2) 表示用テキストに整形（オブジェクト配列 / 配列の配列 どちらも対応）
lines=$(echo "$rows" | jq -r '
  map(
    if type=="object" then
      {cta:(.cta // .properties?.cta // "unknown"),
       clicks:(.clicks // .count // 0)}
    elif (type!="object") and (length>=2) then
      {cta:(.[0] // "unknown"), clicks:(.[1] // 0)}
    else empty end
  )
  | sort_by(-.clicks) | .[:10] | .[]
  | "- \(.cta): \(.clicks) clicks"
')

# 空なら見出しだけにならないようフォールバック
[ -n "$lines" ] || lines="(no CTA clicks in last 24h)"


now_utc=$(date -u +"%Y-%m-%d %H:%M UTC")
[ -n "${DASHBOARD_URL:-}" ] && link=" <${DASHBOARD_URL}|Open Dashboard>" || link=""

msg=$'🔎 *CTA Clicks — last 24h*\n'"$lines"$'\n\n'"$now_utc$link"

# --- Slack Webhook 送信 ---
payload=$(jq -nc --arg text "$msg" '{text:$text}')
code=$(curl -sS -o /dev/null -w '%{http_code}' \
  -X POST -H 'Content-type: application/json' \
  --data "$payload" "$SLACK_WEBHOOK_URL")
[ "$code" -eq 200 ] || { echo "Slack webhook error: $code"; exit 1; }

echo "Slack posted."
