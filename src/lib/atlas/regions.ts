// src/lib/atlas/regions.ts
// アトラス（F2）: 作品の moodTags/tags から「地方(region)」を自動生成するタクソノミ。
// 設計方針:
//  - 地方の“定義”（名前・記号・キーワード）は宮廷トーンで curate。
//  - 作品→地方の“割当”はタグ駆動。新作はタグに従い自動で正しい地方に出現＝コード改修不要。
//  - 各作品はちょうど1つの地方に属す（優先順で最初に一致した地方）。感情テーマ→ジャンルの順で評価。
//  - メタデータの無い作品は「未踏の辺境」へ（新しく着いた、まだ描かれぬ土地）。
// 占い・オカルトは国是から排し、「創造」と「探索」を掲げる（戦略§1）。

export type RegionAccent = "amber" | "slate";

export type RegionDef = {
  id: string;
  ja: string; // 地方名（章題＝Sovereign層）
  en: string;
  glyph: string; // 記号アイコン（カートグラフィ）
  blurb: string; // 一行ロア
  accent: RegionAccent; // 人=琥珀 / 精=灰青
  book?: boolean; // 書籍の地方
  keywords: string[]; // moodTags/tags/title への部分一致
};

// 優先順（上から評価し、最初に一致した地方に属す）。
export const ATLAS_REGIONS: RegionDef[] = [
  {
    id: "library",
    ja: "物語の書架",
    en: "Archive of Tales",
    glyph: "▤",
    blurb: "綴じられた言葉が眠る、回廊の奥の書庫。",
    accent: "amber",
    book: true,
    keywords: [],
  },
  {
    id: "shrine",
    ja: "神々の社",
    en: "Shrine of the Myriad",
    glyph: "✶",
    blurb: "祈りと宇宙が交わる、荘厳の高み。",
    accent: "amber",
    keywords: ["神秘", "神聖", "儀式", "ceremonial", "汎神論", "神々", "祈", "聖", "宇宙", "荘厳", "神話", "覚醒", "spiritual", "sacred", "ritual"],
  },
  {
    id: "alley",
    ja: "追憶の路地",
    en: "Alley of Remembrance",
    glyph: "❧",
    blurb: "雨に濡れた石畳、ひとり佇む夜の街。",
    accent: "slate",
    keywords: ["孤独", "哀愁", "切なさ", "切ない", "ノスタルジー", "夜更け", "追憶", "退廃", "雨", "憂", "憂鬱", "別れ", "片想い", "喪失", "涙", "残響", "黄昏", "薄暮", "夜", "lonely", "melancholy"],
  },
  {
    id: "dawn",
    ja: "払暁の岸",
    en: "Shore of Daybreak",
    glyph: "☼",
    blurb: "静けさが満ちる、朝の光のほとり。",
    accent: "slate",
    keywords: ["静けさ", "静寂", "癒し", "癒", "朝の光", "安らぎ", "瞑想", "凪", "慈", "希望", "光", "genre:ニューエイジ", "ambient", "healing", "calm"],
  },
  {
    id: "coast",
    ja: "巡礼の海岸",
    en: "Pilgrim Coast",
    glyph: "≈",
    blurb: "潮風と土俗の調べが渡る、遥かな浜。",
    accent: "amber",
    keywords: ["旅心", "海辺", "海", "潮", "自然", "風", "巡礼", "tribal", "ラテン", "genre:ワールド", "genre:レゲエ", "genre:アフロビート", "genre:ラテン", "world", "ethnic"],
  },
  {
    id: "reverie",
    ja: "陶酔の樹海",
    en: "Forest of Reverie",
    glyph: "◓",
    blurb: "反復が意識を溶かす、忘我の深い森。",
    accent: "slate",
    keywords: ["トランス", "陶酔", "忘我", "催眠", "genre:トランス", "genre:ダブステップ", "genre:エレクトロニカ", "genre:ダウンテンポ", "ダブステップ", "psychedelic"],
  },
  {
    id: "highland",
    ja: "祝祭の高地",
    en: "Festival Highlands",
    glyph: "▲",
    blurb: "篝火と鼓動が空へ昇る、歓喜の頂。",
    accent: "amber",
    keywords: ["祝祭", "高揚", "解放", "歓喜", "陽気", "祭", "踊", "アドレナリン", "不屈", "genre:ダンス", "genre:ハウス", "genre:テクノ", "genre:ファンク", "genre:ディスコ", "dance", "festival"],
  },
  {
    id: "citadel",
    ja: "緊迫の城砦",
    en: "Citadel of Tension",
    glyph: "◈",
    blurb: "張り詰めた弦と鋼、対峙の城壁。",
    accent: "slate",
    keywords: ["緊張", "緊迫", "cinematic", "鋼", "戦", "闘", "genre:ロック", "genre:オルタナティブ", "genre:ハードコア", "genre:ヒップホップ／ラップ", "ヒップホップ", "genre:メタル", "tension"],
  },
  {
    id: "market",
    ja: "陽だまりの市井",
    en: "Sunlit Quarter",
    glyph: "◆",
    blurb: "日々の機微が交わる、人いきれの街区。",
    accent: "amber",
    keywords: ["genre:j-pop", "genre:ポップ", "genre:k-pop", "青春", "恋", "日常", "街", "都会", "散歩", "genre:r&b／ソウル", "r&b", "genre:ジャズ", "genre:ビッグ・バンド", "ビッグバンド", "genre:チルドレン・ミュージック", "pop"],
  },
];

