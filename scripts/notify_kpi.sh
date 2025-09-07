#!/usr/bin/env bash
set -Eeuo pipefail

# ---------- Config (envで上書き可) ----------
: "${POSTHOG_API_KEY:?Missing POSTHOG_API_KEY}"      # Personal API key (query:read)
: "${POSTHOG_HOST:?Missing POSTHOG_HOST}"            # e.g. https://eu.posthog.com
: "${POSTHOG_PROJECT_ID:?Missing POSTHOG_PROJECT_ID}"
: "${SLACK_WEBHOOK_URL:?Missing SLACK_WEBHOOK_URL}"

WINDOW_HOURS="${KPI_WINDOW_HOURS:-24}"               # 集計窓（時間）
EVENT_NAME="${KPI_EVENT:-CTA_CLICK}"                 # イベント名
PROP_KEY="${KPI_PROP:-cta}"                          # 集計に使うpropertiesキー
TOP_N="${KPI_LIMIT:-10}"                             # 上位N件

# ---------- HogQL（可変パラメータ対応） ----------
read -r -d '' SQL <<SQL
SELECT properties.${PROP_KEY} AS cta, count() AS clicks
FROM events
WHERE event = '${EVENT_NAME}' AND timestamp >= now() - INTERVAL ${WINDOW_HOURS} HOUR
GROUP BY cta
ORDER BY clicks DESC
SQL

echo "::group::HogQL"
echo "$SQL"
echo "::endgroup::"

BODY=$(jq -nc --arg q "$SQL" '{"query":{"kind":"HogQLQuery","query":$q}}')

# ---------- PostHog API ----------
HTTP=$(curl -sS -o out.json -w '%{http_code}' -X POST \
  -H "Authorization: Bearer ${POSTHOG_API_KEY}" \
  -H "Content-Type: application/json" \
  "${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query" \
  --data "$BODY")

echo "PostHog HTTP: $HTTP"
[ "$HTTP" -eq 200 ] || { echo "PostHog API error"; echo "::group::out.json"; cat out.json; echo; echo "::endgroup::"; exit 1; }

# ---------- パース（配列/オブジェクト 両対応） ----------
echo "JSON type: $(jq -r 'type' out.json)"
rows=$(jq -c '
  if type=="array" then .
  else
    (.results?.results? // .results? // .) // []
  end
' out.json)

# 整形（object配列 / 配列の配列 どちらも対応）
norm=$(echo "$rows" | jq -c '
  map(
    if type=="object" then
      {cta:(.cta // .properties?.'"$PROP_KEY"' // .properties?.cta // "unknown"),
       clicks:((.clicks // .count // 0)|tonumber)}
    elif (type!="object") and (length>=2) then
      {cta:(.[0] // "unknown"),
       clicks:((.[1] // 0)|tonumber)}
    else empty end
  ) | sort_by(-.clicks)
')

total=$(echo "$norm" | jq '[.[].clicks] | add // 0')
lines=$(echo "$norm" | jq -r '.[:'"$TOP_N"'] | .[] | "- \(.cta): \(.clicks) clicks"')
[ -n "$lines" ] || lines="(no ${EVENT_NAME} in last ${WINDOW_HOURS}h)"

now_utc=$(date -u +"%Y-%m-%d %H:%M UTC")
now_jst=$(TZ=Asia/Tokyo date +"%Y-%m-%d %H:%M JST")

# URLの改行・空白除去（Slackの<>が折れないように）
DASHBOARD_URL_TRIM=$(printf '%s' "${DASHBOARD_URL:-}" | tr -d '\r\n' | awk '{$1=$1;print}')

echo "::group::Preview"
echo "Total: $total"
printf "%s\n" "$lines"
echo "::endgroup::"

# ---------- Slack (Block Kit) ----------
if [ -n "$DASHBOARD_URL_TRIM" ]; then
  payload=$(jq -nc \
    --arg title "🔎 CTA Clicks — last ${WINDOW_HOURS}h" \
    --arg total "*Total:* ${total}" \
    --arg lines "$lines" \
    --arg when "$now_utc • $now_jst" \
    --arg url "$DASHBOARD_URL_TRIM" '
    {
      blocks: [
        {type:"header", text:{type:"plain_text", text:$title}},
        {type:"section", text:{type:"mrkdwn", text:$total}},
        {type:"section", text:{type:"mrkdwn", text:$lines}},
        {type:"context", elements:[{type:"mrkdwn", text:$when}]},
        {type:"actions", elements:[{type:"button", text:{type:"plain_text", text:"Open Dashboard"}, url:$url}]}
      ]
    }')
else
  payload=$(jq -nc \
    --arg title "🔎 CTA Clicks — last ${WINDOW_HOURS}h" \
    --arg total "*Total:* ${total}" \
    --arg lines "$lines" \
    --arg when "$now_utc • $now_jst" '
    {
      blocks: [
        {type:"header", text:{type:"plain_text", text:$title}},
        {type:"section", text:{type:"mrkdwn", text:$total}},
        {type:"section", text:{type:"mrkdwn", text:$lines}},
        {type:"context", elements:[{type:"mrkdwn", text:$when}]}
      ]
    }')
fi

code=$(curl -sS -o slack_out.txt -w '%{http_code}' \
  -X POST -H 'Content-type: application/json' \
  --data "$payload" "$SLACK_WEBHOOK_URL")

echo "Slack code: $code"
if [ "$code" -ne 200 ]; then
  echo "::group::Slack response"
  cat slack_out.txt
  echo; echo "::endgroup::"
  exit 1
fi

echo "Slack posted."
