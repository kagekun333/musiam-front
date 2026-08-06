export type SalesSegment =
  | "boutique-hospitality"
  | "wellness-spa"
  | "design-office"
  | "luxury-residential"
  | "collector-gift";

export type CandidateEvidence = {
  id: string;
  title: string;
  moodTags: string[];
  narrative: string;
  hasLocalCover: boolean;
  previewLongSide: number;
  hasPrintMaster: boolean;
};

export type SalesCandidate = CandidateEvidence & {
  evidenceClass: "CATALOG_HYPOTHESIS";
  score: number;
  segments: SalesSegment[];
  reasons: string[];
  blockers: string[];
};

const segmentSignals: Record<SalesSegment, string[]> = {
  "boutique-hospitality": ["旅", "海", "街", "夜", "光", "home", "town", "ocean", "city", "cinematic"],
  "wellness-spa": ["自然", "静", "水", "空", "瞑想", "nature", "calm", "ambient", "healing", "peace"],
  "design-office": ["未来", "火", "速度", "機械", "始動", "future", "ignition", "tech", "energy", "abstract"],
  "luxury-residential": ["神", "儀式", "黒", "金", "永遠", "deus", "ritual", "sacred", "luxury", "dark"],
  "collector-gift": ["愛", "記憶", "物語", "限定", "夢", "love", "memory", "story", "dream", "rare"],
};

function countSignals(text: string, signals: string[]): number {
  const normalized = text.toLowerCase();
  return signals.filter((signal) => normalized.includes(signal.toLowerCase())).length;
}
export function scoreSalesCandidate(evidence: CandidateEvidence): SalesCandidate {
  const text = `${evidence.title} ${evidence.moodTags.join(" ")} ${evidence.narrative}`;
  const rankedSegments = (Object.entries(segmentSignals) as [SalesSegment, string[]][])
    .map(([segment, signals]) => ({ segment, hits: countSignals(text, signals) }))
    .filter(({ hits }) => hits > 0)
    .sort((a, b) => b.hits - a.hits || a.segment.localeCompare(b.segment));

  const reasons: string[] = [];
  const blockers: string[] = [];
  let score = 0;
  if (evidence.hasLocalCover) { score += 12; reasons.push("local preview exists"); }
  if (evidence.hasPrintMaster) { score += 30; reasons.push("print master is available"); }
  else blockers.push("print master not verified");
  score += Math.min(evidence.moodTags.length, 5) * 4;
  if (evidence.moodTags.length >= 3) reasons.push("multiple mood signals support positioning");
  score += Math.min(Math.floor(evidence.narrative.length / 80), 4) * 4;
  if (evidence.narrative.length >= 160) reasons.push("usable narrative evidence exists");
  const strongestHits = rankedSegments[0]?.hits ?? 0;
  score += Math.min(strongestHits, 4) * 6;
  if (strongestHits > 0) reasons.push(`segment language matched: ${rankedSegments[0].segment}`);
  if (!rankedSegments.length) blockers.push("no segment-language match");

  return {
    ...evidence,
    evidenceClass: "CATALOG_HYPOTHESIS",
    score,
    segments: rankedSegments.slice(0, 2).map(({ segment }) => segment),
    reasons,
    blockers,
  };
}

export type VendorRouteInput = {
  destination: "JP" | "US" | "EU" | "OTHER";
  tier: "GLOBAL_STANDARD" | "COLLECTOR" | "LARGE_CUSTOM";
};

export type VendorRoute = {
  vendor: "gelato" | "prodigi" | "metal-print-japan" | "pictorem";
  status: "QUOTE_REQUIRED" | "PROOF_REQUIRED" | "API_CLARIFICATION_REQUIRED";
};

export function routeVendor(input: VendorRouteInput): VendorRoute {
  if (input.tier === "LARGE_CUSTOM") {
    return { vendor: "pictorem", status: "API_CLARIFICATION_REQUIRED" };
  }
  if (input.tier === "COLLECTOR" && input.destination === "JP") {
    return { vendor: "metal-print-japan", status: "PROOF_REQUIRED" };
  }
  if (input.tier === "COLLECTOR" && input.destination === "US") {
    return { vendor: "prodigi", status: "PROOF_REQUIRED" };
  }
  return { vendor: "gelato", status: "QUOTE_REQUIRED" };
}
