// src/lib/utm.ts
//
// 交易所(/shop)を「経由」するサイト内導線で、流入元のアトリビューションを失わないためのユーティリティ。
//
// 背景:
//   SEO記事 /office-art/tax-guide・size-guide は
//     記事(?utm_source=tax_guide) → /shop → チャット(?utm_source=shop)
//   という3ホップで法人リードに着地する。/shop のCTAは固定URLのため、
//   最後のホップで utm_source が "shop" に上書きされ、
//   「どの記事から来た法人リードか」が分離できなくなっていた（2026-08-01 日報 参照）。
//
// 方針:
//   - utm_source / utm_medium / utm_campaign / utm_term は「獲得元(first touch)」を優先し、
//     流入元の値をそのまま引き継ぐ。
//   - utm_content は「実際に押されたCTA」を示す欄として base 側(=/shop の restock_notify 等)を維持する。
//     流入元の utm_content は inbound_content として別枠で保持し、情報を捨てない。
//   - 経由地は via= で記録する（例: via=shop）。
//   - 引き継ぐのは同一オリジンの内部パスに付くクエリのみ。リダイレクト先は base 側で固定されており、
//     外部URLに化けることはない。値は英数・ハイフン等に正規化し、長さも制限する。

/** 獲得元として引き継ぐキー（first touch 優先） */
const INHERITED_UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term"] as const;

/** 文脈として引き継ぐ補助キー（base 側に無い場合のみ） */
const CARRY_KEYS = ["space", "work", "gclid", "fbclid", "ref"] as const;

const MAX_VALUE_LENGTH = 64;

/** 計測パラメータとして安全な文字だけを残す（URL汚染・注入の防止） */
function sanitize(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\w.\-:/]+/g, "_").slice(0, MAX_VALUE_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * base の内部リンクに、現在のページに付いている流入元アトリビューションを合成する。
 *
 * @param baseHref       着地先の内部パス（例: "/chat?intent=office-art&utm_source=shop&..."）
 * @param incomingSearch 現在のページのクエリ文字列（例: "?utm_source=tax_guide&..."）
 * @returns 合成後の href。流入元情報が無い場合は baseHref をそのまま返す。
 */
export function withInboundAttribution(
  baseHref: string,
  incomingSearch: string | null | undefined,
): string {
  if (!incomingSearch) return baseHref;

  let incoming: URLSearchParams;
  try {
    incoming = new URLSearchParams(incomingSearch);
  } catch {
    return baseHref;
  }

  // 流入元が特定できない場合は何もしない（base の計測をそのまま使う）
  const inboundSource = sanitize(incoming.get("utm_source"));
  if (!inboundSource) return baseHref;

  const [path, baseSearch = ""] = baseHref.split("?");
  const baseParams = new URLSearchParams(baseSearch);
  const out = new URLSearchParams(baseSearch);

  // 獲得元を優先して上書き
  out.set("utm_source", inboundSource);
  for (const key of INHERITED_UTM_KEYS) {
    if (key === "utm_source") continue;
    const value = sanitize(incoming.get(key));
    if (value) out.set(key, value);
  }

  // 流入元の utm_content は捨てずに別枠へ（base の utm_content = 押されたCTA は維持）
  const inboundContent = sanitize(incoming.get("utm_content"));
  if (inboundContent) out.set("inbound_content", inboundContent);

  // 経由地を記録（base が元々名乗っていた utm_source を via に退避）
  const via = sanitize(baseParams.get("utm_source"));
  if (via && via !== inboundSource) out.set("via", via);

  // 文脈キーは base に無い場合のみ引き継ぐ
  for (const key of CARRY_KEYS) {
    if (out.has(key)) continue;
    const value = sanitize(incoming.get(key));
    if (value) out.set(key, value);
  }

  const query = out.toString();
  return query ? `${path}?${query}` : path;
}
