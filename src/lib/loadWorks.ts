// src/lib/loadWorks.ts
export type Work = {
  // 必須フィールド
  id: string;
  title: string;
  type: "music" | "book" | "art" | "video" | "article";
  cover: string;               // e.g. "/gates/torii.jpg"
  tags: string[];
  releasedAt: string;          // ISO date

  // オプション（既存）
  summary?: string;
  weight?: number;             // 0.1–1.5 (default 1.0)
  previewUrl?: string;         // short media/thumbnail
  og?: string;                 // share text

  // リンク系（既存 + 拡張）
  links?: {
    listen?: string;
    watch?: string;
    read?: string;
    nft?: string;
    spotify?: string;          // 🆕 Spotify リンク
    appleMusic?: string;       // 🆕 Apple Music リンク
    itunesBuy?: string;        // 🆕 iTunes 購入リンク
  };
  href?: string;               // 🆕 メインリンク

  // 正規化リンク（補完後）
  primaryHref?: string;        // 🆕 優先リンク（再生/閲覧用）
  salesHref?: string;          // 🆕 購入リンク

  // ムード/レコメンド系
  moodTags?: string[];         // 🆕 手動ムードタグ
  moodTagsInferred?: string[]; // 🆕 推論ムードタグ
  moodSeeds?: string[];        // 🆕 ムードシード
  moodMeta?: {                 // 🆕 ムードメタ情報
    source?: string;
    confidence?: number;
    needsReview?: boolean;
  };

  // マッチング情報
  matchInfo?: {
    status?: string;
    confidence?: number;
    query?: string;
    chosen?: any;
    candidatesTop3?: any[];
  };

  // 安定キー（重複ID対策）
  stableKey?: string;          // 🆕 UI/レコメンド用の一意キー
};

// 後方互換のため、配列形式も許容（型は内部で使用）
type _WorksFile = { items: Work[] } | Work[];

const PUBLIC_PATH = "/works/works.json";

/**
 * 作品データの正規化とフォールバック補完
 * - primaryHref: links.listen → href → links.spotify の順で補完
 * - salesHref: links.itunesBuy で補完
 * - stableKey: ID重複時に index 付与
 */
function normalizeWork(raw: any, index: number, isDuplicate: boolean): Work {
  const id = String(raw?.id ?? `work_${index}`);
  const title = String(raw?.title ?? "Untitled");
  const type = (raw?.type ?? "article") as Work["type"];
  const cover = String(raw?.cover ?? "");
  const tags = Array.isArray(raw?.tags) ? raw.tags : [];
  const releasedAt = String(raw?.releasedAt ?? "");

  // リンク正規化
  const links = raw?.links ?? {};
  const href = raw?.href;

  // primaryHref: 再生/閲覧用の優先リンク
  const primaryHref =
    raw?.primaryHref ??
    links?.listen ??
    href ??
    links?.spotify ??
    links?.appleMusic ??
    undefined;

  // salesHref: 購入用リンク
  const salesHref = raw?.salesHref ?? links?.itunesBuy ?? undefined;

  // stableKey: 重複ID対策
  const stableKey = isDuplicate ? `${id}__${index}` : id;

  return {
    // 必須
    id,
    title,
    type,
    cover,
    tags,
    releasedAt,
    stableKey,

    // オプション（既存）
    summary: raw?.summary,
    weight: raw?.weight,
    previewUrl: raw?.previewUrl,
    og: raw?.og,

    // リンク系
    links: {
      listen: links?.listen,
      watch: links?.watch,
      read: links?.read,
      nft: links?.nft,
      spotify: links?.spotify,
      appleMusic: links?.appleMusic,
      itunesBuy: links?.itunesBuy,
    },
    href,

    // 正規化リンク
    primaryHref,
    salesHref,

    // ムード系
    moodTags: raw?.moodTags,
    moodTagsInferred: raw?.moodTagsInferred,
    moodSeeds: raw?.moodSeeds,
    moodMeta: raw?.moodMeta,

    // マッチング情報
    matchInfo: raw?.matchInfo,
  };
}

/**
 * ID重複を検出して console.warn
 */
function detectDuplicateIds(items: any[]): Set<string> {
  const seen = new Map<string, number>();
  const duplicates = new Set<string>();

  items.forEach((item, idx) => {
    const id = String(item?.id ?? `work_${idx}`);
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.set(id, (seen.get(id) ?? 0) + 1);
  });

  if (duplicates.size > 0) {
    console.warn(
      `[loadWorks] Found ${duplicates.size} duplicate ID(s):`,
      Array.from(duplicates).join(", ")
    );
  }

  return duplicates;
}

/** Server/Client両対応で /public/works/works.json を読み込む */
export async function loadWorks(): Promise<Work[]> {
  let data: any;

  // ブラウザ（Client）
  if (typeof window !== "undefined") {
    const res = await fetch(PUBLIC_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${PUBLIC_PATH}`);
    data = await res.json();
  } else {
    // サーバ（SSR/Node）
    const fs = await import("fs/promises");
    const path = await import("path");
    const file = await fs.readFile(
      path.join(process.cwd(), "public", "works", "works.json"),
      "utf8"
    );
    data = JSON.parse(file);
  }

  // 配列形式の後方互換
  const rawItems: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : [];

  // ID重複検出
  const duplicateIds = detectDuplicateIds(rawItems);

  // 正規化 + stableKey 付与
  return rawItems.map((raw, idx) =>
    normalizeWork(raw, idx, duplicateIds.has(String(raw?.id)))
  );
}
