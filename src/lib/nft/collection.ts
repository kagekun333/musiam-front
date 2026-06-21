// src/lib/nft/collection.ts
// NFTショーケース（F5）の世界観・ロードマップ設定。
// 【境界・厳守】発行(mint)・出品・暗号資産/金銭のやり取りは実装しない（規約上の禁止）。
//   本ファイル＆ショーケースは「世界観・作品提示・メタデータ草案・外部マーケットへの導線」のみ。
//   ウォレット接続・mint・出品・販売はオーナー（ユーザー）が外部で行う。
//
// マーケットURLは未確定のため null（=「準備中」表示）。オーナーがコレクション作成後にURLを入れる。

export const NFT_MARKETPLACE_URL: string | null = null; // 例: "https://opensea.io/collection/<slug>"（出品はユーザー）

export const NFT_COLLECTION = {
  name: "伯爵MUSIAM — 国の意匠（Sigils of the Realm）",
  symbol: "MUSIAM",
  tagline: "国の紋章と地図を、所有できるかたちに。",
  description:
    "伯爵MUSIAMという一つの国の意匠——各地方の名所（代表作）の原画、紋章、アトラスの地図を、" +
    "限定のデジタル・コレクションとして刻む。所有は鑑賞の証であり、国の年代記への記名でもある。" +
    "音源・物理プリントとは別系統の、視覚の宝物庫。",
  // 外部リンク（OpenStandard: OpenSea collection metadata 互換のキー名）
  externalUrl: "https://www.hakusyaku.xyz/showcase",
  // ロイヤリティ等の金銭条件はオーナーがマーケット側で設定（ここには書かない）。
} as const;

export type RoadmapPhase = { phase: string; title: string; body: string; status: "done" | "now" | "next" };

export const NFT_ROADMAP: RoadmapPhase[] = [
  {
    phase: "I",
    title: "ショーケース公開",
    body: "コレクションの世界観と原画を本ページで提示。導線とメタデータ草案を整える（現在地）。",
    status: "now",
  },
  {
    phase: "II",
    title: "原画の確定とメタデータ整備",
    body: "各地方の名所からトークン原画を選定し、ERC-721準拠メタデータを確定。画像をIPFS等へ。",
    status: "next",
  },
  {
    phase: "III",
    title: "発行・出品（オーナー操作）",
    body: "オーナーがウォレットでmint・マーケット出品。本サイトは導線のみを更新（mintは行わない）。",
    status: "next",
  },
  {
    phase: "IV",
    title: "所有者特典と国の年代記",
    body: "所有者に限定音源・先行案内・記名などの特典を検討。世界観と実利を接続する。",
    status: "next",
  },
];

export type ShowcaseLike = {
  id?: string | number;
  title?: string;
  cover?: string;
  type?: string;
};

/** ショーケース用の原画候補（カバーありを優先・重複排除）。 */
export function pickShowcase<T extends ShowcaseLike>(items: T[], limit = 12): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const w of items) {
    const cover = String(w.cover || "").trim();
    const id = String(w.id ?? "");
    if (!cover || !id || seen.has(id)) continue;
    seen.add(id);
    out.push(w);
    if (out.length >= limit) break;
  }
  return out;
}
