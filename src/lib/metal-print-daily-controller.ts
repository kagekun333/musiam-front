import measurementPolicy from "./metal-print-measurement-policy.json";

type MetricMap = Record<string, { sessions: number }>;

type FunnelPlacement = {
  campaign: string;
  locale: "ja" | "en" | "unknown";
  source: string;
  content: string;
  metrics: Record<string, number>;
};

type PipelinePlacement = {
  qualified: number;
  nurture: number;
  pipelineValueJpy: number;
};

export type MetalPrintPlacementPerformance = {
  observedPlacements: number;
  bestObserved: null | {
    campaign: string;
    locale: "ja" | "en" | "unknown";
    source: string;
    content: string;
    dossier: number;
    consultations: number;
    qualified: number;
    qualifiedPerDossier: number | null;
  };
  allocationCandidate: null | { campaign: string; source: string; content: string; qualified: number; dossier: number; qualifiedPerDossier: number };
  stopCandidates: Array<{ campaign: string; source: string; content: string; reason: "NO_CHAT_AFTER_500_DOSSIERS" | "NO_CONSULTATION_AFTER_50_SELECTIONS" }>;
  evidenceBoundary: string;
};

export type MetalPrintDailyDecision = {
  status: "FIX_ALERTING" | "FIX_PROFILE_INGRESS" | "NO_TRAFFIC" | "OWNED_TRAFFIC_LEARNING" | "FIX_HOME_CTA" | "FIX_LANDING" | "FIX_STARTER" | "FIX_SELECTION" | "FIX_CONSULTATION" | "BEHIND_QUALIFIED_PACE" | "ON_PACE";
  action: string;
  expectedQualifiedToDate: number;
  rates: Record<string, number | null>;
};

export type MetalPrintProfileIngress = {
  activePlatforms: string[];
  verifiedGeneralChatLinks: string[];
  gaps: string[];
  passed: boolean;
  evidenceBoundary: string;
};

type ChatInterestThemeMetrics = Record<string, {
  chat_interest_bridge_show?: number;
  chat_interest_bridge_accept?: number;
  chat_interest_bridge_decline?: number;
}>;

export type ChatInterestDiagnosis = {
  status: "NO_SAMPLE" | "LEARNING" | "REVISE_PERMISSION_BRIDGE" | "MAINTAIN" | "SCALE_PROVEN_THEMES";
  action: string;
  shows: number;
  accepts: number;
  declines: number;
  acceptRate: number | null;
  provenThemes: Array<{ theme: string; shows: number; accepts: number; acceptRate: number }>;
  weakThemes: Array<{ theme: string; shows: number; accepts: number; acceptRate: number }>;
  evidenceBoundary: string;
};

const rate = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : null;

export function diagnoseChatInterest(input: { metrics?: MetricMap; byTheme?: ChatInterestThemeMetrics }): ChatInterestDiagnosis {
  const shows = Number(input.metrics?.chat_interest_bridge_show?.sessions ?? 0);
  const accepts = Number(input.metrics?.chat_interest_bridge_accept?.sessions ?? 0);
  const declines = Number(input.metrics?.chat_interest_bridge_decline?.sessions ?? 0);
  const acceptRate = rate(accepts, shows);
  const rows = Object.entries(input.byTheme ?? {}).map(([theme, values]) => {
    const themeShows = Number(values.chat_interest_bridge_show ?? 0);
    const themeAccepts = Number(values.chat_interest_bridge_accept ?? 0);
    return { theme, shows: themeShows, accepts: themeAccepts, acceptRate: themeShows > 0 ? themeAccepts / themeShows : 0 };
  });
  const provenThemes = rows.filter((row) => row.shows >= 20 && row.acceptRate >= 0.25).sort((a, b) => b.acceptRate - a.acceptRate || b.shows - a.shows);
  const weakThemes = rows.filter((row) => row.shows >= 20 && row.acceptRate < 0.1).sort((a, b) => a.acceptRate - b.acceptRate || b.shows - a.shows);
  const common = { shows, accepts, declines, acceptRate, provenThemes, weakThemes, evidenceBoundary: "Do not optimize before 50 total shows or classify a theme before 20 shows. Acceptance indicates voluntary work interest, not purchase intent, qualification or revenue." };
  if (shows === 0) return { status: "NO_SAMPLE", action: "承認済み集客を継続し、最初の実訪問者による雑談関心bridge表示を取得する。", ...common };
  if (shows < 50) return { status: "LEARNING", action: `文面を変更せず50表示まで学習する（現在${shows}/50）。テーマ別判断は各20表示から。`, ...common };
  if ((acceptRate ?? 0) < 0.1) return { status: "REVISE_PERMISSION_BRIDGE", action: "実表示50件以上で承諾率10%未満。許可質問の価値説明を一変数だけ改訂し、次の50表示と比較する。", ...common };
  if (provenThemes.length > 0) return { status: "SCALE_PROVEN_THEMES", action: `承諾率25%以上の実証テーマを維持・優先する: ${provenThemes.map((item) => item.theme).join(", ")}。弱いテーマは一変数だけ改訂する。`, ...common };
  return { status: "MAINTAIN", action: "全体承諾率は最低基準を通過。各テーマ20表示までは現行文面を維持する。", ...common };
}

