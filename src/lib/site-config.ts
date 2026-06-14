// src/lib/site-config.ts
// CTA・連絡先の一元設定。LINE公式/メールフォーム導入時はここだけ差し替える。
// (AGENTS.md 方針: 導線の飛ばし先を分散させない)

export const SITE_CONFIG = {
  /** 問い合わせ先 (将来: フォームURL or LINE URL に差し替え) */
  contactEmail: "abihakusyaku@gmail.com",
  /** LINE公式アカウントURL (未開設: null のままなら mailto にフォールバック) */
  lineUrl: null as string | null,
  /** X(Twitter) アカウントURL (任意) */
  xUrl: null as string | null,
  /** シェア時のハッシュタグ */
  shareHashtags: ["伯爵MUSIAM"],
  /** 寄進(投げ銭) Stripe Payment Link (null = ボタン非表示) */
  donationUrl: null as string | null,
} as const;

/** 問い合わせリンク (LINE優先、なければmailto) */
export function contactHref(subject?: string): string {
  if (SITE_CONFIG.lineUrl) return SITE_CONFIG.lineUrl;
  const s = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${SITE_CONFIG.contactEmail}${s}`;
}

/** X シェア intent URL */
export function xShareHref(text: string, url: string): string {
  const p = new URLSearchParams({
    text,
    url,
    hashtags: SITE_CONFIG.shareHashtags.join(","),
  });
  return `https://twitter.com/intent/tweet?${p.toString()}`;
}