// 既定地方（未分類＝まだ描かれぬ土地）。
export const FRONTIER_REGION: RegionDef = {
  id: "frontier",
  ja: "未踏の辺境",
  en: "Uncharted Frontier",
  glyph: "◇",
  blurb: "地図にまだ無い、ひらかれたばかりの土地。",
  accent: "slate",
  keywords: [],
};

export type AtlasWork = {
  id?: string | number;
  title?: string;
  type?: string;
  cover?: string;
  tags?: string[];
  moodTags?: string[];
  releasedAt?: string;
  href?: string;
  primaryHref?: string;
  links?: Record<string, unknown> | unknown;
};

function isBook(w: AtlasWork): boolean {
  const t = String(w.type || "").toLowerCase();
  return t.includes("book") || (Array.isArray(w.tags) && w.tags.includes("English Edition"));
}

function blobOf(w: AtlasWork): string {
  return [...(w.moodTags || []), ...(w.tags || []), String(w.title || "")].join(" ").toLowerCase();
}

/** 作品が属す地方IDを返す（優先順で最初の一致／書籍は library／未分類は frontier）。 */
export function assignRegionId(w: AtlasWork): string {
  if (isBook(w)) return "library";
  const blob = blobOf(w);
  for (const r of ATLAS_REGIONS) {
    if (r.book) continue;
    if (r.keywords.some((k) => blob.includes(k.toLowerCase()))) return r.id;
  }
  return FRONTIER_REGION.id;
}

export function regionDefById(id: string): RegionDef {
  return ATLAS_REGIONS.find((r) => r.id === id) || FRONTIER_REGION;
}

export type AtlasLandmark = { id: string; title: string; cover: string; href: string };
export type RegionSummary = RegionDef & {
  count: number;
  landmark: AtlasLandmark | null; // 名所＝代表作
  newest: AtlasLandmark | null; // 最近ひらかれた土地＝最新作
  sample: AtlasLandmark[]; // 巡る入口（数件）
};

function streamingRichness(w: AtlasWork): number {
  const l = (w.links && typeof w.links === "object" && !Array.isArray(w.links) ? w.links : {}) as Record<string, unknown>;
  let n = 0;
  if (l.spotify || /open\.spotify\.com/.test(String(w.href || ""))) n++;
  if (l.appleMusic) n++;
  if (l.amazonMusic) n++;
  return n;
}

function toLandmark(w: AtlasWork, hrefResolver: (w: AtlasWork) => string): AtlasLandmark | null {
  const id = String(w.id ?? "").trim();
  const title = String(w.title ?? "").trim();
  const cover = String(w.cover ?? "").trim();
  const href = hrefResolver(w);
  if (!id || !title || !cover) return null;
  return { id, title, cover, href };
}

/**
 * 作品配列から地方サマリ（非空のみ）を構築する。
 * hrefResolver は「聴く/読む」先の一次リンクを返す関数（work-links を注入）。
 * landmark = カバーありの中で配信が最も充実、同点なら最も古い（国を支える名所）。
 * newest   = releasedAt が最新（最近ひらかれた土地）。
 */
export function buildAtlas(
  works: AtlasWork[],
  hrefResolver: (w: AtlasWork) => string
): RegionSummary[] {
  const buckets = new Map<string, AtlasWork[]>();
  for (const w of works) {
    if (w.id == null || !w.title) continue;
    const rid = assignRegionId(w);
    if (!buckets.has(rid)) buckets.set(rid, []);
    buckets.get(rid)!.push(w);
  }

  const order = [...ATLAS_REGIONS, FRONTIER_REGION];
  const out: RegionSummary[] = [];

  for (const def of order) {
    const items = buckets.get(def.id) || [];
    if (!items.length) continue;

    const withCover = items.filter((w) => String(w.cover || "").trim());

    const landmarkSrc = [...withCover].sort((a, b) => {
      const dr = streamingRichness(b) - streamingRichness(a);
      if (dr !== 0) return dr;
      const da = String(a.releasedAt || "9999");
      const db = String(b.releasedAt || "9999");
      if (da !== db) return da.localeCompare(db); // 古い＝由緒ある名所
      return String(a.id).localeCompare(String(b.id));
    })[0];

    const newestSrc = [...withCover].sort((a, b) =>
      String(b.releasedAt || "").localeCompare(String(a.releasedAt || ""))
    )[0];

    const sample = withCover
      .filter((w) => w !== landmarkSrc)
      .sort((a, b) => String(b.releasedAt || "").localeCompare(String(a.releasedAt || "")))
      .slice(0, 6)
      .map((w) => toLandmark(w, hrefResolver))
      .filter((x): x is AtlasLandmark => x !== null);

    out.push({
      ...def,
      count: items.length,
      landmark: landmarkSrc ? toLandmark(landmarkSrc, hrefResolver) : null,
      newest: newestSrc ? toLandmark(newestSrc, hrefResolver) : null,
      sample,
    });
  }

  return out;
}
