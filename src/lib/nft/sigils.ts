// src/lib/nft/sigils.ts
// 「国の意匠（Sigils of the Realm）」= 地図の各地の紋章を収集対象にするNFTコレクション定義。
// 地図そのものをコレクション目録にする（世界観中心のユーティリティ）。
// 【境界】mint・出品・暗号資産のやり取りは実装しない（オーナーが行う）。素材・ページ・導線まで。
import { ATLAS_REGIONS, FRONTIER_REGION } from "@/lib/atlas/regions";

export type Sigil = {
  id: string;
  ja: string;
  en: string;
  glyph: string;
  accent: "amber" | "slate";
  blurb: string;
};

export function getSigils(): Sigil[] {
  return [...ATLAS_REGIONS, FRONTIER_REGION].map((r) => ({
    id: r.id,
    ja: r.ja,
    en: r.en,
    glyph: r.glyph,
    accent: r.accent,
    blurb: r.blurb,
  }));
}

export const SIGIL_COLLECTION = {
  name: "国の意匠 — Sigils of the Realm",
  tagline: "地図の各地を、ひとつずつ所有する。",
  description:
    "伯爵MUSIAMの地図は、ただの絵ではない。各地の意匠（紋章）はこの国の一部であり、所有はその地の守護者となる証。" +
    "地図がそのままコレクションの目録になる——歩いた土地を、手元に。",
} as const;

// 所有の意味（世界観中心）。実利の前に「国の一部を持つ」体験を軸に置く。
export const SIGIL_UTILITY: { title: string; body: string }[] = [
  { title: "地図原画の所有", body: "その地の意匠の高解像度原画を、所有者に。羊皮紙の一片を手元に。" },
  { title: "年代記への記名", body: "伯爵の書簡（年代記）に、その地の守護者として名を刻む。" },
  { title: "新作の先行案内", body: "その地に新しい作品（土地）がひらかれた時、所有者へ先に報せる。" },
  { title: "地図上の称号", body: "地図上にその地の守護者の印が灯る（実装予定）。" },
];
