// src/lib/dedupeWorks.ts
// 作品カタログの重複を「表示層」で畳むためのヘルパー。
// 背景: master データには同一Spotifyリリースが 2エントリ（spotify-single-<id> と <slug>-NN）
// で重複登録されており（94件）、SSDマージでさらに増える。データ本体は変更せず、
// 一覧・件数の表示時にユニーク化することで、全ページの作品数(350=楽曲216+書籍134、2026-05時点)と整合させる。
//
// 重複キー: 記録済みのSpotifyアルバム/トラックIDだけを使用する。表示タイトルは
// 人が見つけるための情報であり、identity proof ではないため重複判定に使わない。
// 残す代表: slug系ID（spotify-single- / ssd- で始まらないID）を優先し、無ければ既存を維持。

type AnyWork = {
  id?: string | number | null;
  title?: string;
  type?: string;
  links?: unknown;
  href?: string;
  primaryHref?: string;
  [k: string]: unknown;
};

function extractSpotifyId(w: AnyWork): string | null {
  const blob =
    (typeof w.links === "string" ? w.links : JSON.stringify(w.links ?? "")) +
    " " +
    String(w.href ?? "") +
    " " +
    String(w.primaryHref ?? "");
  const m = blob.match(/open\.spotify\.com\/(?:album|track)\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

function dedupeKey(w: AnyWork): string {
  const sid = extractSpotifyId(w);
  // A work with no recorded provider identity keeps its canonical work ID.
  // This preserves distinct same-title records instead of inferring a merge.
  return sid ? `sp:${sid}` : `id:${String(w.id ?? "")}`;
}

function isSlugId(id: string): boolean {
  return !!id && !id.startsWith("spotify-single-") && !id.startsWith("ssd-");
}

/** 同一作品（同一の記録済みSpotify ID）のみを畳んで1件にする。表示順は維持。 */
export function dedupeWorks<T extends AnyWork>(works: T[]): T[] {
  const byKey = new Map<string, T>();
  const order: string[] = [];
  for (const w of works) {
    if (w.id == null || !w.title) continue;
    const key = dedupeKey(w);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, w);
      order.push(key);
      continue;
    }
    // 代表の差し替え: slug系IDを優先
    if (!isSlugId(String(existing.id)) && isSlugId(String(w.id))) {
      byKey.set(key, w);
    }
  }
  return order.map((k) => byKey.get(k)!);
}