export function summarizeMetalPrintProfileIngress(accounts: Array<{ platform: string; profileSetup?: { website?: string } }>): MetalPrintProfileIngress {
  const activePlatforms = ["instagram", "threads", "tiktok", "youtube"];
  const verifiedGeneralChatLinks = activePlatforms.filter((platform) =>
    accounts.find((account) => account.platform === platform)?.profileSetup?.website === "APPLIED_AND_PUBLICLY_VISIBLE",
  );
  const gaps = activePlatforms.filter((platform) => !verifiedGeneralChatLinks.includes(platform));
  return {
    activePlatforms,
    verifiedGeneralChatLinks,
    gaps,
    passed: gaps.length === 0,
    evidenceBoundary: "A site-side Chat activation PASS is not a social-profile-link PASS. Each active platform requires a publicly verified general 伯爵Chat link; X is excluded while suspended.",
  };
}

export function summarizeMetalPrintPlacementPerformance(
  funnel: Record<string, FunnelPlacement>,
  pipeline: Record<string, PipelinePlacement>,
): MetalPrintPlacementPerformance {
  const rows = Object.entries(funnel).map(([key, placement]) => {
    const dossier = Number(placement.metrics.metal_dossier_view ?? 0);
    const chat = Number(placement.metrics.metal_chat_start ?? 0);
    const selected = Number(placement.metrics.metal_edition_selected ?? 0);
    const consultations = Number(placement.metrics.metal_consultation_submitted ?? 0);
    const qualified = Number(pipeline[key]?.qualified ?? 0);
    return { ...placement, dossier, chat, selected, consultations, qualified, qualifiedPerDossier: rate(qualified, dossier) };
  }).sort((a, b) => b.qualified - a.qualified || b.consultations - a.consultations || b.dossier - a.dossier || a.content.localeCompare(b.content));
  const best = rows[0];
  const allocation = rows.filter((row) => row.dossier >= measurementPolicy.allocation.dossierSessionsPerPlacementMin && row.qualified >= measurementPolicy.allocation.qualifiedPerPlacementMin && row.qualifiedPerDossier !== null)
    .sort((a, b) => (b.qualifiedPerDossier ?? 0) - (a.qualifiedPerDossier ?? 0) || b.qualified - a.qualified)[0];
  const stopCandidates = rows.flatMap((row) => {
    const reason = row.dossier >= 500 && row.chat === 0
      ? "NO_CHAT_AFTER_500_DOSSIERS" as const
      : row.selected >= 50 && row.consultations === 0
        ? "NO_CONSULTATION_AFTER_50_SELECTIONS" as const
        : null;
    return reason ? [{ campaign: row.campaign, source: row.source, content: row.content, reason }] : [];
  }).slice(0, 5);
  return {
    observedPlacements: rows.length,
    bestObserved: best ? {
      campaign: best.campaign, locale: best.locale, source: best.source, content: best.content,
      dossier: best.dossier, consultations: best.consultations, qualified: best.qualified, qualifiedPerDossier: best.qualifiedPerDossier,
    } : null,
    allocationCandidate: allocation ? {
      campaign: allocation.campaign, source: allocation.source, content: allocation.content,
      qualified: allocation.qualified, dossier: allocation.dossier, qualifiedPerDossier: allocation.qualifiedPerDossier!,
    } : null,
    stopCandidates,
    evidenceBoundary: "Allocation requires at least 100 Dossier sessions and 3 durable qualified consultations per placement; otherwise bestObserved is descriptive only.",
  };
}

