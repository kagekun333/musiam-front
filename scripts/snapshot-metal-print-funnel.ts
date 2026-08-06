type HogQlResponse = { results?: unknown[][]; error?: string };

export {};

const host = process.env.POSTHOG_HOST?.replace(/\/$/, "");
const apiKey = process.env.POSTHOG_API_KEY;
const projectId = process.env.POSTHOG_PROJECT_ID;
const windowDays = Number(process.env.METAL_PRINT_FUNNEL_DAYS ?? "30");

if (!host || !apiKey || !projectId) {
  throw new Error("POSTHOG_HOST, POSTHOG_API_KEY, and POSTHOG_PROJECT_ID are required. Use a personal API key with project query read permission.");
}
const posthogHost = host;
const posthogApiKey = apiKey;
const posthogProjectId = projectId;
if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) throw new Error("METAL_PRINT_FUNNEL_DAYS must be 1..365");

const query = `
SELECT event, uniqExact(coalesce(toString(properties.$session_id), distinct_id)) AS sessions, count() AS events
FROM events
WHERE timestamp >= now() - INTERVAL ${windowDays} DAY
  AND (
    event IN ('metal_dossier_view', 'metal_chat_start', 'salon_interest_bridge_show', 'salon_interest_bridge_accept', 'salon_interest_bridge_decline')
    OR (event IN ('salon_open', 'salon_starter_click') AND properties.sourceIntent = 'metal-print')
    OR (event IN ('salon_duke', 'salon_cta_show', 'salon_cta_click') AND properties.productId = 'vip-metal-print')
  )
GROUP BY event
ORDER BY event
`;

async function main() {
  const response = await fetch(`${posthogHost}/api/projects/${encodeURIComponent(posthogProjectId)}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${posthogApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });
  if (!response.ok) throw new Error(`PostHog query failed: HTTP ${response.status}`);
  const body = await response.json() as HogQlResponse;
  if (body.error) throw new Error(`PostHog query failed: ${body.error}`);

  const metrics = Object.fromEntries((body.results ?? []).map((row) => [String(row[0]), { sessions: Number(row[1]), events: Number(row[2]) }]));
  const dossier = metrics.metal_dossier_view?.sessions ?? 0;
  const chatStarts = metrics.metal_chat_start?.sessions ?? 0;
  const salonOpens = metrics.salon_open?.sessions ?? 0;
  const firstMessages = metrics.salon_starter_click?.sessions ?? 0;
  const duke = metrics.salon_duke?.sessions ?? 0;
  const ctaClicks = metrics.salon_cta_click?.sessions ?? 0;
  const bridgeShows = metrics.salon_interest_bridge_show?.sessions ?? 0;
  const bridgeAccepts = metrics.salon_interest_bridge_accept?.sessions ?? 0;
  const bridgeDeclines = metrics.salon_interest_bridge_decline?.sessions ?? 0;

  console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  evidenceClass: "POSTHOG_OBSERVED",
  windowDays,
  metrics,
  funnel: {
    dossierSessions: dossier,
    chatStartClicks: chatStarts,
    metalSalonOpens: salonOpens,
    firstMessageSessions: firstMessages,
    dukeSessions: duke,
    dossierCtaClickSessions: ctaClicks,
    dossierToChatRate: dossier > 0 ? chatStarts / dossier : null,
    chatOpenToFirstMessageRate: salonOpens > 0 ? firstMessages / salonOpens : null,
    dukeToCtaClickRate: duke > 0 ? ctaClicks / duke : null,
    interestBridgeShows: bridgeShows,
    interestBridgeAccepts: bridgeAccepts,
    interestBridgeDeclines: bridgeDeclines,
    interestBridgeAcceptRate: bridgeShows > 0 ? bridgeAccepts / bridgeShows : null,
    interestBridgeDeclineRate: bridgeShows > 0 ? bridgeDeclines / bridgeShows : null,
  },
  pipelineRule: "Analytics events are behavioral signals only. Qualified pipeline value remains zero until an identified prospect explicitly confirms fit, budget/timing, and next action.",
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "funnel snapshot failed");
  process.exitCode = 1;
});
