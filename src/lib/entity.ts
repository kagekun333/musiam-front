// src/lib/entity.ts
// ─────────────────────────────────────────────────────────────
// AI認知の単一実体定義 (Single Source of Truth)
// ABI伯爵 / 伯爵MUSIAM を1つのエンティティとして束ね、検索・生成AI双方に
// 機械可読な形で提示するための中核データ。表記揺れを防ぐためここで固定する。
//
// 【sameAs の埋め方】下の SAME_AS に実在する公開プロフィールURLを入れるだけ。
// 空文字("")のエントリは自動的に出力から除外される。URLが増えたらここに足す。
// ─────────────────────────────────────────────────────────────
import { siteUrl } from "@/lib/site-url";
import { SITE_CONFIG } from "@/lib/site-config";

/** 実在する公開プロフィール/配信先のURL。空欄は出力時に自動除外。 */
export const SAME_AS: string[] = [
  // --- 確認でき次第ここに実URLを貼る (空のままなら出力されない) ---
  "", // YouTube チャンネル        例: https://www.youtube.com/@abihakusyaku
  "", // X (Twitter)              例: https://x.com/xxxx
  "", // Spotify アーティストページ 例: https://open.spotify.com/artist/xxxx
  "", // Instagram                例: https://www.instagram.com/xxxx
  "", // note                     例: https://note.com/xxxx
  "", // TikTok                   例: https://www.tiktok.com/@xxxx
].filter((u) => u.trim().length > 0);

/** エンティティの基本属性。表記はすべてここを正とする。 */
export const ENTITY = {
  /** 主表記 (芸名・屋号) */
  personName: "ABI伯爵",
  /** 別名 (本名・英字・ブランド名) — 名寄せを助ける */
  personAlternateNames: ["Kagemichi Abiko", "ABI Count", "あびはくしゃく"],
  /** 肩書き */
  jobTitle: "音楽家・作家 / AIクリエイター",
  /** 組織 (館・事業体) の名称 */
  orgName: "伯爵 MUSIAM",
  orgAlternateNames: ["伯爵MUSIAM", "Hakusyaku MUSIAM"],
  /** 連絡先 */
  email: SITE_CONFIG.contactEmail,
  /** 一行説明 */
  description:
    "ABI伯爵(本名: Kagemichi Abiko)が館主を務める、350の作品でできた一つの国「伯爵MUSIAM」。AI制作パイプラインで楽曲・書籍を量産し、350作品(楽曲216・書籍134)を公開している音楽家・作家。歩けば発見があり、常にどこかで一曲が流れ、その中心では伯爵とAIが世界を鍛え続けている。",
} as const;

/** ロゴ/肖像の絶対URL (OG画像を流用) */
function brandImage(): string {
  return `${siteUrl()}/brand/og-default.jpg`;
}

/** Organization JSON-LD (事業体 = 伯爵MUSIAM) */
export function organizationJsonLd() {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: ENTITY.orgName,
    alternateName: ENTITY.orgAlternateNames,
    url: base,
    logo: brandImage(),
    image: brandImage(),
    email: ENTITY.email,
    description: ENTITY.description,
    founder: { "@id": `${base}/about#person` },
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
  };
}

/** WebSite JSON-LD (サイト本体) */
export function webSiteJsonLd() {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: ENTITY.orgName,
    alternateName: ENTITY.orgAlternateNames,
    url: base,
    inLanguage: "ja",
    publisher: { "@id": `${base}/#organization` },
  };
}

/** Person JSON-LD (人物 = ABI伯爵) */
export function personJsonLd() {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${base}/about#person`,
    name: ENTITY.personName,
    alternateName: ENTITY.personAlternateNames,
    jobTitle: ENTITY.jobTitle,
    description: ENTITY.description,
    image: brandImage(),
    email: ENTITY.email,
    url: `${base}/about`,
    worksFor: { "@id": `${base}/#organization` },
    mainEntityOfPage: `${base}/about`,
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
  };
}
