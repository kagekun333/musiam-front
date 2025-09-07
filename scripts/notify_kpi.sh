#!/usr/bin/env bash
set -Eeuo pipefail

# ===== Debug mode =====
if [[ "${DEBUG_KPI:-}" == "1" ]]; then
  set -x
  trap 'ec=$?; echo "::error file=scripts/notify_kpi.sh,line=${LINENO}::Command failed (exit ${ec})"; exit $ec' ERR
fi

# ===== Required env =====
: "${POSTHOG_API_KEY:?Missing POSTHOG_API_KEY}"
: "${POSTHOG_HOST:?Missing POSTHOG_HOST}"
: "${POSTHOG_PROJECT_ID:?Missing POSTHOG_PROJECT_ID}"
: "${SLACK_WEBHOOK_URL:?Missing SLACK_WEBHOOK_URL}"

WINDOW_HOURS="${KPI_WINDOW_HOURS:-24}"
EVENT_NAME="${KPI_EVENT:-CTA_CLICK}"
PROP_KEY="${KPI_PROP:-cta}"
TOP_N="${KPI_LIMIT:-10}"

echo "::group::Env (safe)"
echo "HOST=${POSTHOG_HOST}"
echo "PROJECT_ID=${POSTHOG_PROJECT_ID}"
echo "WINDOW_HOURS=${WINDOW_HOURS} EVENT=${EVENT_NAME} PROP=${PROP_KEY} TOP_N=${TOP_N}"
echo "::endgroup::"

# ===== HogQL =====
read -r -d '' SQL <<SQL
SELECT properties.${PROP_KEY} AS cta, count() AS clicks
FROM events
WHERE event = '${EVENT_NAME}' AND timestamp >= now() - INTERVAL ${WINDOW_HOURS} HOUR
GROUP BY cta
ORDER BY clicks DESC
SQL

echo "::group::HogQL"; echo "$SQL"; echo "::endgroup::"

BODY=$(jq -nc --arg q "$SQL" '{"query":{"kind":"HogQLQuery","query":$q}}')

# ===== Query =====
HTTP=$(curl -sS -o out.json -w '%{http_code}' -X POST \
  -H "Authorization: Bearer ${POSTHOG_API_KEY}" \
  -H "Content-Type: application/json" \
  "${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query" \
  --data "$BODY")

echo "PostHog HTTP: $HTTP"
if [ "$HTTP" -ne 200 ]; then
  echo "::group::out.json (error body)"; cat out.json; echo; echo "::endgroup::"
  exit 1
fi

echo "JSON type: $(jq -r 'type' out.json)"
echo "::group::out.json head"; head -c 400 out.json | sed 's/[\r\n]/ /g'; echo; echo "::endgroup::"

# ===== Parse robustly =====
rows=$(jq -c '
  if type=="array" then .
  else
    (.results?.results? // .results? // .) // []
  end
' out.json)

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
DASHBOARD_URL_TRIM=$(printf '%s' "${DASHBOARD_URL:-}" | tr -d '\r\n' | awk '{$1=$1;print}')

echo "::group::Preview"; echo "Total: $total"; printf "%s\n" "$lines"; echo "::endgroup::"

# ===== Slack: first try (Block Kit,改行安全) =====
payload=$(jq -nc \
  --arg title "🔎 CTA Clicks — last ${WINDOW_HOURS}h" \
  --arg total "*Total:* ${total}" \
  --arg lines "$lines" \
  --arg when "$now_utc • $now_jst" \
  --arg url "$DASHBOARD_URL_TRIM" '
{
  blocks: (
    [
      {type:"header", text:{type:"plain_text", text:$title}},
      {type:"section", text:{type:"mrkdwn", text:$total}},
      {type:"section", text:{type:"mrkdwn", text:$lines}},
      {type:"context", elements:[{type:"mrkdwn", text:$when}]}
    ] +
    ( ($url|length>0)
      ? [ {type:"actions", elements:[{type:"button", text:{type:"plain_text", text:"Open Dashboard"}, url:$url}] } ]
      : []
    )
  )
}')

# デバッグ表示（シークレットなし）
echo "::group::Slack payload (blocks)"; echo "$payload" | jq .; echo "::endgroup::"

code=$(curl -sS -o slack_out.txt -w '%{http_code}' \
  -X POST -H 'Content-type: application/json' \
  --data "$payload" "$SLACK_WEBHOOK_URL")
echo "Slack code: $code"
echo "::group::Slack response body"; cat slack_out.txt; echo; echo "::endgroup::"

# フォールバック（まれなinvalid_payload対策）
if [ "$code" -ne 200 ]; then
  msg=$'🔎 *CTA Clicks — last '"${WINDOW_HOURS}"$'h*\n'"$lines"$'\n\n'"$now_utc"
  if [ -n "$DASHBOARD_URL_TRIM" ]; then msg+=" <${DASHBOARD_URL_TRIM}|Open Dashboard>"; fi
  payload=$(jq -nc --arg text "$msg" '{text:$text}')
  echo "::group::Slack payload (text)"; echo "$payload" | jq .; echo "::endgroup::"
  code=$(curl -sS -o slack_out.txt -w '%{http_code}' \
    -X POST -H 'Content-type: application/json' \
    --data "$payload" "$SLACK_WEBHOOK_URL")
  echo "Slack code (text): $code"
  echo "::group::Slack response body"; cat slack_out.txt; echo; echo "::endgroup::"
fi

[ "$code" -eq 200 ] || { echo "Slack webhook error"; exit 1; }

# GHAサマリー（任意だが便利）
{
  echo "## CTA Clicks — last ${WINDOW_HOURS}h"
  echo ""
  echo "**Total:** ${total}"
  echo ""
  echo '```'
  printf "%s\n" "$lines"
  echo '```'
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"

echo "Slack posted."