export function decideMetalPrintDailyAction(input: { metrics: MetricMap; qualified: number; dayOfSprint: number; sprintDays: number; consultationNotificationFailures?: number; hasAllocationCandidate?: boolean; profileIngress?: MetalPrintProfileIngress; profileIngressDeferred?: boolean }): MetalPrintDailyDecision {
  const value = (event: string) => Number(input.metrics[event]?.sessions ?? 0);
  const homeViews = value("metal_home_view");
  const homeClicks = value("metal_home_cta_click");
  const dossier = value("metal_dossier_view");
  const chat = value("metal_chat_start");
  const salon = value("metal_salon_open");
  const first = value("metal_first_message");
  const duke = value("metal_duke");
  const selected = value("metal_edition_selected");
  const consultations = value("metal_consultation_submitted");
  const rates = {
    homeToMetalClick: rate(homeClicks, homeViews),
    dossierToChat: rate(chat, dossier),
    salonToFirstMessage: rate(first, salon),
    firstMessageToDuke: rate(duke, first),
    selectionToConsultation: rate(consultations, selected),
  };
  const expectedQualifiedToDate = input.dayOfSprint > 0 ? Math.ceil(100 * Math.min(input.dayOfSprint, input.sprintDays) / input.sprintDays) : 0;
  if ((input.consultationNotificationFailures ?? 0) > 0) return { status: "FIX_ALERTING", action: "相談は保存済み。通知失敗を復旧し、未通知相談をRedis台帳から確認する。", expectedQualifiedToDate, rates };
  if (input.profileIngress && !input.profileIngress.passed && !input.profileIngressDeferred) return {
    status: "FIX_PROFILE_INGRESS",
    action: `承認済みLaunch Waveは継続しつつ、プロフィール更新Human Gateで伯爵Chat直接リンクを修正する: ${input.profileIngress.gaps.join(", ")}。未確認リンクを流入実績として数えない。`,
    expectedQualifiedToDate,
    rates,
  };
  if (dossier === 0 && salon === 0 && homeViews === 0) return { status: "NO_TRAFFIC", action: "承認済み配信パックを公開し、最初の実顧客Dossier sessionを獲得する。", expectedQualifiedToDate, rates };
  const diagnosis = measurementPolicy.conversionDiagnosis;
  if (homeViews >= diagnosis.homeViewsMin && (rates.homeToMetalClick ?? 0) < diagnosis.homeToMetalClickRateMin) return { status: "FIX_HOME_CTA", action: "流入を増やさず、ホームのCollector導線だけを一変数修正する。", expectedQualifiedToDate, rates };
  if (dossier === 0 && salon === 0) return { status: "OWNED_TRAFFIC_LEARNING", action: "ホーム1,000 sessionまではCTAを変更せず、外部配信と所有メディアの実測を蓄積する。", expectedQualifiedToDate, rates };
  if (dossier >= diagnosis.dossierSessionsMin && (rates.dossierToChat ?? 0) < diagnosis.dossierToChatRateMin) return { status: "FIX_LANDING", action: "流入を増やさず、Landing hookとChat CTAだけを修正する。", expectedQualifiedToDate, rates };
  if (salon >= diagnosis.salonSessionsMin && (rates.salonToFirstMessage ?? 0) < diagnosis.salonToFirstMessageRateMin) return { status: "FIX_STARTER", action: "Chat starterと最初の説明だけを修正する。", expectedQualifiedToDate, rates };
  if (first >= diagnosis.firstMessagesMin && (rates.firstMessageToDuke ?? 0) < diagnosis.firstMessageToDukeRateMin) return { status: "FIX_SELECTION", action: "公爵診断と一点選択だけを修正する。", expectedQualifiedToDate, rates };
  if (selected >= diagnosis.editionSelectionsMin && (rates.selectionToConsultation ?? 0) < diagnosis.selectionToConsultationRateMin) return { status: "FIX_CONSULTATION", action: "qualificationを弱めず、反論処理と相談フォームの説明だけを修正する。", expectedQualifiedToDate, rates };
  if (input.qualified < expectedQualifiedToDate) return {
    status: "BEHIND_QUALIFIED_PACE",
    action: input.hasAllocationCandidate
      ? "統計条件を満たした最良campaignへ配信を集中し、日次3.4 qualifiedまで流入量を増やす。"
      : "勝ち配置は未証明。承認済み配信を予定どおり継続し、配置ごとに100 Dossierかつ3 qualifiedへ到達するまで集中配信しない。",
    expectedQualifiedToDate,
    rates,
  };
  return { status: "ON_PACE", action: "現在の勝ちcampaignを維持し、次の成熟cohort判定まで一変数だけ検証する。", expectedQualifiedToDate, rates };
}
